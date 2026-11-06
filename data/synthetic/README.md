# FARO · Datos sintéticos del MVP

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
