"""Per-conversation pipeline: urgent route -> replay observations -> rules -> assessment + alerts."""
from __future__ import annotations

import json
import sqlite3
from datetime import date

from .extractor_jev import JevError, extract_conversation, record_fallback
from .replay import VALID_STATUS, load_replay_observations
from .rules import RULE_VERSION, Call, Obs, evaluate
from .urgent import run_urgent


def _decode(row) -> object:
    if row["state"] != "informado":
        return None
    if row["value_text"] is not None:
        t = row["value_text"]
        return json.loads(t) if t.startswith("[") else t
    return None if row["value_num"] is None else bool(row["value_num"])


def _calls_until(conn, conv) -> list[Call]:
    calls = []
    convs = conn.execute("SELECT * FROM conversation WHERE person_id=? AND (started_at < ? OR id = ?)"
                         " ORDER BY started_at, id", (conv["person_id"], conv["started_at"], conv["id"])).fetchall()
    for c in convs:
        obs = tuple(Obs(r["id"], r["indicator_code"], _decode(r), r["state"]) for r in conn.execute(
            "SELECT * FROM observation WHERE conversation_id=? ORDER BY id", (c["id"],)))
        calls.append(Call(c["id"], date.fromisoformat(c["started_at"][:10]), c["status"] in VALID_STATUS, obs))
    return calls


def _upsert_alert(conn, person_id, level, origin, rule_code, explanation, created_at, obs_ids) -> dict:
    row = conn.execute("SELECT id FROM alert WHERE person_id=? AND level=? AND origin=? AND status!='cerrada'"
                       " ORDER BY id LIMIT 1", (person_id, level, origin)).fetchone()
    if row:
        conn.execute("UPDATE alert SET rule_code=?, explanation=? WHERE id=?", (rule_code, explanation, row["id"]))
        action, aid = "actualizada", row["id"]
    else:
        aid = conn.execute("INSERT INTO alert (person_id, level, origin, rule_code, explanation, status, created_at)"
                           " VALUES (?, ?, ?, ?, ?, 'abierta', ?)",
                           (person_id, level, origin, rule_code, explanation, created_at)).lastrowid
        action = "creada"
    conn.executemany("INSERT OR IGNORE INTO alert_evidence (alert_id, observation_id) VALUES (?, ?)",
                     [(aid, o) for o in obs_ids])
    return {"action": action, "alert_id": aid, "level": level, "origin": origin, "rule_code": rule_code}


def _extract_step(conn, conversation_id, mode, client) -> dict:
    """Step 3: replay (annotated values) or Jev extraction; Jev failure falls back to replay for this conversation."""
    if mode == "dialogo":  # observations were written turn by turn by the dialogue engine
        return {"step": "dialogo", "observation_ids": []}
    if mode == "reproduccion":
        return {"step": "replay", "observation_ids": load_replay_observations(conn, conversation_id)}
    try:
        r = extract_conversation(conn, conversation_id, client)
    except JevError as e:
        record_fallback(conn, conversation_id, f"{type(e).__name__}: {e}")
        return {"step": "replay", "fallback": True, "error": str(e),
                "observation_ids": load_replay_observations(conn, conversation_id)}
    return {"step": "jev", "observation_ids": r["observation_ids"], "details": r["details"], "flags": r["flags"],
            "tokens": r["tokens"], "latency_ms": r["latency_ms"], "reused": r["reused"],
            "safety_alert_id": r.get("safety_alert_id")}


def process_conversation(conn: sqlite3.Connection, conversation_id: int, mode: str = "reproduccion",
                         client=None) -> list[dict]:
    """Process one conversation (idempotent); returns a step log. mode: 'reproduccion' | 'jev'."""
    if mode not in ("reproduccion", "jev", "dialogo"):
        raise ValueError(f"Unknown mode: {mode}")
    if mode == "jev" and client is None:
        raise ValueError("mode='jev' requires a client")
    conv = conn.execute("SELECT * FROM conversation WHERE id=?", (conversation_id,)).fetchone()
    pid, when = conv["person_id"], conv["started_at"]
    log: list[dict] = []

    urgent = run_urgent(conn, conversation_id)
    log.append({"step": "urgent", "hits": urgent["hits"], "observation_ids": urgent["observation_ids"],
                "alert_id": urgent["alert_id"]})

    alerts: list[dict] = []
    if urgent["alert_id"]:
        alerts.append({"action": "creada" if urgent["alert_created"] else "existente", "alert_id": urgent["alert_id"],
                       "level": 3, "origin": "regla_urgente",
                       "rule_code": conn.execute("SELECT rule_code FROM alert WHERE id=?", (urgent["alert_id"],)).fetchone()[0]})

    if conv["status"] not in VALID_STATUS:
        result = evaluate(_calls_until(conn, conv))
        log.append({"step": "replay", "observation_ids": []})
        alerts.append(_upsert_alert(
            conn, pid, 1, "situacion_contacto", "C1_SIN_CONTACTO",
            "No fue posible contactar a la persona en el intento más reciente. Revisar horario preferido y teléfono; "
            "no es una señal de salud.", when, []))
    else:
        log.append(_extract_step(conn, conversation_id, mode, client))
        open_urgent = conn.execute("SELECT 1 FROM alert WHERE person_id=? AND level=3 AND status!='cerrada'"
                                   " AND created_at<=?", (pid, when)).fetchone() is not None
        result = evaluate(_calls_until(conn, conv), open_urgent=open_urgent)
        if result.level in (1, 2):
            main = result.reasons[0]
            origin = "senal_aislada" if result.level == 1 else "combinacion"
            alerts.append(_upsert_alert(conn, pid, result.level, origin, main["rule_code"], main["explanation"], when,
                                        main["observation_ids"]))

    conn.execute("DELETE FROM assessment WHERE conversation_id=?", (conversation_id,))
    conn.execute("INSERT INTO assessment (person_id, evaluated_at, conversation_id, level, dimension_levels, reasons,"
                 " rule_version) VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (pid, when, conversation_id, result.level, json.dumps(result.dimension_levels),
                  json.dumps(result.reasons, ensure_ascii=False), RULE_VERSION))
    conn.commit()
    log.append({"step": "assessment", "level": result.level, "dimension_levels": result.dimension_levels,
                "reasons": result.reasons})
    log.append({"step": "alerts", "alerts": alerts})
    return log


def process_after_dialogue(conn: sqlite3.Connection, conversation_id: int) -> list[dict]:
    """Urgent rule + rules/assessment/alerts over a conversation whose observations the dialogue already wrote."""
    return process_conversation(conn, conversation_id, "dialogo")


def process_all(conn: sqlite3.Connection, mode: str = "reproduccion", client=None,
                limit: int | None = None) -> dict[int, list[dict]]:
    """Process conversations chronologically across persons (first `limit` if given); returns {id: step log}."""
    ids = [r[0] for r in conn.execute("SELECT id FROM conversation ORDER BY started_at, person_id, id")]
    if limit is not None:
        ids = ids[:limit]
    return {cid: process_conversation(conn, cid, mode, client) for cid in ids}
