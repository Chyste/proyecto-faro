import pytest

from src.db.catalog import DIMENSIONS, INDICATORS, seed_catalog
from src.db.connection import connect, init_db


@pytest.fixture
def conn():
    c = connect(":memory:")
    init_db(c)
    seed_catalog(c)
    yield c
    c.close()


def test_five_dimensions(conn):
    assert conn.execute("SELECT COUNT(*) FROM dimension").fetchone()[0] == 5
    assert len(DIMENSIONS) == 5


def test_indicators_reference_dimensions(conn):
    orphans = conn.execute(
        "SELECT code FROM indicator WHERE dimension_code NOT IN (SELECT code FROM dimension)"
    ).fetchall()
    assert orphans == []
    assert conn.execute("SELECT COUNT(*) FROM indicator").fetchone()[0] == len(INDICATORS) == 17


def test_only_seguridad_is_urgent(conn):
    urgent = {r["code"] for r in conn.execute("SELECT code FROM indicator WHERE is_urgent_trigger=1")}
    seguridad = {r["code"] for r in conn.execute("SELECT code FROM indicator WHERE dimension_code='seguridad'")}
    assert urgent == seguridad == {"caida", "lesion", "sintoma_agudo", "solicita_ayuda", "desesperanza"}


def test_seed_is_idempotent(conn):
    seed_catalog(conn)
    assert conn.execute("SELECT COUNT(*) FROM dimension").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM indicator").fetchone()[0] == 17


def test_descriptions_explain_scale(conn):
    for r in conn.execute("SELECT description FROM indicator WHERE value_type='score_0_2'"):
        assert r["description"].startswith("0 bien, 1 regular, 2 mal")


def test_catalog_is_immutable():
    assert isinstance(DIMENSIONS, tuple) and isinstance(INDICATORS, tuple)
