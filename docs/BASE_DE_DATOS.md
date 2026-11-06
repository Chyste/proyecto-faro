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

## Datos y relaciones disponibles

| Área | Tablas | Uso |
|---|---|---|
| Catálogo | `dimension`, `indicator` | Cinco dimensiones y 17 indicadores; tipo y marca de posible urgencia |
| Personas y equipo | `person`, `staff_user` | Perfil operativo, responsable y marca de dato sintético |
| Identidad y autorización | `person_identity`, `trusted_contact`, `consent_record` | Identidad separada, contacto y consentimiento ficticios |
| Conversaciones | `conversation`, `message` | Intentos por persona y mensajes ordenados por turno |
| Procesamiento | `extraction`, `observation`, `cusum_state` | Salida del extractor, evidencia y estado del detector; inicialmente vacíos |
| Seguimiento | `alert`, `alert_evidence`, `intervention` | Alertas, observaciones que las respaldan y acciones humanas; inicialmente vacíos |

Las conexiones abiertas mediante `src.db.connection.connect` habilitan claves foráneas. El esquema aplica restricciones a estados, roles, fuentes y niveles de alerta.

La separación de identidad es estructural: la autorización por rol y el borrado programado de transcripciones siguen pendientes. `transcript_purge_at` almacena una fecha, pero no ejecuta la eliminación.

## Escenarios cargados

La carga incluye dos funcionarios, cinco contactos, cinco consentimientos y 14 intentos diarios por persona: 70 conversaciones y 598 mensajes con la fecha inicial predeterminada.

| Persona ficticia | Escenario implementado |
|---|---|
| Rosa | Deterioro gradual desde el día 9, menor contacto y problemas de medicamentos |
| Luis | Conversaciones estables |
| Carmen | Caída con dolor y petición de ayuda el día 12; apoyo de su nieta después |
| Jorge | Mal sueño y cansancio puntuales el día 6 |
| Elena | Cuatro intentos sin respuesta, desde el día 11, sin respuestas de salud inventadas |

Los textos describen los eventos, pero todavía no generan observaciones ni alertas automáticamente. `is_urgent_trigger` identifica indicadores candidatos: no sustituye las condiciones del protocolo ni activa por sí solo un nivel 3.

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

`person_current_level` devuelve el máximo nivel de las alertas abiertas o en revisión de cada persona; devuelve `0` cuando no existen. Ese cero significa ausencia de alertas activas en la base y **no acredita una evaluación de estabilidad**. El dashboard debe distinguirlo de «sin evaluación actual», como establece el alcance del MVP.

## Relación con el diseño del dashboard

[Parámetros y simulación](MVP_PARAMETROS_Y_SIMULACION.md) define el contrato objetivo. La base actual implementa un subconjunto previo: los nombres de perfiles y algunos códigos de indicadores difieren, los indicadores numéricos usan `score_0_2` y el fallo técnico se almacena como `fallida`. No se deben convertir todos los campos propuestos a estos códigos sin revisar su significado.

Quedan pendientes los campos ampliados de la ficha, los eventos urgentes estructurados del guion, la reproducción, la extracción, las reglas de nivel, CUSUM y el dashboard. Los archivos JSON/JSONL propuestos en ese documento tampoco se generan con este comando; las conversaciones actuales se guardan en SQLite.
