"""Generate the self-contained FARO synthetic data bundle; uses only Python's standard library.

Run: python -m src.db.export --archive outputs/faro_datos_sinteticos.zip
Expected annotations are fixtures, never labelled as actual extractor or rules output.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from datetime import date, timedelta
from pathlib import Path

from .catalog import seed_catalog
from .connection import connect, init_db
from .synthetic import DEFAULT_START, N_DAYS, QUESTIONS, TZ, manifest, seed_synthetic

DATASET_VERSION = "faro-sintetico-v1"
MISSING_STATES = ["no_preguntado", "no_sabe", "prefiere_no_responder", "no_comprendido", "pendiente_confirmar"]


def _json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")


def _rows(conn, table: str, person_id: int | None = None) -> list[dict]:
    query = f"SELECT * FROM {table}"
    params = ()
    if person_id is not None:
        query += " WHERE person_id=?"
        params = (person_id,)
    return [dict(row) for row in conn.execute(query + " ORDER BY rowid", params)]


def _people(conn) -> list[dict]:
    people = _rows(conn, "person")
    for person in people:
        pid = person["id"]
        person["is_synthetic"] = bool(person["is_synthetic"])
        person["intereses"] = json.loads(person["intereses"])
        person["identidad_ficticia"] = _rows(conn, "person_identity", pid)[0]
        person["medicamentos"] = _rows(conn, "person_medication", pid)
        person["contactos"] = _rows(conn, "trusted_contact", pid)
        person["consentimientos"] = _rows(conn, "consent_record", pid)
    return people


def _calls(conn) -> list[dict]:
    calls = _rows(conn, "conversation")
    for call in calls:
        call["is_synthetic"] = True
        call["mensajes"] = [dict(row) for row in conn.execute(
            "SELECT turn, role, question_code, text FROM message WHERE conversation_id=? ORDER BY turn", (call["id"],)
        )]
    return calls


def _expected(conn, calls: list[dict], indicators: list[dict]) -> list[dict]:
    expected = []
    for call in calls:
        cid = call["id"]
        level = conn.execute(
            "SELECT expected_level, note FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NULL",
            (cid,),
        ).fetchone()
        annotations = {row["indicator_code"]: row for row in conn.execute(
            "SELECT * FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NOT NULL", (cid,)
        )}
        messages = call["mensajes"]
        evidence = {
            question["question_code"]: answer["text"]
            for question, answer in zip(messages, messages[1:])
            if question["question_code"] and answer["role"] == "persona"
        }
        values = {}
        for indicator in indicators:
            code = indicator["code"]
            annotation = annotations.get(code)
            value = None
            state = "no_preguntado"
            if annotation is not None:
                raw = annotation["expected_value"]
                state = annotation["note"] if raw is None else "informado"
                if raw is not None:
                    value = raw if indicator["value_type"] == "category" else json.loads(raw)
            values[code] = {"valor": value, "estado": state, "evidencia": evidence.get(code)}
        expected.append({
            "llamada_id": cid, "persona_id": call["person_id"], "fecha": call["started_at"],
            "tipo": "anotacion_esperada", "nivel_esperado": level["expected_level"],
            "motivo": level["note"], "indicadores": values,
        })
    return expected


def _save_database(conn: sqlite3.Connection, path: Path) -> None:
    # Build a complete file before replacing an earlier generated artifact.
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".tmp", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with closing(sqlite3.connect(temporary)) as destination:
            conn.backup(destination)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _parameters(start: date) -> dict:
    return {
        "version": DATASET_VERSION, "modo": "datos_sinteticos_con_anotaciones",
        "fecha_inicio": start.isoformat(), "fecha_fin": (start + timedelta(days=N_DAYS - 1)).isoformat(),
        "dias_por_persona": N_DAYS, "intentos_diarios_por_persona": 1,
        "zona_horaria": "America/Santiago", "offset_fijo_simulacion": TZ,
        "horarios_simulados": {"mañana": "10:00", "tarde": "16:00"},
        "periodo_referencia_max_horas": 24, "retencion_transcripciones_dias": 30,
        "borrado_automatico_implementado": False,
        "reglas_demo": {
            "estado_implementacion": "pendiente; los niveles incluidos son anotaciones",
            "persistencia": {"ventana_dias": 5, "minimo_llamadas_validas_con_senal": 3,
                             "dimensiones": ["aislamiento", "medicacion", "emocional_cognitiva"]},
            "combinacion": {"minimo_dimensiones_con_senal": 2, "nivel": 2},
            "empeoramiento_autonomia_explicito": {"nivel": 2},
            "caida_sin_lesion_o_lesion_desconocida": {"nivel": 2},
            "eventos_urgentes": {"tipos": ["necesita_ayuda_inmediata", "caida_con_lesion", "sintoma_agudo"],
                                 "nivel": 3, "prioridad": "antes de IA o CUSUM", "cierre": "humano"},
            "intento_sin_informacion": {"nivel": None, "conservar_historial_previo": True},
        },
        "niveles": [
            {"nivel": 0, "color": "verde", "nombre": "Seguimiento habitual"},
            {"nivel": 1, "color": "amarillo", "nombre": "Atención preventiva"},
            {"nivel": 2, "color": "naranja", "nombre": "Revisión prioritaria"},
            {"nivel": 3, "color": "rojo", "nombre": "Situación urgente"},
        ],
        "sin_evaluacion": {"nivel": None, "etiqueta": "sin evaluación actual"},
        "cusum": {"estado": "pendiente", "dias_base_propuestos": 7, "k": None, "h": None},
        "fuentes_contrato": ["docs/MVP_PARAMETROS_Y_SIMULACION.md", "src/db/catalog.py", "src/db/schema.sql"],
    }


BUNDLE_README = """# FARO · Datos sintéticos del MVP

Cinco personas ficticias × 14 días = 70 intentos. Una comuna (San Joaquín), cinco
dimensiones y 16 indicadores. Fechas y conteos exactos: `manifest.json`.
Es una muestra diseñada para probar escenarios; no reproduce prevalencias CASEN/Censo.

## Bases de datos

- `faro_sintetico.db`: SQLite con 18 tablas y la vista `person_current_level`;
  incluye perfiles, identidad ficticia, medicamentos, responsables, contactos,
  consentimientos, llamadas, mensajes y anotaciones esperadas.
- `conversaciones.db`: SQLite con una única tabla `conversaciones` y exactamente
  dos columnas: `id INTEGER PRIMARY KEY`, `conversacion TEXT NOT NULL`.
- `faro_sintetico.sql`: esquema y datos para reconstruir la base completa con SQLite.
- `conversaciones.sql`: esquema y datos de la base de dos columnas.

Los IDs de ambas bases coinciden con `conversation.id`. El texto reúne los turnos
en orden, con etiquetas `Asistente:` y `Persona:`. Incluye los 70 intentos:
el fallo técnico tiene texto vacío; sin respuesta contiene solo al asistente;
rechazada conserva la negativa, sin respuestas de salud inventadas.
Para filtrar por persona, fecha o estado, usar la base completa o `llamadas.jsonl`.

## Archivos de intercambio

| Archivo | Contenido |
|---|---|
| `personas.json` | Perfiles, identidad ficticia, contactos, tratamientos y consentimiento |
| `equipo.json` | Funcionarios ficticios y roles |
| `catalogo.json` | Dimensiones, códigos, tipos, valores admitidos y preguntas |
| `llamadas.jsonl` | Un intento por línea, con mensajes y evento urgente del guion |
| `conversaciones.json` | Solo `id` y `conversacion`, equivalente a la segunda base |
| `esperados.jsonl` | Nivel y 16 indicadores esperados por intento, con estado y cita literal |
| `parametros_demo.json` | Ventanas, horarios, niveles y estado de los componentes |
| `modelo_metadata.json` | Modelo territorial pendiente, sin métricas inventadas |
| `observaciones.jsonl` | Vacío: reservado para las futuras salidas del procesamiento |
| `manifest.json` | Conteos, cobertura, integridad y hashes SHA-256 |

Los valores esperados mantienen los tipos: booleanos JSON, categorías y listas.
Un valor desconocido es `null` con su motivo. Un campo no preguntado no equivale
a `false`. `no_aplica` se conserva cuando no existe tratamiento.

## Escenarios

- Rosa: estabilidad, aislamiento y barrera de acceso a medicamentos; mejora de
  respuestas, manteniendo nivel 2 mientras persiste la ventana de cinco días.
- Carlos: vive solo, acompañado por su red y estable en nivel 0.
- Elena: sin tratamiento, tristeza ocasional, llamada parcial y negativa a conversar.
- Miguel: confusión nueva reportada repetidamente, fallo técnico y falta de respuesta.
- Teresa: menor autonomía, caída con lesión y solicitud de ayuda; el nivel 3 anotado
  persiste hasta resolución humana, que debe registrarse durante la demostración.

## Uso

```python
import sqlite3

with sqlite3.connect("conversaciones.db") as db:
    id, conversacion = db.execute(
        "SELECT id, conversacion FROM conversaciones WHERE conversacion != '' ORDER BY id LIMIT 1"
    ).fetchone()
    print(id, conversacion)
```

Desde la raíz del repositorio, recrear todos los archivos y el ZIP:

```bash
uv run python -m src.db.export --archive outputs/faro_datos_sinteticos.zip
```

Opciones: `--output-dir` y `--start-date AAAA-MM-DD`. Los artefactos del directorio
de salida se regeneran; `data/processed/faro.db` no se modifica.
El offset del guion es fijo (-03:00), incluso al cambiar la fecha inicial.

Las tablas `extraction`, `observation`, `assessment`, `cusum_state`, `alert`,
`alert_evidence` e `intervention` se entregan vacías. Las anotaciones no son
extracciones de IA ni evaluaciones ejecutadas: la vista de nivel actual devuelve
`NULL` hasta procesar las llamadas. Motor de reglas, CUSUM, dashboard y permisos
por rol siguen pendientes. No se generan llamadas, avisos ni intervenciones reales.
"""


def _dump(conn: sqlite3.Connection, path: Path) -> None:
    # iterdump orders tables alphabetically; FK enforcement resumes after loading all rows.
    path.write_text("-- DATOS SINTETICOS FARO\nPRAGMA foreign_keys=OFF;\n"
                    + "\n".join(conn.iterdump()) + "\nPRAGMA foreign_keys=ON;\n", encoding="utf-8")


def build_bundle(output_dir: str | Path, start_date: str = DEFAULT_START) -> dict:
    """Generate fresh fixtures independently of any operational database."""
    start = date.fromisoformat(start_date)
    output = Path(output_dir)
    with closing(connect()) as conn:
        init_db(conn)
        seed_catalog(conn)
        seed_synthetic(conn, start)
        counts = manifest(conn)
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        fk_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
        if integrity != "ok" or fk_errors:
            raise ValueError("Synthetic source database failed integrity checks")
        calls = _calls(conn)
        indicators = _rows(conn, "indicator")
        for indicator in indicators:
            indicator["allowed_values"] = json.loads(indicator["allowed_values"]) if indicator["allowed_values"] else None
            indicator["is_urgent_trigger"] = bool(indicator["is_urgent_trigger"])
            indicator["preguntas"] = list(QUESTIONS[indicator["code"]])
        flat = [{"id": c["id"], "conversacion": "\n".join(
            f"{m['role'].capitalize()}: {m['text']}" for m in c["mensajes"]
        )} for c in calls]
        expected = _expected(conn, calls, indicators)
        output.mkdir(parents=True, exist_ok=True)
        _save_database(conn, output / "faro_sintetico.db")
        _dump(conn, output / "faro_sintetico.sql")
        with closing(sqlite3.connect(":memory:")) as conversations:
            conversations.execute("CREATE TABLE conversaciones (id INTEGER PRIMARY KEY, conversacion TEXT NOT NULL)")
            conversations.executemany("INSERT INTO conversaciones VALUES (?, ?)", [(r["id"], r["conversacion"]) for r in flat])
            conversations.commit()
            _save_database(conversations, output / "conversaciones.db")
            _dump(conversations, output / "conversaciones.sql")
        _json(output / "personas.json", _people(conn))
        _json(output / "equipo.json", _rows(conn, "staff_user"))
        _json(output / "catalogo.json", {"dimensiones": _rows(conn, "dimension"), "indicadores": indicators,
                                        "estados_del_dato": ["informado", *MISSING_STATES]})
        _json(output / "conversaciones.json", flat)
        _jsonl(output / "llamadas.jsonl", calls)
        _jsonl(output / "esperados.jsonl", expected)
        _jsonl(output / "observaciones.jsonl", [])
        parameters = _parameters(start)
        _json(output / "parametros_demo.json", parameters)
        _json(output / "modelo_metadata.json", {
            "estado": "pendiente", "version": None, "fuentes_previstas": ["CASEN 2024", "Censo 2024"],
            "objetivo": "dependencia funcional sin cuidador dentro del hogar",
            "coeficientes": None, "metricas": None, "ajustado_con_estos_sinteticos": False,
            "cusum": parameters["cusum"],
        })
        (output / "README.md").write_text(BUNDLE_README, encoding="utf-8")
        names = ["faro_sintetico.db", "faro_sintetico.sql", "conversaciones.db", "conversaciones.sql",
                 "personas.json", "equipo.json", "catalogo.json", "conversaciones.json", "llamadas.jsonl",
                 "esperados.jsonl", "observaciones.jsonl", "parametros_demo.json", "modelo_metadata.json", "README.md"]
        report = {
            "version": DATASET_VERSION, "es_sintetico": True, "fecha_inicio": start.isoformat(),
            "fecha_fin": parameters["fecha_fin"], "tablas": counts,
            "estados_llamadas": {r["status"]: r["n"] for r in conn.execute(
                "SELECT status, count(*) n FROM conversation GROUP BY status ORDER BY status")},
            "niveles_esperados": {str(r["expected_level"]) if r["expected_level"] is not None else "sin_evaluacion": r["n"]
                                 for r in conn.execute("SELECT expected_level, count(*) n FROM scenario_expectation "
                                                       "WHERE indicator_code IS NULL GROUP BY expected_level ORDER BY expected_level")},
            "integridad": {"sqlite": integrity, "errores_claves_foraneas": len(fk_errors)},
            "archivos": {name: {"bytes": (output / name).stat().st_size,
                                "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest()} for name in names},
        }
        _json(output / "manifest.json", report)
        return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="data/synthetic")
    parser.add_argument("--start-date", default=DEFAULT_START)
    parser.add_argument("--archive", help="Optional ZIP file containing the complete bundle")
    args = parser.parse_args(argv)
    report = build_bundle(args.output_dir, args.start_date)
    print(f"Dataset: {args.output_dir} ({report['tablas']['person']} personas, {report['tablas']['conversation']} intentos)")
    if args.archive:
        archive = Path(args.archive)
        files = [*report["archivos"], "manifest.json"]
        source_paths = {(Path(args.output_dir) / name).resolve() for name in files}
        if archive.resolve() in source_paths:
            parser.error("The ZIP path must differ from every generated artifact")
        archive.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive, "w") as zipped:
            for name in files:
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                zipped.writestr(info, (Path(args.output_dir) / name).read_bytes())
        print(f"ZIP: {archive}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
