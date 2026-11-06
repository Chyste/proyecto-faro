import json

import pytest

from src.db.catalog import DIMENSIONS, INDICATORS, seed_catalog
from src.db.connection import connect, init_db

EXPECTED = {
    "soledad_percibida": ("aislamiento", "category", ["no", "a_veces", "frecuente"]),
    "contacto_social_24h": ("aislamiento", "bool", None),
    "menor_contacto_habitual": ("aislamiento", "bool", None),
    "apoyo_disponible": ("aislamiento", "bool", None),
    "cambio_autonomia": ("funcional", "category", ["sin_cambio", "mejora", "empeora"]),
    "dificultad_puntual_reportada": ("funcional", "bool", None),
    "actividad_afectada": ("funcional", "list", [
        "desplazarse", "asearse", "vestirse", "alimentarse", "comprar", "preparar_alimentos", "otra"]),
    "adherencia_reportada": ("medicacion", "category", ["completa", "parcial", "ninguna", "no_aplica"]),
    "barrera_tratamiento": ("medicacion", "list", ["olvido", "acceso", "molestia_reportada", "otra"]),
    "animo_reportado": ("emocional_cognitiva", "category", ["bien", "regular", "mal"]),
    "tristeza_reportada": ("emocional_cognitiva", "category", ["no", "ocasional", "persistente"]),
    "confusion_nueva_reportada": ("emocional_cognitiva", "bool", None),
    "caida_reportada": ("seguridad", "bool", None),
    "lesion_reportada": ("seguridad", "bool", None),
    "sintoma_agudo_protocolo": ("seguridad", "bool", None),
    "necesita_ayuda_inmediata": ("seguridad", "bool", None),
}


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


def test_exactly_the_contract_indicators(conn):
    rows = {
        r["code"]: (r["dimension_code"], r["value_type"],
                    json.loads(r["allowed_values"]) if r["allowed_values"] else None)
        for r in conn.execute("SELECT * FROM indicator")
    }
    assert rows == EXPECTED
    assert len(INDICATORS) == 16


def test_urgent_trigger_set_is_exact(conn):
    urgent = {r["code"] for r in conn.execute("SELECT code FROM indicator WHERE is_urgent_trigger=1")}
    assert urgent == {"lesion_reportada", "sintoma_agudo_protocolo", "necesita_ayuda_inmediata"}


def test_seed_is_idempotent(conn):
    seed_catalog(conn)
    assert conn.execute("SELECT COUNT(*) FROM dimension").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM indicator").fetchone()[0] == 16


def test_descriptions_state_reference_period(conn):
    for r in conn.execute("SELECT code, description FROM indicator"):
        assert r["description"].strip(), r["code"]
    assert all("24 horas" in i.description for i in INDICATORS)


def test_catalog_is_immutable():
    assert isinstance(DIMENSIONS, tuple) and isinstance(INDICATORS, tuple)
