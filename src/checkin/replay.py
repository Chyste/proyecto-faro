"""Replay mode: loads annotated indicator values as observations (source='reproduccion').

IMPORTANT: this stands in for the LLM extractor in the demo. The values come from
`scenario_expectation`, i.e. what an ideal extractor should produce from the transcript.
"""
from __future__ import annotations

import sqlite3

VALID_STATUS = ("completada", "parcial")


def _convert(value_type: str, expected: str | None) -> tuple[float | None, str | None]:
    if expected is None:
        return None, None
    if value_type == "bool":
        return (1.0 if expected == "true" else 0.0), None
    return None, expected  # category text, or list as JSON text


def load_replay_observations(conn: sqlite3.Connection, conversation_id: int) -> list[int]:
    """Insert missing replay observations for a conversation; returns the new observation ids."""
    conv = conn.execute("SELECT * FROM conversation WHERE id=?", (conversation_id,)).fetchone()
    if conv["status"] not in VALID_STATUS:
        return []
    rows = conn.execute(
        "SELECT e.indicator_code, e.expected_value, e.note, i.value_type FROM scenario_expectation e"
        " JOIN indicator i ON i.code = e.indicator_code WHERE e.conversation_id=? ORDER BY e.id",
        (conversation_id,)).fetchall()
    ruled = {r[0] for r in conn.execute(
        "SELECT indicator_code FROM observation WHERE conversation_id=? AND source IN ('regla','reproduccion')",
        (conversation_id,))}
    created = []
    for r in rows:
        if r["indicator_code"] in ruled:
            continue
        if r["expected_value"] is None:
            state, num, text = (r["note"] or "no_preguntado"), None, None
        else:
            state = "informado"
            num, text = _convert(r["value_type"], r["expected_value"])
        created.append(conn.execute(
            "INSERT INTO observation (person_id, conversation_id, indicator_code, value_num, value_text, state,"
            " confidence, source, observed_at) VALUES (?, ?, ?, ?, ?, ?, 1.0, 'reproduccion', ?)",
            (conv["person_id"], conversation_id, r["indicator_code"], num, text, state, conv["started_at"])).lastrowid)
    conn.commit()
    return created
