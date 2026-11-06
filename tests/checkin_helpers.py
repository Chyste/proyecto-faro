"""Shared builders for check-in tests."""
from src.db.catalog import seed_catalog
from src.db.connection import connect, init_db
from src.db.synthetic import seed_synthetic


def build_db():
    conn = connect(":memory:")
    init_db(conn)
    seed_catalog(conn)
    seed_synthetic(conn)
    return conn


def conv_id(conn, name, day):
    return conn.execute(
        "SELECT c.id FROM conversation c JOIN person p ON p.id=c.person_id WHERE p.preferred_name=?"
        " ORDER BY c.started_at, c.id LIMIT 1 OFFSET ?", (name, day - 1)).fetchone()[0]
