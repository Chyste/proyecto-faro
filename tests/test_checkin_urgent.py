import pytest

from src.checkin.urgent import detect_urgent, run_urgent
from tests.checkin_helpers import build_db, conv_id


@pytest.fixture()
def conn():
    c = build_db()
    yield c
    c.close()


def events(text):
    return {h.event for h in detect_urgent(text)}


def test_positive_help_now():
    assert "necesita_ayuda_inmediata" in events("Me caí, me lesioné y necesito ayuda ahora, por favor.")
    assert "necesita_ayuda_inmediata" in events("¡Ayúdeme, por favor!")
    assert "necesita_ayuda_inmediata" in events("Auxilio")


def test_positive_fall_with_injury_same_text():
    assert "caida_con_lesion" in events("Me caí y no me puedo levantar")


def test_positive_acute_symptom():
    assert "sintoma_agudo" in events("Tengo un dolor fuerte en el pecho")
    assert "sintoma_agudo" in events("No puedo respirar bien")


@pytest.mark.parametrize("text", [
    "No, ahora no.", "No, ahora no, gracias.", "no necesito ayuda", "No, no me he caído.",
    "No, gracias a Dios, no me he caído.", "No, no me lesioné.", "Sí, me caí en la casa.",
    "No, nada de eso.",
])
def test_negatives(text):
    assert detect_urgent(text) == []


def test_run_urgent_teresa_day_11_writes_rule_observations_and_alert(conn):
    cid = conv_id(conn, "Teresa", 11)
    res = run_urgent(conn, cid)
    assert res["hits"]
    obs = conn.execute("SELECT indicator_code, source, evidence_quote, value_num FROM observation"
                       " WHERE conversation_id=?", (cid,)).fetchall()
    assert {o["indicator_code"] for o in obs} >= {"necesita_ayuda_inmediata", "caida_reportada", "lesion_reportada"}
    assert all(o["source"] == "regla" and o["evidence_quote"] and o["value_num"] == 1 for o in obs)
    alert = conn.execute("SELECT * FROM alert").fetchone()
    assert (alert["level"], alert["origin"], alert["rule_code"]) == (3, "regla_urgente", "R3_AYUDA_INMEDIATA")
    assert alert["due_at"] == alert["created_at"]
    assert conn.execute("SELECT COUNT(*) FROM alert_evidence").fetchone()[0] == len(obs)


def test_run_urgent_is_idempotent(conn):
    cid = conv_id(conn, "Teresa", 11)
    run_urgent(conn, cid)
    run_urgent(conn, cid)
    assert conn.execute("SELECT COUNT(*) FROM alert").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM observation").fetchone()[0] == 3


def test_run_urgent_quiet_conversation_has_no_events(conn):
    res = run_urgent(conn, conv_id(conn, "Rosa", 11))
    assert res["hits"] == [] and res["alert_id"] is None
    assert conn.execute("SELECT COUNT(*) FROM observation").fetchone()[0] == 0
