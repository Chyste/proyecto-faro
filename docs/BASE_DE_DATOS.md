# Base de datos operativa de FARO

La implementación de [db-schema](../odd/tasks/db-schema.md) está integrada en `main`. Usa SQLite mediante la biblioteca estándar de Python; no requiere un servidor de base de datos.

## Preparación

Desde la raíz del proyecto:

```bash
uv sync
uv run python -m src.db --db data/processed/faro.db
uv run pytest -q
```

El archivo local queda en `data/processed/faro.db`, excluido de Git. El esquema y el catálogo se inicializan de forma idempotente. El comando carga las conversaciones sintéticas solo si `person` está vacía.

Para reconstruir deliberadamente la demo, `--reset` elimina el archivo indicado antes de crearlo otra vez:

```bash
uv run python -m src.db --db data/processed/faro.db --reset
```

`--start-date AAAA-MM-DD` permite cambiar el inicio de una carga nueva; por defecto es `2026-10-23`.

### Paquete sintético para el MVP

```bash
uv run python -m src.db.export --archive outputs/faro_datos_sinteticos.zip
```

Genera una base completa nueva en `data/synthetic/faro_sintetico.db` y otra en `data/synthetic/conversaciones.db`, cuya única tabla es `conversaciones(id, conversacion)`. Los IDs coinciden con `conversation.id` de la base completa. Se incluyen los 70 intentos; el texto del fallo técnico es vacío y el de sin respuesta solo contiene al asistente.

También genera SQL para reconstruir ambas bases, perfiles, equipo, catálogo con preguntas y valores permitidos, parámetros, llamadas, transcripciones y anotaciones en JSON/JSONL. `esperados.jsonl` contiene los 16 indicadores por intento, con tipo JSON, estado del dato y cita literal. Un indicador no preguntado conserva `null` y `no_preguntado`. `manifest.json` registra conteos, integridad y hashes; `modelo_metadata.json` conserva el estado pendiente del modelo. Véase la [guía del paquete](../data/synthetic/README.md).

La generación usa una base temporal en memoria y no modifica `data/processed/faro.db`. Opciones: `--output-dir` y `--start-date`. El dataset es reproducible, con offset fijo de demostración `-03:00`. `observaciones.jsonl` y las tablas de procesamiento se entregan vacíos: las anotaciones esperadas no se presentan como resultados de un extractor ni de un motor de reglas.

## Datos y relaciones disponibles

| Área | Tablas | Uso |
|---|---|---|
| Catálogo | `dimension`, `indicator` | Cinco dimensiones y 16 indicadores del contrato (§4); tipo `bool`, `category` o `list`, valores permitidos y marca de posible urgencia |
| Personas y equipo | `person`, `staff_user`, `person_medication` | Ficha ampliada (edad, sexo del modelo, área, escolaridad, WG, vive sola, autonomía y red de apoyo base, tratamiento, horario, intereses); medicamentos declarados en un módulo restringido |
| Identidad y autorización | `person_identity`, `trusted_contact`, `consent_record` | Identidad separada, contacto y consentimiento ficticios |
| Conversaciones | `conversation`, `message` | Intentos (`completada`, `parcial`, `sin_respuesta`, `rechazada`, `fallo_tecnico`), escenario, evento urgente del guion y mensajes por turno |
| Procesamiento | `extraction`, `observation`, `cusum_state`, `assessment` | Salida del extractor, observaciones con estado del dato, estado del detector y niveles evaluados; inicialmente vacíos |
| Seguimiento | `alert`, `alert_evidence`, `intervention` | Alertas, evidencia y acciones humanas; inicialmente vacíos |
| Anotaciones | `scenario_expectation` | Valores y niveles esperados por conversación, separados de las salidas efectivas |

Las conexiones abiertas mediante `src.db.connection.connect` habilitan claves foráneas. El esquema aplica restricciones a tipos de indicador, estados del dato, fuentes (`ia`, `regla`, `funcionario`, `reproduccion`), estados de conversación, niveles y eventos urgentes (un tipo de evento exige su frase respaldo).

Codificación de `observation`: booleanos en `value_num` (0/1), categorías en `value_text` y listas como arreglo JSON en `value_text`. Un estado distinto de `informado` (`no_preguntado`, `no_sabe`, `prefiere_no_responder`, `no_comprendido`, `pendiente_confirmar`) exige valor nulo.

La separación de identidad es estructural: la autorización por rol y el borrado programado de transcripciones siguen pendientes. `transcript_purge_at` almacena una fecha, pero no ejecuta la eliminación.

## Escenarios cargados

La carga incluye dos funcionarios, cinco contactos, cinco consentimientos, seis medicamentos declarados y 14 intentos diarios por persona: 70 conversaciones con la fecha inicial predeterminada. Cada conversación respondida identifica al asistente automático, confirma al interlocutor y pregunta por códigos de indicador del catálogo.

| Persona ficticia | Escenario | Niveles esperados |
|---|---|---|
| Rosa | Días 1–7 estables; 8–11 menor contacto, soledad y barrera de acceso a medicamentos; 12 aún con señales (la acción se registra en vivo en la demo); 13–14 mejora | 0, luego 1 y 2; conserva 2 mientras persiste la ventana de cinco días |
| Carlos | Vive solo, se siente acompañado y mantiene actividades | 0 todos los días |
| Elena | Sin tratamiento (adherencia `no_aplica`); tristeza ocasional el día 6; llamada parcial el día 9 y rechazada el 10 | 0 y 1 el día 6; `NULL` los días 9–10 por información insuficiente |
| Miguel | Confusión nueva los días 5, 7 y 8; fallo técnico el día 10 y sin respuesta el 11 | 1 y 2; sin evaluar (`NULL`) en los intentos fallidos |
| Teresa | Empeoramiento de autonomía los días 6–9; caída con lesión y petición de ayuda el día 11; recuperación con apoyo familiar | 2, luego 3 hasta la resolución humana |

`scenario_expectation` tiene una fila por conversación con `indicator_code` nulo (nivel esperado; `NULL` significa sin evaluar) y una fila por indicador preguntado (`expected_value` como texto; si la respuesta fue nula, el motivo queda en `note`). Hay respuestas `no_sabe`, `prefiere_no_responder` y `no_comprendido` anotadas. Los niveles de Rosa de los días 13–14 conservan el nivel 2 según la ventana de persistencia de cinco días. Las llamadas respetan las preferencias de mañana (10:00) o tarde (16:00). El cierre del guion urgente identifica la activación simulada del protocolo.

La carga no genera observaciones, evaluaciones ni alertas. `is_urgent_trigger` identifica indicadores candidatos (`lesion_reportada`, `sintoma_agudo_protocolo`, `necesita_ayuda_inmediata`): no activa por sí solo un nivel 3. La caída sin lesión corresponde a nivel 2 según el contrato.

## Consultar desde Python

```python
from src.db.connection import connect

conn = connect("data/processed/faro.db")
try:
    rows = conn.execute("""
        SELECT p.preferred_name, c.started_at, c.status, m.turn, m.role, m.text
        FROM person p
        JOIN conversation c ON c.person_id = p.id
        LEFT JOIN message m ON m.conversation_id = c.id
        ORDER BY p.id, c.started_at, m.turn
    """).fetchall()
    for row in rows:
        print(dict(row))
finally:
    conn.close()
```

`person_current_level` devuelve `assessed_level` y `assessed_at` (última evaluación), `open_alert_level` (máximo de alertas abiertas o en revisión) y `level`. Un `level` nulo significa **sin evaluación actual**, nunca verde. Regla: una alerta abierta de nivel 3 prevalece (3); si no, rige el nivel de la última evaluación; si no existe, el de las alertas abiertas, que puede ser nulo. Las alertas cerradas se ignoran. Una evaluación con nivel nulo registra que no hubo información suficiente.

## Relación con el diseño del dashboard

[Parámetros y simulación](MVP_PARAMETROS_Y_SIMULACION.md) define el contrato; el catálogo, la ficha y las cinco personas coinciden con él.

Pendientes: extracción de indicadores, motor de reglas y escritura de `assessment`, detector de palabras de urgencia, CUSUM, modo de reproducción (carga de observaciones con fuente `reproduccion`), dashboard y control de acceso por rol. El paquete exporta los JSON/JSONL propuestos en el contrato; `observaciones.jsonl` queda vacío hasta disponer de salidas efectivas.
