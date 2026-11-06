"""Demo database builder: schema + catalog + synthetic people + processed conversations (assessments, alerts)."""
from __future__ import annotations

import sqlite3
from pathlib import Path

from src.checkin.pipeline import process_all

from .catalog import seed_catalog
from .connection import connect, init_db
from .synthetic import seed_synthetic


def populate(conn: sqlite3.Connection, mode: str = "reproduccion", client=None) -> int:
    """Create everything on an open (empty) connection; returns the number of processed conversations."""
    init_db(conn)
    seed_catalog(conn)
    if conn.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 0:
        seed_synthetic(conn)
    return len(process_all(conn, mode, client))


def rebuild(path: str | Path, mode: str = "reproduccion", client=None) -> sqlite3.Connection:
    """Delete the DB file, rebuild it and return a fresh connection."""
    path = Path(path)
    if path.exists():
        path.unlink()
    conn = connect(path)
    populate(conn, mode, client)
    return conn
