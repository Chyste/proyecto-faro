"""Adaptive dialogue engine: walks the approved tree one persona turn at a time.

Safety order on every persona turn: (1) deterministic regex urgent route, (2) human-contact request,
(3) respect rules (refusal / "no sé"), (4) per-turn classification (Jev or offline keywords).
No assistant text is ever generated: utterances come from ``dialogue_tree.TREE``.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Callable, Protocol

from .dialogue_tree import ACKS, ACKS_BY_DIMENSION, INTENTS, OFF_TOPIC, Node, Tree
from .extractor_jev import (GATE_Q, INTENT_Q, RELEVANCE_MIN, JevClient, JevError, ObservationDraft, build_request, catalog_by_code, map_response,
                            urgent_flags, validate_response)
from .pipeline import process_after_dialogue
from .rules import DIM_OF
from .urgent import detect_urgent_messages, normalize, run_urgent

MAX_QUESTIONS = 12
PENDING_STATES = ("pendiente_confirmar", "no_comprendido")
AYUDA = "necesita_ayuda_inmediata"
URGENT_EVENT = {"lesion_reportada": "caida_con_lesion", "sintoma_agudo_protocolo": "sintoma_agudo", AYUDA: AYUDA}
DIALOGUE_PROMPT_VERSION = "jev-dialogue-v1"

HUMAN = re.compile(r"(?:quiero|prefiero|necesito|puedo|me gustaria) hablar con (?:una |un )?(?:persona|alguien|humano)"
                   r"|hablar con una persona|persona de verdad|pasame con (?:una )?persona")
REFUSAL = re.compile(r"prefiero no (?:responder|contestar|hablar)|no quiero (?:responder|contestar|hablar de eso)"
                     r"|no deseo (?:responder|contestar)")
REFUSAL_SHORT = re.compile(r"^\W*paso\W*$|^\W*prefiero no\W*$")
NO_SABE = re.compile(r"\bno se(?=\s*[,.;!?]|\s*$)|\bno lo se\b|\bnose\b|no recuerdo|no me acuerdo|no tengo idea"
                     r"|\bni idea\b|\bquien sabe\b")
INTENT_PATTERNS = (
    ("pregunta_hora", re.compile(r"\bque hora(?:s)? (?:es|son|tiene)\b|\bme (?:dice|da|puede decir|sabe decir) la hora\b"
                                 r"|\bhora es\b")),
    ("pregunta_quien_es", re.compile(r"\bquien (?:eres|habla|llama)\b|\bquien es (?:usted|ud)\b|\bcon quien hablo\b"
                                     r"|\bquien me (?:habla|llama)\b|\bde donde (?:me )?llam|\bpor que me llama"
                                     r"|\bque es esto\b")),
    ("pide_repetir", re.compile(r"\bno (?:le )?(?:escuche|entendi|oi)\b|\brepet(?:ir|ime)\b|\brepit(?:a|e|ame)\b|\bde nuevo\b"
                                r"|^\W*(?:que|como|perdon|disculpe|mande|eh)\W*$|\bno entiendo la pregunta\b")),
    ("no_entiende", re.compile(r"\bno (?:le |te )?entiendo\b")),
)
YES = re.compile(r"\b(?:si|claro|bueno|ya|ok|okey|por supuesto|dale|aja|soy yo|yo mismo|yo misma|con ella|con el)\b"
                 r"|^(?:ella|yo)\b|no hay problema|no tengo problema|no me molesta")
NO = re.compile(r"^(?:no|nop|nunca)\b|no soy|no es (?:ella|el)\b|equivocad|se equivoc")


@dataclass(frozen=True)
class TurnClassification:
    draft: ObservationDraft
    flags: tuple = ()
    latency_ms: int = 0
    raw: dict | None = None
    relevance: float | None = None  # Noul responde_pregunta; None when the classifier has no gate
    intent: str | None = None       # set when relevance < RELEVANCE_MIN


@dataclass(frozen=True)
class TurnResult:
    utterances: list
    done: bool
    urgent: bool
    classification: TurnClassification | None = None
    off_topic: bool = False
    intent: str | None = None
    ack: str | None = None  # acknowledgment already included at the start of utterances[0]


class Classifier(Protocol):
    def classify(self, node: Node, conversation: list[dict], answer_text: str) -> TurnClassification: ...


def parse_yes_no(text: str) -> bool | None:
    n = normalize(text).strip()
    if re.search(r"no hay problema|no tengo problema|no me molesta", n):
        return True
    if NO.search(n):
        return False
    return True if YES.search(n) else None


def detect_intent(norm: str) -> str | None:
    """Deterministic off-topic intents on normalized text (no Jev needed): hora, quién es, repetir, no entiende."""
    return next((name for name, pat in INTENT_PATTERNS if pat.search(norm)), None)


def dont_know_state(norm: str) -> str | None:
    if REFUSAL.search(norm) or REFUSAL_SHORT.search(norm):
        return "prefiere_no_responder"
    return "no_sabe" if NO_SABE.search(norm) else None


def valence(code: str, kind: str, value) -> str:
    """positive | concerning | neutral for an informed answer (used only to pick an acknowledgment pool)."""
    bad_when_yes = {"menor_contacto_habitual", "dificultad_puntual_reportada", "caida_reportada", "lesion_reportada",
                    "confusion_nueva_reportada", "necesita_ayuda_inmediata"}
    if kind == "bool":
        yes = bool(value)
        if code in bad_when_yes:
            return "concerning" if yes else "positive"
        return "positive" if yes else "concerning"
    if kind == "category":
        good = {"no", "mejora", "completa", "bien"}
        bad = {"frecuente", "a_veces", "empeora", "parcial", "ninguna", "mal", "persistente"}
        if code == "tristeza_reportada" and value == "ocasional":
            return "neutral"
        return "positive" if value in good else ("concerning" if value in bad else "neutral")
    return "neutral"


def answer_class(draft: ObservationDraft | None, kind: str) -> str | None:
    if draft is None or draft.state != "informado":
        return None
    if kind == "category":
        return draft.value_text
    if kind == "bool":
        return "si" if draft.value_num else "no"
    return "lista" if json.loads(draft.value_text or "[]") else "vacia"


# --- Classifiers -----------------------------------------------------------------------------------
def _pending(code: str, text: str, detail: str, conf: float | None = None) -> ObservationDraft:
    return ObservationDraft(code, "pendiente_confirmar", None, None, text, conf, detail)


class JevTurnClassifier:
    """One Jev request per persona turn, a single indicator, short context (last turns + the answer)."""

    def __init__(self, client: JevClient, context_turns: int = 5):
        self.client, self.context_turns = client, context_turns
        self.model_name = client.model

    def classify(self, node: Node, conversation: list[dict], answer_text: str) -> TurnClassification:
        code = node.indicator_code
        msgs = list(conversation[-self.context_turns:]) + [{"role": "persona", "question_code": None, "text": answer_text}]
        req = build_request(msgs, [code], catalog_by_code(), self.client.model, gate=True)
        t0 = time.perf_counter()
        try:
            resp = self.client.extract(req["state"], req["questions"])
        except JevError as e:
            ms = int((time.perf_counter() - t0) * 1000)
            return TurnClassification(_pending(code, answer_text, f"jev_error: {e}"), (), ms, {"error": str(e)})
        ms = int((time.perf_counter() - t0) * 1000)
        valid = validate_response(resp, [code], gate=True)
        if valid:
            p = float(resp["answers"][GATE_Q]["noul"])
            if p < RELEVANCE_MIN:
                intent = resp["answers"][INTENT_Q]["choice"]
                return TurnClassification(_pending(code, answer_text, f"fuera_de_tema p={p:.2f}", None), (), ms, resp,
                                          p, intent if intent in INTENTS else "otro_tema")
        drafts = map_response(resp, [code], msgs) if valid else []
        draft = next((d for d in drafts if d.indicator_code == code), None) or _pending(code, answer_text, "respuesta inválida")
        relevance = float(resp["answers"][GATE_Q]["noul"]) if valid else None
        return TurnClassification(replace(draft, evidence_quote=answer_text), tuple(urgent_flags(resp)), ms, resp,
                                  relevance)


def _has(n: str, *pats: str) -> bool:
    return any(re.search(p, n) for p in pats)


class KeywordFakeClassifier:
    """Deterministic offline Spanish keyword heuristics (tests and --offline demos). No network."""

    model_name = "fake-keyword"

    def classify(self, node: Node, conversation: list[dict], answer_text: str) -> TurnClassification:
        code, n = node.indicator_code, normalize(answer_text).strip()
        kind = node.kind
        intent = detect_intent(n)
        if intent:  # same relevance gate as Jev: off-topic -> no value
            return TurnClassification(_pending(code, answer_text, f"fuera_de_tema {intent}"), (), 0, {"keyword": True},
                                      0.0, intent)
        value = self._value(code, kind, n)
        if value is None:
            d = _pending(code, answer_text, "sin coincidencia", 0.3)
        elif kind == "bool":
            d = ObservationDraft(code, "informado", 1.0 if value else 0.0, None, answer_text, 0.9, "keyword")
        elif kind == "list":
            d = ObservationDraft(code, "informado", None, json.dumps(value), answer_text, 0.9, "keyword")
        else:
            d = ObservationDraft(code, "informado", None, value, answer_text, 0.9, "keyword")
        return TurnClassification(d, (), 0, {"keyword": True})

    @staticmethod
    def _yes_no(n: str) -> bool | None:
        if re.search(r"^(?:no|nunca|nadie|nada|ninguno|ninguna)\b", n):
            return False
        return True if re.search(r"\b(?:si|claro|por supuesto|efectivamente|me cai|necesito|me duele)\b", n) else None

    def _value(self, code: str, kind: str, n: str):
        if kind == "bool":
            return self._yes_no(n)
        if code == "soledad_percibida":
            if _has(n, r"frecuen", r"siempre", r"a menudo", r"todos los dias", r"muy sol"):
                return "frecuente"
            if _has(n, r"a veces", r"de vez en cuando", r"ocasion", r"un poco", r"a ratos"):
                return "a_veces"
            return "no" if _has(n, r"^(?:no|nunca)\b") else None
        if code == "cambio_autonomia":
            if _has(n, r"peor", r"mas dificil", r"cuesta mas", r"empeor", r"mas dificultad"):
                return "empeora"
            if _has(n, r"mejor", r"mejora"):
                return "mejora"
            return "sin_cambio" if _has(n, r"igual", r"sin cambio", r"lo mismo", r"como siempre") else None
        if code == "adherencia_reportada":
            if _has(n, r"ninguno", r"ninguna", r"no (?:los )?tome", r"nada"):
                return "ninguna"
            if _has(n, r"algunos", r"a medias", r"solo uno", r"me falto", r"parcial", r"olvide uno"):
                return "parcial"
            return "completa" if _has(n, r"\bsi\b", r"todos", r"complet") else None
        if code == "animo_reportado":
            if _has(n, r"mas o menos", r"regular", r"asi asi", r"no muy bien", r"no tan bien"):
                return "regular"
            if _has(n, r"\bmal\b", r"triste", r"bajon", r"decaid"):
                return "mal"
            return "bien" if _has(n, r"\bbien\b", r"tranquil", r"content") else None
        if code == "tristeza_reportada":
            if _has(n, r"todo el tiempo", r"siempre", r"casi todo", r"todos los dias", r"persistente"):
                return "persistente"
            if _has(n, r"a veces", r"de vez en cuando", r"ocasion", r"un poco"):
                return "ocasional"
            return "no" if _has(n, r"^(?:no|nunca)\b") else None
        if code == "barrera_tratamiento":
            found = [k for k, pats in {"olvido": (r"olvid",), "acceso": (r"conseguir", r"no tengo", r"no alcanz", r"farmacia", r"acab"),
                                       "molestia_reportada": (r"molest", r"nausea", r"me cae", r"me hace mal"),
                                       "otra": (r"\botra\b",)}.items() if _has(n, *pats)]
            return found or ([] if _has(n, r"^(?:no|ninguna)\b") else None)
        if code == "actividad_afectada":
            found = [k for k, pats in {"desplazarse": (r"camin", r"desplaz", r"moverme", r"escalera"),
                                       "asearse": (r"ducha", r"banar", r"asear"), "vestirse": (r"vestir",),
                                       "alimentarse": (r"comer", r"alimentar"), "comprar": (r"compra", r"feria", r"super"),
                                       "preparar_alimentos": (r"cocin", r"preparar"), "otra": (r"\botra\b",)}.items()
                     if _has(n, *pats)]
            return found or ([] if _has(n, r"^(?:no|ninguna)\b") else None)
        return None


# --- Session ---------------------------------------------------------------------------------------
class DialogueSession:
    def __init__(self, person, tree: Tree, classifier: Classifier, clock: Callable[[], datetime], conn=None,
                 channel: str = "simulado"):
        self.person, self.tree, self.classifier, self.clock = person, tree, classifier, clock
        self.conn, self.channel = conn, channel
        self.name = person["preferred_name"]
        self.done = self.urgent = self.human_requested = False
        self.speaker_confirmed = False
        self.started_at: str | None = None
        self.conversation_id: int | None = None
        self.status = "parcial"
        self.drafts: dict[str, ObservationDraft] = {}
        self.asked_codes: list[str] = []
        self.turn_log: list[dict] = []
        self._sources: dict[str, str] = {}
        self._msgs: list[dict] = []
        self._persisted = 0
        self._node: Node = tree.node(tree.start)
        self._retry = False
        self._phase = "intro"
        self._urgent_event: tuple[str, str] | None = None
        self._raw: list[dict] = []
        self._flagged = False
        self._off = 0
        self._ack_n: dict[str, int] = {}
        self._last_ack: str | None = None

    @property
    def pending_code(self) -> str | None:
        return None if self.done else self._node.indicator_code

    # --- utterances
    def _say(self, node: Node, alt: bool = False, prefix: str | None = None) -> str:
        text = (node.alt_prompt if alt and node.alt_prompt else node.prompt).format(nombre=self.name)
        if prefix:
            text = f"{prefix} {text}"
        self._msgs.append({"role": "asistente", "question_code": node.indicator_code, "text": text})
        self._node = node
        return text

    def start(self) -> str:
        self.started_at = self.clock().isoformat(timespec="seconds")
        return self._say(self._node)

    # --- main entry
    def reply(self, text: str) -> TurnResult:
        if self.done or self.started_at is None:
            raise RuntimeError("dialogue not active")
        self._msgs.append({"role": "persona", "question_code": None, "text": text})
        if self._phase == "urgent_final":
            return self._finish(self.tree.node("cierre_urgente"), "parcial", urgent=True)
        if detect_urgent_messages(self._persona_texts()):
            return self._urgent()
        if HUMAN.search(normalize(text)):
            self.human_requested = True
            return self._finish(self.tree.node("cierre_humano"), "parcial")
        node = self._node
        if node.kind == "confirm":
            return self._confirm(node, text)
        return self._question(node, text)

    def _persona_texts(self) -> list[str]:
        return [m["text"] for m in self._msgs if m["role"] == "persona"]

    # --- confirmation nodes
    def _confirm(self, node: Node, text: str) -> TurnResult:
        intent = detect_intent(normalize(text))
        if intent in ("pregunta_hora", "pregunta_quien_es") and self._off == 0 and parse_yes_no(text) is None:
            return self._off_topic(node, text, intent, None)
        yes = parse_yes_no(text)
        if yes is None and not self._retry:
            self._retry = True
            return TurnResult([self._say(node, alt=True)], False, False)
        self._retry = False
        if node.id == "intro":
            if not yes:
                return self._finish(self.tree.node("cierre_no_confirmado"), "parcial")
            self.speaker_confirmed = True
            return TurnResult([self._say(self.tree.node("permiso"))], False, False)
        if not yes:
            return self._finish(self.tree.node("cierre_rechazo"), "rechazada")
        return self._advance(node, None)

    # --- question nodes
    def _question(self, node: Node, text: str) -> TurnResult:
        code, norm = node.indicator_code, normalize(text)
        cls = None
        state = dont_know_state(norm)
        if state:
            draft = ObservationDraft(code, state, None, None, text, 1.0, state)
        else:
            intent = detect_intent(norm)
            if intent is None:
                cls = self.classifier.classify(node, self._msgs[:-1], text)
                if cls.relevance is not None and cls.relevance < RELEVANCE_MIN:
                    intent = cls.intent or "otro_tema"
            if intent == "pide_persona_humana":
                self.human_requested = True
                return self._finish(self.tree.node("cierre_humano"), "parcial")
            if intent:
                return self._off_topic(node, text, intent, cls)
            draft = cls.draft
            self.turn_log.append({"code": code, "state": draft.state, "confidence": draft.confidence,
                                  "latency_ms": cls.latency_ms, "detail": draft.detail, "retry": self._retry})
            if draft.state in PENDING_STATES and not self._retry:
                self._retry = True
                return TurnResult([self._say(node, alt=True)], False, False, cls)
            self._raw_turn(code, text, cls)
        self.drafts[code] = draft
        self._sources[code] = "ia"
        if draft.state == "informado" and draft.value_num == 1.0 and code in URGENT_EVENT:
            self._urgent_event = (URGENT_EVENT[code], text)
            return self._urgent(cls)
        nxt_class = answer_class(draft, node.kind)
        return self._advance(node, nxt_class, cls, self._acknowledgment(node, draft))

    # --- relevance gate: off-topic answers record nothing, re-ask once, then no_comprendido
    def _off_topic(self, node: Node, text: str, intent: str, cls: TurnClassification | None) -> TurnResult:
        code = node.indicator_code
        self._off += 1
        entry = {"code": code, "state": "fuera_de_tema", "confidence": None, "latency_ms": cls.latency_ms if cls else 0,
                 "detail": intent, "retry": self._off > 1, "fuera_de_tema": True, "intencion": intent}
        if node.kind != "confirm":
            self.turn_log.append(entry)
            if cls is not None:
                self._raw_turn(code, text, cls)
        if self._off == 1 or node.kind == "confirm":
            question = (node.alt_prompt if intent in ("pide_repetir", "no_entiende") and node.alt_prompt
                        else node.prompt).format(nombre=self.name)
            reply = OFF_TOPIC.get(intent, OFF_TOPIC["otro_tema"]).format(
                hora=self.clock().strftime("%H:%M"), pregunta=question)
            self._msgs.append({"role": "asistente", "question_code": code, "text": reply})
            return TurnResult([reply], False, False, cls, True, intent)
        draft = ObservationDraft(code, "no_comprendido", None, None, text, None, f"fuera_de_tema {intent}")
        self.drafts[code], self._sources[code] = draft, "ia"
        return self._advance(node, None, cls, self._acknowledgment(node, draft))

    def _acknowledgment(self, node: Node, draft: ObservationDraft) -> str | None:
        """Deterministic, varied, approved acknowledgment for the answer just recorded."""
        if draft.state in ("no_sabe", "prefiere_no_responder"):
            key, pool = "dont_know", ACKS["dont_know"]
        elif draft.state == "informado":
            val = (json.loads(draft.value_text or "[]") if node.kind == "list" else
                   draft.value_text if node.kind == "category" else draft.value_num)
            v = valence(node.indicator_code, node.kind, val)
            key = f"{v}:{DIM_OF.get(node.indicator_code)}"
            pool = ACKS_BY_DIMENSION.get((v, DIM_OF.get(node.indicator_code)), ACKS[v])
        else:
            key, pool = "neutral:-", ACKS["neutral"]
        i = self._ack_n.get(key, 0)
        self._ack_n[key] = i + 1
        text = pool[i % len(pool)].format(nombre=self.name)
        if text == self._last_ack and len(pool) > 1:
            text = pool[(i + 1) % len(pool)].format(nombre=self.name)
        self._last_ack = text
        return text

    def _raw_turn(self, code: str, text: str, cls: TurnClassification) -> None:
        self.turn_log[-1]["flags"] = list(cls.flags)
        self._raw.append({"code": code, "answer": text, "response": cls.raw, "latency_ms": cls.latency_ms})
        self._flagged = self._flagged or bool(cls.flags)

    # --- navigation
    def _advance(self, node: Node, cls_name: str | None, cls: TurnClassification | None = None,
                 ack: str | None = None) -> TurnResult:
        self._retry = False
        self._off = 0
        nid = node.next_for(cls_name)
        if self._flagged and AYUDA not in self.asked_codes and node.id != AYUDA:
            nid = AYUDA
        while True:
            if nid is None:
                nid = "cierre_normal" if AYUDA in self.asked_codes else AYUDA
            nxt = self.tree.node(nid)
            if nxt.kind == "close":
                return self._finish(nxt, "completada", classification=cls)
            if nxt.indicator_code in self.asked_codes or nxt.indicator_code in self.drafts:
                nid = nxt.default_next
                continue
            if len(self.asked_codes) >= MAX_QUESTIONS - 1 and nxt.id != AYUDA:
                nid = AYUDA
                continue
            if nxt.condition and not self._condition(nxt):
                nid = self._skip(nxt)
                continue
            self.asked_codes.append(nxt.indicator_code)
            return TurnResult([self._say(nxt, prefix=ack)], False, False, cls, ack=ack)

    def _condition(self, node: Node) -> bool:
        if node.condition == "tiene_tratamiento":
            return self.person["tiene_tratamiento"] != "no"
        if node.condition == "confusion_cadence":
            animo = self.drafts.get("animo_reportado")
            return (animo is not None and animo.value_text == "mal") or self.clock().toordinal() % 2 == 0
        return True

    def _skip(self, node: Node) -> str | None:
        """Skipped node: record the deterministic value if the rule implies one; return the next node id."""
        if node.condition == "tiene_tratamiento":
            code = node.indicator_code
            self.drafts[code] = ObservationDraft(code, "informado", None, "no_aplica", None, 1.0, "sin tratamiento (ficha)")
            self._sources[code] = "regla"
            return node.next_for("no_aplica")
        return node.default_next

    # --- urgent
    def _urgent(self, cls: TurnClassification | None = None) -> TurnResult:
        self.urgent = True
        self._phase = "urgent_final"
        self.status = "parcial"
        text = self._say(self.tree.node("protocolo_urgente"))
        self._persist_all("parcial")
        return TurnResult([text], False, True, cls)

    # --- closing / persistence
    def abandon(self) -> None:
        """Call ended without a normal close (script exhausted, hang-up): persist as partial."""
        if not self.done:
            self._finalize("parcial")

    def _finish(self, node: Node, status: str, urgent: bool = False, classification=None) -> TurnResult:
        text = self._say(node)
        self._finalize(status)
        return TurnResult([text], True, self.urgent or urgent, classification)

    def _finalize(self, status: str) -> None:
        self.status = status
        self.done = True
        if self.conn is None:
            return
        if self.conversation_id is None:
            self._persist_all(status)
        else:
            self._append_messages()
            self.conn.execute("UPDATE conversation SET status=? WHERE id=?", (status, self.conversation_id))
            self.conn.commit()
        process_after_dialogue(self.conn, self.conversation_id)
        if self.human_requested:
            self._human_alert()

    def _append_messages(self) -> None:
        for i, m in enumerate(self._msgs[self._persisted:], start=self._persisted):
            self.conn.execute("INSERT INTO message (conversation_id, turn, role, question_code, text) VALUES (?,?,?,?,?)",
                              (self.conversation_id, i + 1, m["role"], m["question_code"], m["text"]))
        self._persisted = len(self._msgs)

    def _persist_all(self, status: str) -> None:
        conn = self.conn
        if conn is None:
            return
        ev, quote = self._urgent_event or (None, None)
        cur = conn.execute(
            "INSERT INTO conversation (person_id, channel, started_at, status, speaker_confirmed, scenario_id,"
            " urgent_event_type, urgent_event_quote) VALUES (?,?,?,?,?,?,?,?)",
            (self.person["id"], self.channel, self.started_at, status, int(self.speaker_confirmed), "interactivo", ev, quote))
        self.conversation_id = cur.lastrowid
        self._append_messages()
        run_urgent(conn, self.conversation_id)  # regla observations first; the IA must not duplicate them
        regla = {r[0] for r in conn.execute("SELECT indicator_code FROM observation WHERE conversation_id=? AND source='regla'",
                                            (self.conversation_id,))}
        eid = None
        if self._raw:
            eid = conn.execute(
                "INSERT INTO extraction (conversation_id, model, prompt_version, raw_json, schema_valid, summary, created_at)"
                " VALUES (?,?,?,?,1,?,?)",
                (self.conversation_id, getattr(self.classifier, "model_name", "unknown"), DIALOGUE_PROMPT_VERSION,
                 json.dumps({"turns": self._raw}, ensure_ascii=False), f"{len(self._raw)} turnos clasificados",
                 self.started_at)).lastrowid
        for code, d in self.drafts.items():
            if code in regla:
                continue
            src = self._sources.get(code, "ia")
            conn.execute(
                "INSERT INTO observation (person_id, conversation_id, extraction_id, indicator_code, value_num, value_text,"
                " state, evidence_quote, confidence, source, observed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (self.person["id"], self.conversation_id, eid if src == "ia" else None, code, d.value_num, d.value_text,
                 d.state, d.evidence_quote, d.confidence, src, self.started_at))
        conn.commit()
        process_after_dialogue(conn, self.conversation_id)

    def _human_alert(self) -> None:
        self.conn.execute(
            "INSERT INTO alert (person_id, level, origin, rule_code, explanation, status, created_at)"
            " VALUES (?, 1, 'situacion_contacto', 'R1_SOLICITA_CONTACTO_HUMANO', ?, 'abierta', ?)",
            (self.person["id"], "La persona pidió hablar con una persona del equipo durante la llamada automática. "
                                "Contactarla a la brevedad; no es una señal de salud por sí sola.", self.started_at))
        self.conn.commit()
