import json

import pytest

from src.checkin.replay import load_replay_observations
from src.checkin.urgent import run_urgent
from tests.checkin_helpers import build_db, conv_id


@pytest.fixture()
def conn():
    c = build_db()
    yield c
    c.close()


def row(conn, cid, code):
    return conn.execute("SELECT * FROM observation WHERE conversation_id=? AND indicator_code=?", (cid, code)).fetchone()


def test_types_mapped(conn):
    cid = conv_id(conn, "Rosa", 9)
    load_replay_observations(conn, cid)
    assert row(conn, cid, "contacto_social_24h")["value_num"] == 0
    assert row(conn, cid, "apoyo_disponible")["value_num"] == 1
    assert row(conn, cid, "soledad_percibida")["value_text"] == "a_veces"
    assert json.loads(row(conn, cid, "barrera_tratamiento")["value_text"]) == ["acceso"]
    assert row(conn, cid, "soledad_percibida")["source"] == "reproduccion"


def test_null_reason_states_keep_null(conn):
    cid = conv_id(conn, "Rosa", 4)
    load_replay_observations(conn, cid)
    r = row(conn, cid, "animo_reportado")
    assert r["state"] == "prefiere_no_responder" and r["value_num"] is None and r["value_text"] is None
    cid3 = conv_id(conn, "Teresa", 3)
    load_replay_observations(conn, cid3)
    assert row(conn, cid3, "cambio_autonomia")["state"] == "no_sabe"


def test_idempotent_and_skips_urgent_rule_indicators(conn):
    cid = conv_id(conn, "Teresa", 11)
    run_urgent(conn, cid)
    load_replay_observations(conn, cid)
    n = conn.execute("SELECT COUNT(*) FROM observation").fetchone()[0]
    load_replay_observations(conn, cid)
    assert conn.execute("SELECT COUNT(*) FROM observation").fetchone()[0] == n
    assert row(conn, cid, "necesita_ayuda_inmediata")["source"] == "regla"
    assert conn.execute("SELECT COUNT(*) FROM observation WHERE conversation_id=? AND indicator_code='necesita_ayuda_inmediata'",
                        (cid,)).fetchone()[0] == 1


def test_failed_calls_have_no_observations(conn):
    cid = conv_id(conn, "Miguel", 10)
    assert load_replay_observations(conn, cid) == []
