"""Live extraction of the 16 contract indicators with TypeSafe Jev (System One decision model).

Design (the AI assists, humans decide):
* One request per conversation, "fan-out" pattern: one question per ASKED indicator, answers are typed
  (Choice / Noul) with probabilities and confidence; no free text is generated.
* Thresholds below turn probabilities into observations; anything uncertain becomes
  ``pendiente_confirmar`` (human review), never a guessed value.
* ``evidence_quote`` is the person's own turn (deterministic), never generated.
* The regex urgent route stays primary. Jev only adds a level-2 "possible urgency" safety-net alert when
  the regex did not fire (probability routing: riskier question -> lower yes threshold).
* The API key is read from the environment (``TYPESAFE_API_KEY``, optionally via ``.env``) and is never
  stored, logged or put in exceptions.
"""
from __future__ import annotations

import json
import os
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime

import httpx
from dotenv import load_dotenv

from src.db.catalog import INDICATORS, Indicator

PROMPT_VERSION = "jev-demo-v1"
API_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"
TIMEOUT_S = 20.0
KEY_ENV_NAMES = ("TYPESAFE_API_KEY", "JEV", "JEV_API_KEY")  # first one set wins; .env may use a short name

# --- Thresholds (documented in docs/EXTRACCION_JEV.md) -------------------------------------------
CONF_MIN = 0.5      # Choice: confidence below this -> pendiente_confirmar (value withheld)
NOUL_YES = 0.7      # Noul: p >= 0.7 -> true
NOUL_NO = 0.3       # Noul: p <= 0.3 -> false; the band between is pendiente_confirmar
URGENT_YES = 0.5    # urgent indicators and safety-net Nouls: lower "yes" bar (missing an emergency costs more)
NULL_REASONS = ("no_sabe", "prefiere_no_responder", "no_comprendido")

# Relevance gate (Companion Noul pattern): runs on every per-turn classification. p < RELEVANCE_MIN -> off-topic.
RELEVANCE_MIN = 0.5
GATE_Q = "responde_pregunta"
INTENT_Q = "intencion_fuera_de_tema"
INTENT_OPTIONS = {
    "pregunta_hora": "La persona pregunta la hora o la fecha",
    "pregunta_quien_es": "La persona pregunta quién habla, quién es el asistente o por qué llaman",
    "pide_repetir": "La persona pide repetir o no escuchó la pregunta",
    "pide_persona_humana": "La persona pide hablar con una persona",
    "otro_tema": "La persona habla de otra cosa que no responde la pregunta",
    "no_entiende": "La persona dice que no entiende la pregunta",
}

CONTEXT = "Llamada de seguimiento a una persona mayor; período: desde la última conversación, máximo 24 horas"

URGENT_NOULS = {
    "urgente__ayuda_inmediata": (
        "¿La persona pide ayuda de forma explícita ahora, o dice que necesita que alguien vaya a verla de inmediato? "
        "Basado solo en lo que la persona dijo; una negativa como 'ahora no' es falso.",
        "La persona pide ayuda o que vayan a verla ahora mismo.",
        "No lo pide, lo niega o solo menciona ayuda en general."),
    "urgente__caida_con_lesion": (
        "¿La persona dice haberse caído y además refiere una lesión, un golpe, dolor intenso o que no puede levantarse? "
        "Basado solo en lo que dijo; una caída sin lesión o una lesión sin caída es falso.",
        "Dice que se cayó y refiere lesión, golpe, dolor intenso o no poder levantarse.",
        "No dice caída con lesión (no hubo caída, o no refiere lesión)."),
    "urgente__sintoma_agudo": (
        "¿La persona refiere ahora o hace poco un síntoma agudo del protocolo de emergencia: dolor de pecho, "
        "falta de aire o desmayo? Basado solo en lo que dijo, sin diagnosticar.",
        "Declara dolor de pecho, falta de aire o desmayo reciente.",
        "No declara ninguno de esos síntomas."),
}
NOUL_URGENT_FLAG = {"urgente__ayuda_inmediata": "necesita_ayuda_inmediata",
                    "urgente__caida_con_lesion": "caida_con_lesion", "urgente__sintoma_agudo": "sintoma_agudo"}

OPTION_DESC = {
    "no": "La persona dice que no", "a_veces": "Lo siente a veces / de forma ocasional",
    "frecuente": "Lo siente con frecuencia", "sin_cambio": "Dice que nada ha cambiado",
    "mejora": "Dice que está mejor que antes", "empeora": "Dice que le cuesta más que antes",
    "completa": "Dice que tomó todos sus remedios", "parcial": "Dice que tomó solo algunos o a medias",
    "ninguna": "Dice que no tomó sus remedios", "no_aplica": "No tiene tratamiento ni remedios que tomar",
    "bien": "Dice que está bien", "regular": "Dice que está más o menos", "mal": "Dice que está mal",
    "ocasional": "Lo siente de vez en cuando", "persistente": "Lo siente casi todo el tiempo",
    "no_sabe": "La persona dice que no sabe o no recuerda",
    "prefiere_no_responder": "La persona prefiere no responder",
    "no_comprendido": "La respuesta no se entiende o no responde a la pregunta",
}
BOOL_CRITERIA = {"true": "La persona lo afirma o lo describe con sus palabras",
                 "false": "La persona lo niega o dice que no ocurrió"}


class JevError(Exception):
    """Transport/API failure. Messages never contain the API key."""


@dataclass(frozen=True)
class ObservationDraft:
    indicator_code: str
    state: str
    value_num: float | None = None
    value_text: str | None = None
    evidence_quote: str | None = None
    confidence: float | None = None
    detail: str = ""


def catalog_by_code() -> dict[str, Indicator]:
    return {i.code: i for i in INDICATORS}


def asked_codes(messages: list[dict]) -> list[str]:
    cat = catalog_by_code()
    out: list[str] = []
    for m in messages:
        c = m.get("question_code")
        if m["role"] == "asistente" and c in cat and c not in out:
            out.append(c)
    return out


# --- Request ---------------------------------------------------------------------------------------
def _questions_for(code: str, ind: Indicator) -> dict[str, dict]:
    base = ("Considera SOLO la respuesta de la persona a la pregunta con código '" + code + "'. "
            "Es lo que la persona declara (autodeclaración); no diagnostiques ni infieras más allá de sus palabras. ")
    if ind.value_type == "category":
        crit = {v: OPTION_DESC.get(v, f"La persona declara: {v}") for v in ind.allowed_values}
        crit.update({r: OPTION_DESC[r] for r in NULL_REASONS})
        return {code: {"type": "choice", "instructions": base + ind.description + " Elige el valor que la persona declaró.",
                       "criteria": crit}}
    if ind.value_type == "bool":
        return {code: {"type": "noul", "instructions": base + ind.description, "criteria": dict(BOOL_CRITERIA)}}
    return {f"{code}__{opt}": {"type": "noul",
                               "instructions": base + f"¿La persona menciona '{opt}' entre lo que reporta? " + ind.description,
                               "criteria": {"true": f"La persona menciona {opt}", "false": f"La persona no menciona {opt}"}}
            for opt in ind.allowed_values}


def _turns(messages: list[dict]) -> list[dict]:
    turns, last_q = [], None
    for m in messages:
        if m["role"] == "asistente":
            last_q = m.get("question_code")
            turns.append({"rol": "asistente", "pregunta": last_q, "texto": m["text"]})
        else:
            turns.append({"rol": "persona", "pregunta": last_q, "texto": m["text"]})
    return turns


def _gate_questions() -> dict[str, dict]:
    return {GATE_Q: {"type": "noul", "instructions": "¿La respuesta de la persona contesta la pregunta que se le hizo? "
                     "Considera solo el último turno de la persona frente a la última pregunta del asistente.",
                     "criteria": {"true": "La persona responde lo que se le preguntó, aunque sea con 'no' o 'no sé'",
                                  "false": "La persona pregunta otra cosa, cambia de tema o no responde lo preguntado"}},
            INTENT_Q: {"type": "choice", "instructions": "Si la persona no respondió la pregunta, elige qué hizo en su lugar.",
                       "criteria": dict(INTENT_OPTIONS)}}


def build_request(messages: list[dict], codes: list[str], cat: dict[str, Indicator], model: str | None = None,
                  gate: bool = False) -> dict:
    questions: dict[str, dict] = {}
    for code in codes:
        questions.update(_questions_for(code, cat[code]))
    for qid, (instr, yes, no) in URGENT_NOULS.items():
        questions[qid] = {"type": "noul", "instructions": instr, "criteria": {"true": yes, "false": no}}
    if gate:
        questions.update(_gate_questions())
    return {"model": model or os.environ.get("TYPESAFE_MODEL") or DEFAULT_MODEL,
            "state": {"contexto": CONTEXT, "turnos": _turns(messages)}, "questions": questions}


def _expected(codes: list[str], gate: bool = False) -> dict[str, str]:
    cat = catalog_by_code()
    exp: dict[str, str] = {}
    for c in codes:
        for qid, q in _questions_for(c, cat[c]).items():
            exp[qid] = q["type"]
    for qid in URGENT_NOULS:
        exp[qid] = "noul"
    if gate:
        exp[GATE_Q], exp[INTENT_Q] = "noul", "choice"
    return exp


def _num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool) and 0 <= x <= 1


def _answer_ok(ans, kind: str, allowed: set[str] | None) -> bool:
    if not isinstance(ans, dict) or ans.get("type") != kind:
        return False
    if kind == "noul":
        return _num(ans.get("noul"))
    return ans.get("choice") in (allowed or set()) and _num(ans.get("confidence"))


def validate_response(resp: dict, codes: list[str], gate: bool = False) -> bool:
    """Every expected answer id present, typed correctly and with in-range values."""
    answers = resp.get("answers") if isinstance(resp, dict) else None
    if not isinstance(answers, dict):
        return False
    cat = catalog_by_code()
    for qid, kind in _expected(codes, gate).items():
        allowed = None
        if kind == "choice":
            allowed = set(INTENT_OPTIONS) if qid == INTENT_Q else set(cat[qid].allowed_values) | set(NULL_REASONS)
        if not _answer_ok(answers.get(qid), kind, allowed):
            return False
    return True


# --- Mapping ---------------------------------------------------------------------------------------
def _quote(messages: list[dict], code: str) -> str | None:
    seen = False
    for m in messages:
        if seen and m["role"] == "persona":
            return m["text"]
        if m["role"] == "asistente" and m.get("question_code") == code:
            seen = True
    return None


def _noul_bool(p: float, urgent: bool) -> tuple[str, float | None]:
    yes = URGENT_YES if urgent else NOUL_YES
    if p >= yes:
        return "informado", 1.0
    if p <= NOUL_NO:
        return "informado", 0.0
    return "pendiente_confirmar", None


def map_response(resp: dict, codes: list[str], messages: list[dict]) -> list[ObservationDraft]:
    """Turn Jev answers into observation drafts (see module thresholds). Malformed answers are skipped."""
    cat = catalog_by_code()
    answers = resp.get("answers", {})
    drafts: list[ObservationDraft] = []
    for code in codes:
        ind, quote = cat[code], _quote(messages, code)
        if ind.value_type == "category":
            ans = answers.get(code)
            if not _answer_ok(ans, "choice", set(ind.allowed_values) | set(NULL_REASONS)):
                continue
            ch, conf = ans["choice"], float(ans["confidence"])
            detail = f"{ch} conf={conf:.2f}"
            if ch in NULL_REASONS:
                drafts.append(ObservationDraft(code, ch, None, None, quote, conf, detail))
            elif conf < CONF_MIN:
                drafts.append(ObservationDraft(code, "pendiente_confirmar", None, None, quote, conf, detail + " <min"))
            else:
                drafts.append(ObservationDraft(code, "informado", None, ch, quote, conf, detail))
        elif ind.value_type == "bool":
            ans = answers.get(code)
            if not _answer_ok(ans, "noul", None):
                continue
            p = float(ans["noul"])
            state, num = _noul_bool(p, ind.is_urgent_trigger)
            drafts.append(ObservationDraft(code, state, num, None, quote, max(p, 1 - p), f"p={p:.2f}"))
        else:
            ps = {}
            for opt in ind.allowed_values:
                a = answers.get(f"{code}__{opt}")
                if _answer_ok(a, "noul", None):
                    ps[opt] = float(a["noul"])
            if len(ps) != len(ind.allowed_values):
                continue
            detail = " ".join(f"{o}={p:.2f}" for o, p in ps.items() if p > NOUL_NO)
            conf = min(max(p, 1 - p) for p in ps.values())
            if any(NOUL_NO < p < NOUL_YES for p in ps.values()):
                drafts.append(ObservationDraft(code, "pendiente_confirmar", None, None, quote, conf, detail or "banda"))
            else:
                chosen = [o for o in ind.allowed_values if ps[o] >= NOUL_YES]
                drafts.append(ObservationDraft(code, "informado", None, json.dumps(chosen), quote, conf,
                                               detail or "ninguna"))
    return drafts


def urgent_flags(resp: dict) -> list[tuple[str, float]]:
    """Safety-net Nouls whose probability reaches URGENT_YES: [(event, p)]."""
    out = []
    for qid, event in NOUL_URGENT_FLAG.items():
        a = resp.get("answers", {}).get(qid)
        if _answer_ok(a, "noul", None) and a["noul"] >= URGENT_YES:
            out.append((event, float(a["noul"])))
    return out


# --- Client ----------------------------------------------------------------------------------------
def _httpx_transport(url, headers, body, timeout):
    r = httpx.post(url, headers=headers, json=body, timeout=timeout)
    try:
        data = r.json()
    except ValueError:
        data = {}
    return r.status_code, data


class JevClient:
    def __init__(self, api_key: str, model: str | None = None, transport=None, timeout: float = TIMEOUT_S):
        self._key = api_key
        self.model = model or os.environ.get("TYPESAFE_MODEL") or DEFAULT_MODEL
        self._transport = transport or _httpx_transport
        self.timeout = timeout

    def __repr__(self) -> str:
        return f"JevClient(model={self.model!r})"

    def _scrub(self, text: str) -> str:
        return str(text).replace(self._key, "***")[:200]

    def extract(self, state, questions: dict) -> dict:
        headers = {"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}
        body = {"state": state, "model": self.model, "questions": questions}
        last = "sin respuesta"
        for _ in range(2):
            try:
                status, data = self._transport(API_URL, headers, body, self.timeout)
            except (TimeoutError, httpx.HTTPError) as e:
                last = f"{type(e).__name__}"
                continue
            if status >= 500:
                last = f"HTTP {status}"
                continue
            if status != 200:
                detail = data.get("detail") if isinstance(data, dict) else None
                msg = detail.get("message") if isinstance(detail, dict) else detail
                raise JevError(f"HTTP {status}: {self._scrub(msg or '')}")
            if not isinstance(data, dict) or "answers" not in data:
                raise JevError("respuesta sin 'answers'")
            return data
        raise JevError(f"Jev no disponible ({last})")


def get_client() -> JevClient:
    load_dotenv()
    key = next((os.environ[n] for n in KEY_ENV_NAMES if os.environ.get(n)), None)
    if not key:
        raise JevError("TYPESAFE_API_KEY no está configurada (ver .env.example)")
    key = key.strip().strip('"').strip("'")
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    return JevClient(key)


# --- Persistence -----------------------------------------------------------------------------------
def _summary(drafts: list[ObservationDraft]) -> str:
    ok = [f"{d.indicator_code}: {d.value_text if d.value_text is not None else ('sí' if d.value_num else 'no')}"
          for d in drafts if d.state == "informado"]
    pend = sum(d.state == "pendiente_confirmar" for d in drafts)
    nulls = sum(d.state in NULL_REASONS for d in drafts)
    parts = ["; ".join(ok) or "sin campos informados"]
    if pend:
        parts.append(f"{pend} campo(s) derivados a revisión humana")
    if nulls:
        parts.append(f"{nulls} sin respuesta utilizable")
    return " | ".join(parts)


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _safety_net(conn, conv, flags) -> int | None:
    """Level-2 'possible urgency' alert when Jev suspects an emergency the regex route did not flag.

    Deliberately level 2 and never level 3: the model may only ask a human to look; the deterministic
    regex route remains the only automatic path to level 3.
    """
    if not flags:
        return None
    fired = conn.execute("SELECT 1 FROM alert WHERE person_id=? AND origin='regla_urgente' AND created_at=?",
                         (conv["person_id"], conv["started_at"])).fetchone()
    if fired:
        return None
    row = conn.execute("SELECT id FROM alert WHERE person_id=? AND rule_code='R2_POSIBLE_URGENCIA_IA' AND created_at=?",
                       (conv["person_id"], conv["started_at"])).fetchone()
    if row:
        return row["id"]
    return conn.execute(
        "INSERT INTO alert (person_id, level, origin, rule_code, explanation, status, due_at, created_at)"
        " VALUES (?, 2, 'senal_aislada', 'R2_POSIBLE_URGENCIA_IA', ?, 'abierta', ?, ?)",
        (conv["person_id"],
         "La IA sugiere una posible urgencia no detectada por las reglas: revisar de inmediato. "
         f"Señal: {', '.join(f'{e} (p={p:.2f})' for e, p in flags)}.",
         conv["started_at"], conv["started_at"])).lastrowid


def record_fallback(conn, conversation_id: int, error: str) -> int:
    """Store a schema_valid=0 extraction row documenting a fallback to replay (no secrets)."""
    return conn.execute(
        "INSERT INTO extraction (conversation_id, model, prompt_version, raw_json, schema_valid, summary, created_at)"
        " VALUES (?, 'fallback', ?, ?, 0, 'fallback: reproducción', ?)",
        (conversation_id, PROMPT_VERSION, json.dumps({"error": error}), _now_iso())).lastrowid


def extract_conversation(conn: sqlite3.Connection, conversation_id: int, client: JevClient) -> dict:
    """Run Jev on one conversation and persist extraction + observations (idempotent). May raise JevError."""
    conv = conn.execute("SELECT * FROM conversation WHERE id=?", (conversation_id,)).fetchone()
    prior = conn.execute("SELECT id FROM extraction WHERE conversation_id=? AND prompt_version=?",
                         (conversation_id, PROMPT_VERSION)).fetchone()
    if prior:
        ids = [r[0] for r in conn.execute(
            "SELECT id FROM observation WHERE conversation_id=? AND extraction_id=?", (conversation_id, prior["id"]))]
        return {"reused": True, "extraction_id": prior["id"], "observation_ids": ids, "drafts": [], "flags": [],
                "details": {}, "tokens": 0, "latency_ms": 0}
    messages = [dict(r) for r in conn.execute(
        "SELECT turn, role, question_code, text FROM message WHERE conversation_id=? ORDER BY turn", (conversation_id,))]
    codes = asked_codes(messages)
    req = build_request(messages, codes, catalog_by_code(), client.model)
    t0 = time.perf_counter()
    resp = client.extract(req["state"], req["questions"])
    latency = int((time.perf_counter() - t0) * 1000)

    valid = validate_response(resp, codes)
    regla = {r[0] for r in conn.execute(
        "SELECT indicator_code FROM observation WHERE conversation_id=? AND source='regla'", (conversation_id,))}
    drafts = [d for d in map_response(resp, codes, messages) if d.indicator_code not in regla]
    flags = urgent_flags(resp)
    usage = resp.get("usage") or {}
    tokens = int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
    eid = conn.execute(
        "INSERT INTO extraction (conversation_id, model, prompt_version, raw_json, schema_valid, summary, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (conversation_id, str(resp.get("model", client.model)), PROMPT_VERSION,
         json.dumps({"response": resp, "latency_ms": latency}, ensure_ascii=False), int(valid),
         _summary(drafts), _now_iso())).lastrowid
    obs_ids = []
    for d in drafts:
        obs_ids.append(conn.execute(
            "INSERT INTO observation (person_id, conversation_id, extraction_id, indicator_code, value_num, value_text,"
            " state, evidence_quote, confidence, source, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ia', ?)",
            (conv["person_id"], conversation_id, eid, d.indicator_code, d.value_num, d.value_text, d.state,
             d.evidence_quote, d.confidence, conv["started_at"])).lastrowid)
    alert_id = _safety_net(conn, conv, flags)
    conn.commit()
    return {"reused": False, "extraction_id": eid, "observation_ids": obs_ids, "drafts": drafts, "flags": flags,
            "details": {d.indicator_code: d.detail for d in drafts}, "tokens": tokens, "latency_ms": latency,
            "schema_valid": valid, "safety_alert_id": alert_id}
