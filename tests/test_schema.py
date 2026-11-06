import sqlite3

import pytest

from src.db.connection import connect, init_db

TABLES = {
    "dimension", "indicator", "staff_user", "person", "person_identity",
    "person_medication", "trusted_contact", "consent_record", "conversation",
    "message", "extraction", "observation", "cusum_state", "assessment",
    "scenario_expectation", "alert", "alert_evidence", "intervention",
}


@pytest.fixture
def conn():
    c = connect(":memory:")
    init_db(c)
    yield c
    c.close()


def _names(conn, kind):
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type=?", (kind,))
    return {r["name"] for r in rows}


def test_all_tables_and_view_exist(conn):
    assert TABLES <= _names(conn, "table")
    assert "person_current_level" in _names(conn, "view")


def test_init_db_is_idempotent(conn):
    init_db(conn)
    assert TABLES <= _names(conn, "table")


def test_foreign_keys_enforced(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO message (conversation_id, turn, role, text) VALUES (999, 1, 'asistente', 'hola')"
        )


def _person(conn, pid=1):
    conn.execute("INSERT INTO person (id, preferred_name) VALUES (?, 'Test')", (pid,))


def _alert(conn, pid, level, status="abierta"):
    conn.execute(
        "INSERT INTO alert (person_id, level, origin, rule_code, explanation, status, created_at)"
        " VALUES (?, ?, 'cusum', 'r', 'e', ?, '2026-01-01')",
        (pid, level, status),
    )


def _assessment(conn, pid, level, at):
    conn.execute(
        "INSERT INTO assessment (person_id, evaluated_at, level, dimension_levels, reasons, rule_version)"
        " VALUES (?, ?, ?, '{}', '[]', 'v1')",
        (pid, at, level),
    )


def _indicator(conn, vtype="bool"):
    conn.execute("INSERT INTO dimension VALUES ('d', 'D')")
    allowed = None if vtype == "bool" else '["a","b"]'
    conn.execute("INSERT INTO indicator VALUES ('i', 'd', ?, ?, 'x', 0)", (vtype, allowed))


def test_alert_level_check(conn):
    _person(conn)
    with pytest.raises(sqlite3.IntegrityError):
        _alert(conn, 1, 4)


def test_alert_origin_renamed(conn):
    _person(conn)
    conn.execute(
        "INSERT INTO alert (person_id, level, origin, rule_code, explanation, created_at)"
        " VALUES (1, 1, 'situacion_contacto', 'r', 'e', '2026-01-01')"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO alert (person_id, level, origin, rule_code, explanation, created_at)"
            " VALUES (1, 1, 'no_respuesta', 'r', 'e', '2026-01-01')"
        )


def test_indicator_value_type_check(conn):
    conn.execute("INSERT INTO dimension VALUES ('d', 'D')")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO indicator VALUES ('i', 'd', 'score_0_2', NULL, 'x', 0)")


def test_observation_state_check(conn):
    _person(conn)
    _indicator(conn)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO observation (person_id, indicator_code, state, source, observed_at)"
            " VALUES (1, 'i', 'bogus', 'ia', '2026-01-01')"
        )


def test_observation_null_states_accepted_without_value(conn):
    _person(conn)
    _indicator(conn)
    for state in ("no_preguntado", "no_sabe", "prefiere_no_responder", "no_comprendido", "pendiente_confirmar"):
        conn.execute(
            "INSERT INTO observation (person_id, indicator_code, state, source, observed_at)"
            " VALUES (1, 'i', ?, 'reproduccion', '2026-01-01')",
            (state,),
        )


@pytest.mark.parametrize("col", ["value_num", "value_text"])
def test_non_informado_observation_with_value_rejected(conn, col):
    _person(conn)
    _indicator(conn)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            f"INSERT INTO observation (person_id, indicator_code, state, {col}, source, observed_at)"
            " VALUES (1, 'i', 'no_sabe', 1, 'ia', '2026-01-01')"
        )


def test_conversation_status_check(conn):
    _person(conn)
    for status in ("completada", "parcial", "sin_respuesta", "rechazada", "fallo_tecnico"):
        conn.execute(
            "INSERT INTO conversation (person_id, channel, started_at, status) VALUES (1, 'simulado', 'x', ?)",
            (status,),
        )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO conversation (person_id, channel, started_at, status) VALUES (1, 'simulado', 'x', 'fallida')"
        )


def test_urgent_event_requires_quote(conn):
    _person(conn)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO conversation (person_id, channel, started_at, status, urgent_event_type)"
            " VALUES (1, 'simulado', 'x', 'completada', 'caida_con_lesion')"
        )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO conversation (person_id, channel, started_at, status, urgent_event_type, urgent_event_quote)"
            " VALUES (1, 'simulado', 'x', 'completada', 'otro', 'frase')"
        )
    conn.execute(
        "INSERT INTO conversation (person_id, channel, started_at, status, urgent_event_type, urgent_event_quote)"
        " VALUES (1, 'simulado', 'x', 'completada', 'caida_con_lesion', 'Me caí')"
    )


def test_assessment_level_range(conn):
    _person(conn)
    _assessment(conn, 1, None, "2026-01-01")
    _assessment(conn, 1, 3, "2026-01-02")
    with pytest.raises(sqlite3.IntegrityError):
        _assessment(conn, 1, 4, "2026-01-03")


def test_person_sexo_check(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO person (preferred_name, sexo_modelo) VALUES ('x', 'otro')")


def test_scenario_expectation_one_level_row_per_conversation(conn):
    _person(conn)
    conn.execute("INSERT INTO conversation (id, person_id, channel, started_at, status)"
                 " VALUES (1, 1, 'simulado', 'x', 'completada')")
    conn.execute("INSERT INTO scenario_expectation (conversation_id, expected_level) VALUES (1, 0)")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO scenario_expectation (conversation_id, expected_level) VALUES (1, 1)")


def _levels(conn):
    return {r["person_id"]: r for r in conn.execute("SELECT * FROM person_current_level")}


def test_view_null_level_without_data(conn):
    _person(conn)
    row = _levels(conn)[1]
    assert row["level"] is None and row["assessed_level"] is None and row["open_alert_level"] is None


def test_view_uses_latest_assessment(conn):
    _person(conn)
    _assessment(conn, 1, 2, "2026-01-01")
    _assessment(conn, 1, 1, "2026-01-05")
    row = _levels(conn)[1]
    assert row["level"] == 1 and row["assessed_at"] == "2026-01-05"


def test_view_open_level3_alert_overrides_assessment(conn):
    _person(conn)
    _assessment(conn, 1, 0, "2026-01-05")
    _alert(conn, 1, 3)
    assert _levels(conn)[1]["level"] == 3


def test_view_lower_open_alert_does_not_override_assessment(conn):
    _person(conn)
    _assessment(conn, 1, 0, "2026-01-05")
    _alert(conn, 1, 2)
    assert _levels(conn)[1]["level"] == 0


def test_view_alert_level_when_no_assessment(conn):
    _person(conn)
    _alert(conn, 1, 1)
    _alert(conn, 1, 2, status="en_revision")
    assert _levels(conn)[1]["level"] == 2


def test_view_closed_alerts_ignored(conn):
    _person(conn)
    _alert(conn, 1, 3, status="cerrada")
    row = _levels(conn)[1]
    assert row["level"] is None and row["open_alert_level"] is None
