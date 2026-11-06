# API en vivo de FARO (para el equipo de voz)

Base: `http://localhost:8000` · CORS habilitado para `http://localhost:5173` (y `127.0.0.1:5173`).

## Ejecutar
```
uv run uvicorn src.api.app:app --port 8000 --reload
```
- `FARO_DB` (default `data/processed/faro.db`; se crea y siembra si falta).
- Clasificador: Jev por defecto. `FARO_OFFLINE=1` o `POST /api/sesiones?offline=1` usan el clasificador por palabras clave (sin red). Si Jev falla en un turno, la API cae a offline automáticamente y lo informa en el evento `clasificacion` (`fallback_offline: true`, `aviso`).
- Las sesiones viven en memoria; se persiste en SQLite al terminar y de inmediato ante una urgencia (igual que el CLI interactivo).
- Documentación interactiva: `http://localhost:8000/docs`.

## Endpoints
| Método y ruta | Descripción |
|---|---|
| `GET /api/salud` | `{ok, modo: "jev"\|"offline"}` |
| `GET /api/personas` | `[{id, preferred_name, age, comuna}]` |
| `POST /api/sesiones` | body `{persona_id, canal: "voz"\|"texto", modo: "arbol"\|"ingesta"}` → `{sesion_id, decir:[...], estado, modo}` |
| `POST /api/sesiones/{id}/respuesta` | body `{texto}` → respuesta del turno (ver abajo) |
| `GET /api/sesiones/{id}` | snapshot: `transcripcion`, `observaciones`, `nivel_actual`, `niveles_por_dimension`, `alertas`, `stats` |
| `GET /api/sesiones/{id}/eventos` | SSE `text/event-stream` (repite lo ocurrido al conectar) |
| `POST /api/sesiones/{id}/terminar` | termina antes de tiempo (persiste y evalúa); devuelve el snapshot |
| `POST /api/sesiones/{id}/turnos` | solo modo ingesta: body `{rol: "asistente"\|"persona", texto}` |

### Ejemplo
```
POST /api/sesiones   {"persona_id": 1, "canal": "voz"}
→ {"sesion_id":"s1","decir":["Buenos días, Rosa. Le habla el asistente automático ... ¿Hablo con Rosa?"],"estado":"activa","modo":"jev"}

POST /api/sesiones/s1/respuesta   {"texto": "a veces me siento sola"}
→ {"decir": ["¿Tiene a alguien con quien conversar si lo necesita?"],
   "terminada": false, "urgente": false,
   "turno": {"indicador":"soledad_percibida","valor":"a_veces","estado":"informado","confianza":0.9,
             "latencia_ms":310,"repregunta":false,"cita":"a veces me siento sola","fuente":"jev"},
   "observaciones": [{"indicador":"soledad_percibida","dimension":"aislamiento","valor":"a_veces",
                      "estado":"informado","confianza":0.9,"cita":"...","fuente":"jev"}],
   "nivel_actual": 1, "niveles_por_dimension": {"aislamiento":1,"funcional":null,...}, "alertas": []}
```
`nivel_actual` es una estimación en vivo (historial + llamada en curso); al terminar o ante urgencia es la evaluación persistida. `estado` posibles: `informado`, `pendiente_confirmar`, `no_comprendido`, `no_sabe`, `prefiere_no_responder`.

### Eventos SSE
`turno_asistente {texto}`, `turno_persona {texto}`, `clasificacion {indicador, valor, estado, confianza, latencia_ms, repregunta, cita, fuente, fallback_offline, aviso}`, `nivel {nivel_actual, niveles_por_dimension, motivo, observaciones, stats}`, `urgencia {cita, mensaje}`, `alerta {id, level, origin, rule_code, explanation, status}`, `fin {estado, urgente, stats}`.
Cada evento: `event: <nombre>` + `data: <JSON>`. Los turnos enviados por voz vía `/respuesta` aparecen solos en la página `/en-vivo`.

## Bucle de voz con Fish Audio (modo árbol)
Fish Audio es solo voz (TTS + STT); **el árbol de diálogo conduce la conversación**.
1. `POST /api/sesiones` con `canal:"voz"`.
2. Hablar **cada string de `decir`, en orden**, con Fish Audio TTS.
3. Capturar el habla de la persona con Fish Audio STT.
4. `POST /api/sesiones/{id}/respuesta {texto: <transcripción>}`.
5. Volver al paso 2 con el nuevo `decir`, hasta `terminada: true`.

Presupuesto de latencia: cada turno agrega ~0,3 s de Jev (campo `latencia_ms`); modo offline ≈ 0 ms.

### Urgencia
Si la respuesta trae `urgente: true`, la ruta por reglas (regex, sin IA) ya se activó: se crea la alerta nivel 3 y `terminada` es `true`. Hablar el mensaje de protocolo que viene en `decir` y **detener** el bucle (no hay más turnos; `/respuesta` devolvería 409). La página muestra el banner rojo «Activación simulada del protocolo — ruta por reglas, sin IA».

## Modo ingesta (Fish Audio conduce la conversación)
Alternativa si una IA de voz externa hace las preguntas: `POST /api/sesiones {persona_id, modo:"ingesta"}` → `decir: []` (la API no conduce).
- Cada frase del asistente: `POST /turnos {rol:"asistente", texto}`. Se guarda como mensaje y, si se parece a una pregunta del árbol, se asocia a su indicador (si no, `null`).
- Cada frase de la persona: `POST /turnos {rol:"persona", texto}`. Primero corre la regex de urgencia; luego se clasifica contra el último indicador preguntado (Jev, que además actúa como red de seguridad de urgencia). Emite los mismos eventos SSE. Respuesta: `{ok, decir, urgente, terminada, turno, nivel_actual, alertas}`; en urgencia `decir` trae el mensaje de protocolo.
- `POST /terminar` persiste y corre la evaluación y alertas.
