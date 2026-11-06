"""Terminal chat with the adaptive check-in assistant.

uv run python -m src.checkin.interactive --person Rosa [--db PATH] [--offline] [--script "resp1|resp2|..."]
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from src.db.catalog import seed_catalog
from src.db.connection import connect, init_db
from src.db.synthetic import seed_synthetic

from .dialogue import DialogueSession, JevTurnClassifier, KeywordFakeClassifier
from .dialogue_tree import TREE
from .extractor_jev import JevError, get_client
from .simulate import LABEL, _value, render_table


def _clock() -> datetime:
    return datetime.now().astimezone()


def summary(conn, session: DialogueSession) -> str:
    cid = session.conversation_id
    out = ["", "=== Resultado de la llamada ===", f"Estado: {session.status} · urgente: {'sí' if session.urgent else 'no'}"]
    obs = conn.execute("SELECT * FROM observation WHERE conversation_id=? ORDER BY id", (cid,)).fetchall()
    out.append("Observaciones")
    out.append(render_table(["Indicador", "Valor/estado", "Fuente", "Confianza", "Cita"],
                            [[o["indicator_code"], _value(o), o["source"],
                              "-" if o["confidence"] is None else f"{o['confidence']:.2f}", o["evidence_quote"] or ""]
                             for o in obs]) if obs else "   sin observaciones de salud")
    if session.turn_log:
        out.append("\nClasificación por turno")
        out.append(render_table(["Indicador", "Estado", "Confianza", "Latencia ms", "Re-pregunta"],
                                [[t["code"], t["state"], "-" if t["confidence"] is None else f"{t['confidence']:.2f}",
                                  t["latency_ms"], "sí" if t["retry"] else "no"] for t in session.turn_log]))
    a = conn.execute("SELECT * FROM assessment WHERE conversation_id=?", (cid,)).fetchone()
    reasons = json.loads(a["reasons"])
    out.append(f"\nEvaluación: nivel {LABEL[a['level']]} · {reasons[0]['rule_code']}")
    out.append(f"   Motivo: {reasons[0]['explanation']}")
    alerts = conn.execute("SELECT * FROM alert WHERE person_id=? AND created_at=? ORDER BY id",
                          (session.person["id"], session.started_at)).fetchall()
    out.append("\nAlertas de esta llamada")
    out.append(render_table(["Alerta", "Nivel", "Origen", "Regla", "Estado"],
                            [[x["id"], x["level"], x["origin"], x["rule_code"], x["status"]] for x in alerts])
               if alerts else "   ninguna")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m src.checkin.interactive", description=__doc__)
    p.add_argument("--person", required=True)
    p.add_argument("--db", default="data/processed/faro.db")
    p.add_argument("--offline", action="store_true", help="keyword classifier instead of Jev (no network)")
    p.add_argument("--script", help="answers separated by '|' (non-interactive)")
    a = p.parse_args(argv)
    conn = connect(Path(a.db))
    try:
        init_db(conn)
        seed_catalog(conn)
        if conn.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 0:
            seed_synthetic(conn)
        person = conn.execute("SELECT * FROM person WHERE lower(preferred_name)=lower(?)", (a.person,)).fetchone()
        if person is None:
            names = ", ".join(r[0] for r in conn.execute("SELECT preferred_name FROM person"))
            print(f"Persona desconocida: {a.person}. Disponibles: {names}")
            return 2
        if a.offline:
            classifier = KeywordFakeClassifier()
        else:
            try:
                classifier = JevTurnClassifier(get_client())
            except JevError as e:
                print(f"Error: {e}")
                return 2
        session = DialogueSession(person, TREE, classifier, _clock, conn=conn)
        answers = iter(a.script.split("|")) if a.script is not None else None
        print(f"Asistente: {session.start()}")
        while not session.done:
            try:
                text = next(answers) if answers is not None else input("Persona: ")
            except (StopIteration, EOFError):
                session.abandon()
                print("(llamada terminada sin cierre)")
                break
            if answers is not None:
                print(f"Persona: {text}")
            for line in session.reply(text).utterances:
                print(f"Asistente: {line}")
        print(summary(conn, session))
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
