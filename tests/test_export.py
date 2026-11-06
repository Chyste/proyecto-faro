import json
import sqlite3
import zipfile

import pytest

from src.db.export import build_bundle, main


@pytest.fixture(scope="module")
def bundle(tmp_path_factory):
    path = tmp_path_factory.mktemp("synthetic_bundle")
    report = build_bundle(path)
    return path, report


def jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def test_two_databases_and_exact_conversation_contract(bundle):
    path, report = bundle
    with sqlite3.connect(path / "faro_sintetico.db") as full:
        assert full.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert full.execute("PRAGMA foreign_key_check").fetchall() == []
        ids = {r[0] for r in full.execute("SELECT id FROM conversation")}
        assert full.execute("SELECT count(*) FROM person").fetchone()[0] == 5
        assert full.execute("SELECT count(*) FROM observation").fetchone()[0] == 0
    with sqlite3.connect(path / "conversaciones.db") as flat:
        assert [r[1] for r in flat.execute("PRAGMA table_info(conversaciones)")] == ["id", "conversacion"]
        rows = flat.execute("SELECT id, conversacion FROM conversaciones ORDER BY id").fetchall()
    exported = json.loads((path / "conversaciones.json").read_text(encoding="utf-8"))
    assert len(rows) == 70
    assert {r[0] for r in rows} == ids
    assert exported == [dict(zip(("id", "conversacion"), row)) for row in rows]
    assert all(set(row) == {"id", "conversacion"} for row in exported)
    assert report["tablas"]["indicator"] == 16


def test_transcripts_match_ordered_messages_and_failed_attempts(bundle):
    path, _ = bundle
    calls = jsonl(path / "llamadas.jsonl")
    flat = {r["id"]: r["conversacion"] for r in json.loads((path / "conversaciones.json").read_text(encoding="utf-8"))}
    for call in calls:
        messages = call["mensajes"]
        assert flat[call["id"]] == "\n".join(
            f"{m['role'].capitalize()}: {m['text']}" for m in messages
        )
        if call["status"] in ("sin_respuesta", "fallo_tecnico"):
            assert not any(m["role"] == "persona" for m in messages)
        if call["status"] == "fallo_tecnico":
            assert flat[call["id"]] == ""
        if call["urgent_event_quote"]:
            assert call["urgent_event_quote"] in flat[call["id"]]


def test_expected_values_keep_types_missing_states_and_verbatim_evidence(bundle):
    path, _ = bundle
    expected = jsonl(path / "esperados.jsonl")
    calls = {c["id"]: c for c in jsonl(path / "llamadas.jsonl")}
    catalog = json.loads((path / "catalogo.json").read_text(encoding="utf-8"))
    types = {i["code"]: i for i in catalog["indicadores"]}
    assert len(expected) == len(calls) == 70
    states = set()
    for row in expected:
        assert set(row["indicadores"]) == set(types)
        call = calls[row["llamada_id"]]
        for code, item in row["indicadores"].items():
            states.add(item["estado"])
            value = item["valor"]
            if item["estado"] != "informado":
                assert value is None
            elif types[code]["value_type"] == "bool":
                assert type(value) is bool
            elif types[code]["value_type"] == "list":
                assert isinstance(value, list)
                assert set(value) <= set(types[code]["allowed_values"])
            else:
                assert value in types[code]["allowed_values"]
            if item["evidencia"]:
                assert any(m["role"] == "persona" and m["text"] == item["evidencia"] for m in call["mensajes"])
        if call["status"] in ("fallo_tecnico", "sin_respuesta", "rechazada"):
            assert row["nivel_esperado"] is None
            assert all(i["estado"] == "no_preguntado" for i in row["indicadores"].values())
    assert {"informado", "no_preguntado", "no_sabe", "prefiere_no_responder", "no_comprendido"} <= states


def test_profiles_and_pending_model_metadata(bundle):
    path, _ = bundle
    people = json.loads((path / "personas.json").read_text(encoding="utf-8"))
    assert len(people) == 5
    assert all(p["is_synthetic"] and p["contactos"] and p["consentimientos"] for p in people)
    elena = next(p for p in people if p["preferred_name"] == "Elena")
    assert elena["medicamentos"] == []
    model = json.loads((path / "modelo_metadata.json").read_text(encoding="utf-8"))
    assert model["estado"] == "pendiente"
    assert model["metricas"] is None and model["coeficientes"] is None
    assert (path / "observaciones.jsonl").read_text(encoding="utf-8") == ""


def test_sql_dump_restores_database(bundle):
    path, report = bundle
    with sqlite3.connect(":memory:") as restored:
        restored.execute("PRAGMA foreign_keys=ON")
        restored.executescript((path / "faro_sintetico.sql").read_text(encoding="utf-8"))
        assert restored.execute("PRAGMA foreign_key_check").fetchall() == []
        for table, count in report["tablas"].items():
            assert restored.execute(f"SELECT count(*) FROM {table}").fetchone()[0] == count


def test_manifest_hashes_and_regeneration_are_deterministic(bundle, tmp_path):
    import hashlib

    path, report = bundle
    repeated = build_bundle(tmp_path)
    assert repeated == report
    for name, details in report["archivos"].items():
        content = (path / name).read_bytes()
        assert hashlib.sha256(content).hexdigest() == details["sha256"]
        assert len(content) == details["bytes"]
        assert content == (tmp_path / name).read_bytes()


def test_cli_archive_and_custom_dates(tmp_path):
    output = tmp_path / "data"
    archive = tmp_path / "faro.zip"
    assert main(["--output-dir", str(output), "--start-date", "2026-11-01", "--archive", str(archive)]) == 0
    calls = jsonl(output / "llamadas.jsonl")
    assert calls[0]["started_at"].startswith("2026-11-01")
    with zipfile.ZipFile(archive) as zipped:
        assert {"faro_sintetico.db", "conversaciones.db", "README.md", "manifest.json"} <= set(zipped.namelist())


def test_invalid_date_creates_no_output(tmp_path):
    output = tmp_path / "invalid"
    with pytest.raises(ValueError):
        build_bundle(output, "2026-02-30")
    assert not output.exists()
