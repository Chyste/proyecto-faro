"""CLI: uv run python -m src.checkin [--db PATH] [--person NAME] [--day N] [--reset]"""
from __future__ import annotations

import argparse
from pathlib import Path

from src.db.catalog import seed_catalog
from src.db.connection import connect, init_db
from src.db.synthetic import seed_synthetic

from .simulate import run_simulation


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m src.checkin", description=__doc__)
    p.add_argument("--db", default="data/processed/faro.db")
    p.add_argument("--person")
    p.add_argument("--day", type=int)
    p.add_argument("--reset", action="store_true", help="rebuild the DB (schema, catalog, synthetic data) first")
    a = p.parse_args(argv)
    path = Path(a.db)
    if a.reset and path.exists():
        path.unlink()
    conn = connect(path)
    try:
        init_db(conn)
        seed_catalog(conn)
        if conn.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 0:
            seed_synthetic(conn)
        print(run_simulation(conn, a.person, a.day))
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
