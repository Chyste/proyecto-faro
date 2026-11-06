"""Deterministic urgent-event detector (no LLM): runs first, before any extraction.

Normalised (lowercase, accent-stripped) regex patterns over the person's messages, plus the
scripted ``conversation.urgent_event_type``. Writes observations (source='regla') and a level-3 alert.
"""
from __future__ import annotations

import re
import sqlite3
import unicodedata
from dataclasses import dataclass


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


AYUDA = re.compile(r"necesito ayuda|ayudeme|ayudenme|auxilio|ayuda ahora")
CAIDA = re.compile(r"\bme cai\b|\bme he caido\b")
LESION = re.compile(r"me lesione|me golpee|me duele|no me puedo (?:parar|levantar)")
SINTOMA = re.compile(r"dolor (?:fuerte |muy fuerte )?(?:en el|del|de) pecho|no puedo respirar|me falta (?:el )?aire")
_NEG = re.compile(r"\b(?:no|nunca|ni|sin)\b")
_DELIM = "[.,;:!?¡¿]"

# event -> (rule code, Spanish label); order = priority for the alert's main rule
EVENTS = {
    "necesita_ayuda_inmediata": ("R3_AYUDA_INMEDIATA", "pidió ayuda inmediata"),
    "caida_con_lesion": ("R3_CAIDA_LESION", "reportó una caída con lesión"),
    "sintoma_agudo": ("R3_SINTOMA_AGUDO", "reportó un síntoma agudo del protocolo"),
}


@dataclass(frozen=True)
class UrgentHit:
    event: str
    rule_code: str
    evidence: tuple[tuple[str, str], ...]  # (indicator_code, supporting text)
    source: str = "texto"  # 'texto' | 'guion'


def _match(pattern: re.Pattern, text: str) -> bool:
    """True when the pattern matches at least once without a negation earlier in its clause."""
    norm = normalize(text)
    for m in pattern.finditer(norm):
        before = re.split(_DELIM, norm[: m.start()])[-1]
        if not _NEG.search(before):
            return True
    return False


def _hit(event: str, evidence, source="texto") -> UrgentHit:
    return UrgentHit(event, EVENTS[event][0], tuple(evidence), source)


def detect_urgent(text: str) -> list[UrgentHit]:
    """Urgent events found in a single text."""
    hits = []
    if _match(AYUDA, text):
        hits.append(_hit("necesita_ayuda_inmediata", [("necesita_ayuda_inmediata", text)]))
    if _match(CAIDA, text) and _match(LESION, text):
        hits.append(_hit("caida_con_lesion", [("caida_reportada", text), ("lesion_reportada", text)]))
    if _match(SINTOMA, text):
        hits.append(_hit("sintoma_agudo", [("sintoma_agudo_protocolo", text)]))
    return hits


def detect_urgent_messages(texts: list[str]) -> list[UrgentHit]:
    """Urgent events over a whole conversation (a fall and its injury may be in different replies)."""
    hits: dict[str, UrgentHit] = {}
    for t in texts:
        for h in detect_urgent(t):
            hits.setdefault(h.event, h)
    if "caida_con_lesion" not in hits:
        fall = next((t for t in texts if _match(CAIDA, t)), None)
        injury = next((t for t in texts if _match(LESION, t)), None)
        if fall and injury:
            hits["caida_con_lesion"] = _hit("caida_con_lesion", [("caida_reportada", fall), ("lesion_reportada", injury)])
    return sorted(hits.values(), key=lambda h: list(EVENTS).index(h.event))


_SCRIPT_EVIDENCE = {
    "necesita_ayuda_inmediata": ("necesita_ayuda_inmediata",),
    "caida_con_lesion": ("caida_reportada", "lesion_reportada"),
    "sintoma_agudo": ("sintoma_agudo_protocolo",),
}


def run_urgent(conn: sqlite3.Connection, conversation_id: int) -> dict:
    """Detect urgent events for a conversation and persist observations + alert (idempotent)."""
    conv = conn.execute("SELECT * FROM conversation WHERE id=?", (conversation_id,)).fetchone()
    texts = [r["text"] for r in conn.execute(
        "SELECT text FROM message WHERE conversation_id=? AND role='persona' ORDER BY turn", (conversation_id,))]
    hits = detect_urgent_messages(texts)
    if conv["urgent_event_type"] and conv["urgent_event_type"] not in {h.event for h in hits}:
        ev = conv["urgent_event_type"]
        hits.append(_hit(ev, [(c, conv["urgent_event_quote"]) for c in _SCRIPT_EVIDENCE[ev]], "guion"))
    result = {"hits": hits, "observation_ids": [], "alert_id": None, "alert_created": False}
    if not hits:
        return result

    seen: set[str] = set()
    for h in hits:
        for code, quote in h.evidence:
            if code in seen:
                continue
            seen.add(code)
            row = conn.execute("SELECT id FROM observation WHERE conversation_id=? AND indicator_code=? AND source='regla'",
                               (conversation_id, code)).fetchone()
            if row:
                oid = row["id"]
            else:
                oid = conn.execute(
                    "INSERT INTO observation (person_id, conversation_id, indicator_code, value_num, state,"
                    " evidence_quote, confidence, source, observed_at) VALUES (?, ?, ?, 1, 'informado', ?, 1.0, 'regla', ?)",
                    (conv["person_id"], conversation_id, code, quote, conv["started_at"])).lastrowid
            result["observation_ids"].append(oid)

    main = hits[0]
    labels = "; ".join(EVENTS[h.event][1] for h in hits)
    explanation = (f"Evento urgente detectado por regla (sin esperar al modelo): la persona {labels}. "
                   "Activación simulada del protocolo de emergencia; permanece abierta hasta que un responsable la resuelva.")
    alert = conn.execute("SELECT id FROM alert WHERE person_id=? AND origin='regla_urgente' AND created_at=?",
                         (conv["person_id"], conv["started_at"])).fetchone()
    if alert:
        alert_id = alert["id"]
    else:
        alert_id = conn.execute(
            "INSERT INTO alert (person_id, level, origin, rule_code, explanation, status, due_at, created_at)"
            " VALUES (?, 3, 'regla_urgente', ?, ?, 'abierta', ?, ?)",
            (conv["person_id"], main.rule_code, explanation, conv["started_at"], conv["started_at"])).lastrowid
        result["alert_created"] = True
    conn.executemany("INSERT OR IGNORE INTO alert_evidence (alert_id, observation_id) VALUES (?, ?)",
                     [(alert_id, o) for o in result["observation_ids"]])
    conn.commit()
    result["alert_id"] = alert_id
    return result
