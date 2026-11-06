"""Evaluation of the Jev extraction against scenario_expectation (what an ideal extractor produces)."""
from __future__ import annotations

import json
import sqlite3

from .extractor_jev import PROMPT_VERSION
from .simulate import LABEL, render_table

_LEVELS = [None, 0, 1, 2, 3]


def _norm_expected(vtype: str, value: str):
    if vtype == "list":
        return frozenset(json.loads(value))
    return value


def _norm_obtained(vtype: str, row):
    if vtype == "bool":
        return "true" if row["value_num"] else "false"
    if vtype == "list":
        return frozenset(json.loads(row["value_text"]))
    return row["value_text"]


def _field_outcome(exp_row, obs) -> str:
    """'correct' | 'revision' (derivado a revisión) | 'wrong'."""
    if exp_row["expected_value"] is None:
        want = exp_row["note"] or "no_preguntado"
        got = obs["state"] if obs else "no_preguntado"
        return "correct" if got == want else "wrong"
    if obs is None:
        return "wrong"
    if obs["state"] == "pendiente_confirmar":
        return "revision"
    if obs["state"] != "informado":
        return "wrong"
    ok = _norm_obtained(exp_row["value_type"], obs) == _norm_expected(exp_row["value_type"], exp_row["expected_value"])
    return "correct" if ok else "wrong"


def evaluate_jev(conn: sqlite3.Connection) -> dict:
    ext = conn.execute("SELECT * FROM extraction WHERE prompt_version=? ORDER BY conversation_id", (PROMPT_VERSION,)).fetchall()
    live = [e for e in ext if e["model"] != "fallback"]
    fallbacks = len(ext) - len(live)
    by: dict[str, dict] = {}
    for e in live:
        cid = e["conversation_id"]
        obs = {o["indicator_code"]: o for o in conn.execute(
            "SELECT * FROM observation WHERE conversation_id=? AND source IN ('ia','regla') ORDER BY id DESC", (cid,))}
        rows = conn.execute(
            "SELECT s.indicator_code, s.expected_value, s.note, i.value_type FROM scenario_expectation s"
            " JOIN indicator i ON i.code=s.indicator_code WHERE s.conversation_id=?", (cid,)).fetchall()
        for r in rows:
            d = by.setdefault(r["indicator_code"], {"n": 0, "correct": 0, "revision": 0, "wrong": 0})
            d["n"] += 1
            d[_field_outcome(r, obs.get(r["indicator_code"]))] += 1
    total = {k: sum(d[k] for d in by.values()) for k in ("n", "correct", "revision", "wrong")}

    conf: dict[tuple, int] = {}
    false_reds = missed_reds = ok = n = 0
    for e in live:
        r = conn.execute(
            "SELECT s.expected_level exp, a.level got FROM scenario_expectation s"
            " JOIN assessment a ON a.conversation_id=s.conversation_id"
            " WHERE s.conversation_id=? AND s.indicator_code IS NULL", (e["conversation_id"],)).fetchone()
        if not r:
            continue
        n += 1
        ok += r["exp"] == r["got"]
        conf[(r["exp"], r["got"])] = conf.get((r["exp"], r["got"]), 0) + 1
        false_reds += r["got"] == 3 and r["exp"] != 3
        missed_reds += r["exp"] == 3 and r["got"] != 3
    tokens, lat = 0, []
    for e in live:
        raw = json.loads(e["raw_json"])
        u = raw.get("response", {}).get("usage", {})
        tokens += int(u.get("input_tokens", 0)) + int(u.get("output_tokens", 0))
        lat.append(raw.get("latency_ms", 0))
    return {"conversations": len(live), "fallbacks": fallbacks, "fields": {"total": total, "by_indicator": by},
            "levels": {"n": n, "ok": ok, "confusion": conf}, "false_reds": false_reds, "missed_reds": missed_reds,
            "tokens": tokens, "latency_ms_avg": (sum(lat) / len(lat)) if lat else 0}


def _pct(a, b) -> str:
    return f"{100 * a / b:.0f}%" if b else "-"


def evaluation_report(conn: sqlite3.Connection) -> str:
    ev = evaluate_jev(conn)
    f, lv = ev["fields"], ev["levels"]
    rows = [[c, d["n"], d["correct"], d["revision"], d["wrong"], _pct(d["correct"], d["n"]),
             _pct(d["correct"], d["n"] - d["revision"])] for c, d in sorted(f["by_indicator"].items())]
    t = f["total"]
    rows.append(["TOTAL", t["n"], t["correct"], t["revision"], t["wrong"], _pct(t["correct"], t["n"]),
                 _pct(t["correct"], t["n"] - t["revision"])])
    cols = _LEVELS
    matrix = [[LABEL[e]] + [lv["confusion"].get((e, g), 0) for g in cols] for e in cols]
    out = [f"Evaluación Jev ({ev['conversations']} conversaciones con Jev, {ev['fallbacks']} con fallback a reproducción)",
           "\nPrecisión por campo (correcto / derivado a revisión / incorrecto; 'sobre decididos' excluye la revisión)",
           render_table(["Indicador", "N", "Correcto", "A revisión", "Incorrecto", "Precisión", "Sobre decididos"], rows),
           f"\nPrecisión de nivel: {lv['ok']}/{lv['n']}",
           "\nMatriz de confusión de nivel (filas: esperado, columnas: obtenido)",
           render_table(["Esperado \\ Obtenido", "sin evaluar", "0", "1", "2", "3"], matrix),
           f"\nFalsos rojos (obtenido 3, esperado otro): {ev['false_reds']}",
           f"Rojos perdidos (esperado 3, obtenido otro): {ev['missed_reds']}",
           f"Tokens Jev usados (entrada+salida): {ev['tokens']}",
           f"Latencia media por conversación: {ev['latency_ms_avg']:.0f} ms"]
    return "\n".join(out)
