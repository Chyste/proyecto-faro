"""Step-by-step simulation trace, accuracy report and OAM inbox (plain-text tables)."""
from __future__ import annotations

import json
import sqlite3

from .pipeline import process_all, process_conversation

LABEL = {None: "sin evaluar", 0: "0 Habitual", 1: "1 Preventiva", 2: "2 Prioritaria", 3: "3 Urgente"}
DIM_ES = {"aislamiento": "Aislamiento social", "funcional": "Deterioro funcional", "medicacion": "Medicamentos y tratamientos",
          "emocional_cognitiva": "Salud emocional y cognitiva", "seguridad": "Seguridad y emergencias"}


def render_table(headers: list[str], rows: list[list]) -> str:
    cells = [[str(c) for c in r] for r in rows]
    widths = [max(len(h), *(len(r[i]) for r in cells)) if cells else len(h) for i, h in enumerate(headers)]
    fmt = lambda r: "  ".join(c.ljust(w) for c, w in zip(r, widths)).rstrip()
    return "\n".join([fmt(headers), "  ".join("-" * w for w in widths), *(fmt(r) for r in cells)])


def _lv(level) -> str:
    return LABEL[level]


def _value(row) -> str:
    if row["state"] != "informado":
        return f"({row['state']})"
    if row["value_text"] is not None:
        return row["value_text"]
    return "sí" if row["value_num"] else "no"


def _expected(conn, cid) -> int | None:
    return conn.execute("SELECT expected_level FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NULL",
                        (cid,)).fetchone()[0]


def trace(conn: sqlite3.Connection, cid: int, log: list[dict]) -> str:
    conv = conn.execute("SELECT c.*, p.preferred_name FROM conversation c JOIN person p ON p.id=c.person_id WHERE c.id=?",
                        (cid,)).fetchone()
    msgs = conn.execute("SELECT role, text FROM message WHERE conversation_id=? ORDER BY turn", (cid,)).fetchall()
    steps = {s["step"]: s for s in log}
    out = [f"=== {conv['preferred_name']} · {conv['started_at'][:10]} (conversación {cid}) ===",
           "1) Conversación",
           render_table(["Fecha", "Estado", "Mensajes"], [[conv["started_at"][:16], conv["status"], len(msgs)]])]
    for m in msgs:
        out.append(f"   {'Persona' if m['role'] == 'persona' else 'Asistente'}: {m['text']}")
    out.append("2) Ruta urgente (reglas, sin LLM)")
    hits = steps["urgent"]["hits"]
    out.append(render_table(["Evento", "Regla", "Origen", "Cita"],
                            [[h.event, h.rule_code, h.source, h.evidence[0][1]] for h in hits])
               if hits else "   sin eventos urgentes")
    jev = steps.get("jev")
    obs = conn.execute("SELECT * FROM observation WHERE conversation_id=? ORDER BY id", (cid,)).fetchall()
    if jev:
        out.append(f"3) Extracción Jev ({jev['tokens']} tokens, {jev['latency_ms']} ms; probabilidad/confianza por campo)")
        det = jev["details"]
        out.append(render_table(["Indicador", "Valor/estado", "Fuente", "Jev", "Cita"],
                                [[o["indicator_code"], _value(o), o["source"], det.get(o["indicator_code"], ""),
                                  o["evidence_quote"] or ""] for o in obs]) if obs else "   sin observaciones de salud")
        if jev["flags"]:
            out.append("   Red de seguridad IA: " + ", ".join(f"{e} p={p:.2f}" for e, p in jev["flags"]))
    else:
        fb = steps["replay"].get("fallback")
        out.append("3) Observaciones registradas (" + ("FALLBACK a reproducción: Jev no disponible"
                                                       if fb else "modo reproducción: sustituye al extractor LLM") + ")")
        out.append(render_table(["Indicador", "Valor/estado", "Fuente", "Cita"],
                                [[o["indicator_code"], _value(o), o["source"], o["evidence_quote"] or ""] for o in obs])
                   if obs else "   sin observaciones de salud")
    a = steps["assessment"]
    out.append("4) Evaluación por dimensión")
    rows = []
    for d, name in DIM_ES.items():
        rs = [r for r in a["reasons"] if r["dimension_code"] == d]
        lvl = a["dimension_levels"].get(d)
        rows.append([name, "-" if lvl is None else lvl, ", ".join(r["rule_code"] for r in rs) or "-",
                     ", ".join(str(i) for r in rs for i in r["observation_ids"]) or "-"])
    out.append(render_table(["Dimensión", "Nivel", "Regla", "Obs. (ids)"], rows))
    top = a["reasons"][0]
    out.append(f"5) Nivel general: {_lv(a['level'])} · {top['rule_code']}\n   Motivo: {top['explanation']}")
    out.append("6) Alertas creadas/actualizadas")
    al = steps["alerts"]["alerts"]
    out.append(render_table(["Acción", "Alerta", "Nivel", "Origen", "Regla"],
                            [[x["action"], x["alert_id"], x["level"], x["origin"], x["rule_code"]] for x in al])
               if al else "   ninguna")
    exp = _expected(conn, cid)
    out.append("7) Esperado vs obtenido\n" + render_table(
        ["Esperado", "Obtenido", "Resultado"], [[_lv(exp), _lv(a["level"]), "OK" if exp == a["level"] else "DIFIERE"]]))
    return "\n".join(out)


def _accuracy(conn) -> tuple[str, list[list]]:
    rows = conn.execute(
        "SELECT p.preferred_name n, e.expected_level exp, a.level got FROM conversation c"
        " JOIN person p ON p.id=c.person_id"
        " JOIN scenario_expectation e ON e.conversation_id=c.id AND e.indicator_code IS NULL"
        " JOIN assessment a ON a.conversation_id=c.id ORDER BY p.id, c.started_at").fetchall()
    per: dict[str, list[int]] = {}
    for r in rows:
        s = per.setdefault(r["n"], [0, 0])
        s[1] += 1
        s[0] += r["exp"] == r["got"]
    table = [[n, f"{ok}/{tot}"] for n, (ok, tot) in per.items()]
    total_ok = sum(v[0] for v in per.values())
    total = sum(v[1] for v in per.values())
    table.append(["TOTAL", f"{total_ok}/{total}"])
    conf: dict[tuple, int] = {}
    for r in rows:
        conf[(r["exp"], r["got"])] = conf.get((r["exp"], r["got"]), 0) + 1
    cols = [None, 0, 1, 2, 3]
    matrix = [[_lv(e)] + [conf.get((e, g), 0) for g in cols] for e in cols]
    return f"Aciertos totales: {total_ok}/{total}", [table, matrix]


def bandeja(conn) -> str:
    rows = conn.execute("SELECT * FROM person_current_level").fetchall()
    out = []
    for r in rows:
        alerts = conn.execute("SELECT level, rule_code, origin FROM alert WHERE person_id=? AND status!='cerrada'"
                              " ORDER BY level DESC, id", (r["person_id"],)).fetchall()
        top = alerts[0] if alerts else None
        out.append([r["preferred_name"], _lv(r["level"]), _lv(r["assessed_level"]), (r["assessed_at"] or "")[:10],
                    len(alerts), f"{top['rule_code']} ({top['origin']})" if top else "-"])
    out.sort(key=lambda x: (-(int(x[1][0]) if x[1][0].isdigit() else -1), x[0]))
    return render_table(["Persona", "Nivel actual", "Última evaluación", "Fecha", "Alertas abiertas", "Alerta principal"], out)


def run_simulation(conn: sqlite3.Connection, person: str | None = None, day: int | None = None,
                   mode: str = "reproduccion", client=None, limit: int | None = None) -> str:
    """Process conversations; return a trace (selected person/day) or compact summary, plus final reports."""
    logs = process_all(conn, mode, client, limit)
    convs = [c for c in conn.execute("SELECT c.id, p.preferred_name n FROM conversation c JOIN person p ON p.id=c.person_id"
                                     " ORDER BY p.id, c.started_at, c.id").fetchall() if c["id"] in logs]
    per_person: dict[str, list[int]] = {}
    for c in convs:
        per_person.setdefault(c["n"], []).append(c["id"])
    out: list[str] = []
    if person:
        ids = per_person.get(person) or per_person.get(person.capitalize())
        if not ids:
            raise SystemExit(f"Persona desconocida: {person}. Disponibles: {', '.join(per_person)}")
        if day is not None:
            if not 1 <= day <= len(ids):
                raise SystemExit(f"Día fuera de rango (1-{len(ids)})")
            ids = [ids[day - 1]]
        out += [trace(conn, cid, logs[cid]) + "\n" for cid in ids]
    else:
        rows = []
        for n, ids in per_person.items():
            for i, cid in enumerate(ids, 1):
                a = next(s for s in logs[cid] if s["step"] == "assessment")
                exp = _expected(conn, cid)
                rows.append([n, i, conn.execute("SELECT status FROM conversation WHERE id=?", (cid,)).fetchone()[0],
                             _lv(exp), _lv(a["level"]), a["reasons"][0]["rule_code"], "OK" if exp == a["level"] else "DIFIERE"])
        out.append("Resumen de las conversaciones procesadas\n" + render_table(
            ["Persona", "Día", "Estado", "Esperado", "Obtenido", "Regla", "Resultado"], rows) + "\n")
    line, (acc, matrix) = _accuracy(conn)
    out.append(line + "\n" + render_table(["Persona", "Aciertos"], acc))
    out.append("\nMatriz de confusión (filas: esperado, columnas: obtenido)\n" + render_table(
        ["Esperado \\ Obtenido", "sin evaluar", "0", "1", "2", "3"], matrix))
    out.append("\nBandeja OAM (personas por nivel actual y alertas abiertas)\n" + bandeja(conn))
    if mode == "jev":
        from .evaluate import evaluation_report
        out.append("\n" + evaluation_report(conn))
    return "\n".join(out)
