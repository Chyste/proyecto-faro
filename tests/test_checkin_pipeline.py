import json

import pytest

from src.checkin.pipeline import process_all, process_conversation
from tests.checkin_helpers import build_db, conv_id


@pytest.fixture(scope="module")
def conn():
    c = build_db()
    process_all(c)
    yield c
    c.close()


def test_all_70_levels_match_expectation(conn):
    rows = conn.execute(
        "SELECT p.preferred_name n, c.started_at d, e.expected_level exp, a.level got"
        " FROM conversation c JOIN person p ON p.id=c.person_id"
        " JOIN scenario_expectation e ON e.conversation_id=c.id AND e.indicator_code IS NULL"
        " JOIN assessment a ON a.conversation_id=c.id").fetchall()
    assert len(rows) == 70
    bad = [(r["n"], r["d"], r["exp"], r["got"]) for r in rows if r["exp"] != r["got"]]
    assert bad == []


def test_teresa_day_11_urgent_alert_evidence_from_rules(conn):
    cid = conv_id(conn, "Teresa", 11)
    a = conn.execute("SELECT a.id FROM alert a JOIN person p ON p.id=a.person_id"
                     " WHERE p.preferred_name='Teresa' AND a.origin='regla_urgente'").fetchall()
    assert len(a) == 1
    srcs = conn.execute("SELECT o.source, o.conversation_id FROM alert_evidence ae JOIN observation o ON o.id=ae.observation_id"
                        " WHERE ae.alert_id=?", (a[0]["id"],)).fetchall()
    assert srcs and all(s["source"] == "regla" and s["conversation_id"] == cid for s in srcs)


def test_miguel_failed_calls_have_no_health_observations_and_contact_alert(conn):
    for day in (10, 11):
        cid = conv_id(conn, "Miguel", day)
        assert conn.execute("SELECT COUNT(*) FROM observation WHERE conversation_id=?", (cid,)).fetchone()[0] == 0
        assert conn.execute("SELECT level FROM assessment WHERE conversation_id=?", (cid,)).fetchone()[0] is None
    al = conn.execute("SELECT * FROM alert a JOIN person p ON p.id=a.person_id WHERE p.preferred_name='Miguel'"
                      " AND origin='situacion_contacto'").fetchall()
    assert len(al) == 1 and al[0]["rule_code"] == "C1_SIN_CONTACTO" and al[0]["level"] == 1


def test_assessment_json_columns(conn):
    r = conn.execute("SELECT * FROM assessment WHERE conversation_id=?", (conv_id(conn, "Rosa", 9),)).fetchone()
    dims = json.loads(r["dimension_levels"])
    assert dims["aislamiento"] >= 1 and dims["medicacion"] == 1 and r["rule_version"] == "demo-v1"
    assert json.loads(r["reasons"])


def test_rerun_creates_no_duplicates(conn):
    before = [conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
              for t in ("alert", "alert_evidence", "observation", "assessment")]
    process_all(conn)
    after = [conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
             for t in ("alert", "alert_evidence", "observation", "assessment")]
    assert before == after


def test_one_open_alert_per_person_and_level_and_origin(conn):
    dup = conn.execute("SELECT person_id, level, origin, COUNT(*) c FROM alert WHERE status!='cerrada'"
                       " GROUP BY 1,2,3 HAVING c>1").fetchall()
    assert dup == []


def test_process_conversation_returns_step_log():
    c = build_db()
    log = process_conversation(c, conv_id(c, "Rosa", 1))
    assert [s["step"] for s in log][0] == "urgent"
    assert any(s["step"] == "assessment" for s in log)
