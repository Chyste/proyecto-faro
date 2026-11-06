"""Build the FARO SQLite database: schema + catalog + synthetic data."""
from __future__ import annotations

import argparse
from pathlib import Path

from .catalog import seed_catalog
from .connection import connect, init_db
from .synthetic import DEFAULT_START, manifest, seed_synthetic


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m src.db", description=__doc__)
    parser.add_argument("--db", default="data/processed/faro.db")
    parser.add_argument("--reset", action="store_true", help="delete the DB file first")
    parser.add_argument("--start-date", default=DEFAULT_START)
    args = parser.parse_args(argv)

    path = Path(args.db)
    if args.reset and path.exists():
        path.unlink()
    conn = connect(path)
    try:
        init_db(conn)
        seed_catalog(conn)
        if conn.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 0:
            seed_synthetic(conn, args.start_date)
        else:
            print("Synthetic data already present (use --reset to rebuild).")
        print(f"DB: {path}")
        for table, n in manifest(conn).items():
            print(f"  {table}: {n}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
