import sqlite3

import pytest

from src.db.connection import connect, init_db

TABLES = {
    "dimension", "indicator", "staff_user", "person", "person_identity",
    "trusted_contact", "consent_record", "conversation", "message",
    "extraction", "observation", "cusum_state", "alert", "alert_evidence",
    "intervention",
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


def test_alert_level_check(conn):
    _person(conn)
    with pytest.raises(sqlite3.IntegrityError):
        _alert(conn, 1, 4)


def test_observation_state_check(conn):
    _person(conn)
    conn.execute("INSERT INTO dimension VALUES ('d', 'D')")
    conn.execute("INSERT INTO indicator VALUES ('i', 'd', 'bool', 'x', 0)")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO observation (person_id, indicator_code, state, source, observed_at)"
            " VALUES (1, 'i', 'bogus', 'ia', '2026-01-01')"
        )


def test_person_current_level(conn):
    _person(conn, 1)
    _person(conn, 2)
    _alert(conn, 2, 1)
    _alert(conn, 2, 3)
    _alert(conn, 1, 3, status="cerrada")
    levels = {r["person_id"]: r["level"] for r in conn.execute("SELECT * FROM person_current_level")}
    assert levels == {1: 0, 2: 3}
