# Envejecer con autonomía — Grupo 01

Hackathon IA Aplicada · Congreso Social UC 2026 · Desafío 1.
Detección temprana de riesgo (aislamiento, deterioro funcional, abandono de tratamientos) en personas mayores que viven solas, con decisión humana final ante cualquier alerta.

## Solución en dos capas

| Capa | Pregunta | Método | Datos |
|---|---|---|---|
| **A · Territorial** | ¿Dónde buscar? | Regresión logística en CASEN 2024 → aplicada a Censo 2024 → índice por comuna | CASEN + Censo |
| **C · Check-in** | ¿A quién acompañar? | Check-in diario por voz + detección de cambio (CUSUM) contra la línea base de cada persona | Sintéticos |

## Estructura

Diseño funcional del CRM y seguimiento por voz: [Etapa 3 · Diseño de FARO](docs/ETAPA_3_DISENO.md).

Alcance inmediato de la demo: [Parámetros, cuatro niveles de atención y llamadas simuladas](docs/MVP_PARAMETROS_Y_SIMULACION.md).

Base de datos implementada: [SQLite, catálogo y datos sintéticos](docs/BASE_DE_DATOS.md).

```
.
├── README.md                  ← este archivo
├── docs/
│   ├── PLAN.md                ← plan completo: solución, capas, operación, ética, tareas, demo
│   ├── DATOS.md               ← inventario, mapeo de variables, cifras para el pitch
│   ├── bases/                 [REFERENCIA] bases oficiales de la hackathon
│   ├── pitch/                 [PITCH] informes CASEN (dependencia, hogares unipersonales)
│   └── referencia/            [DOC-VARIABLES] cuestionario CASEN, manual microdatos Censo
├── data/                      (ignorado por git, salvo la estructura)
│   ├── raw/
│   │   ├── casen/             [CORE-A] casen_2024.RData, base comunal .dta, libros de códigos
│   │   └── censo/             [CORE-A] viv_hog_per_censo2024.zip (3 parquet)
│   ├── processed/             salidas intermedias (bases limpias, índice comunal)
│   └── synthetic/             [CORE-C] check-ins simulados para la demo
├── src/
│   ├── territorial/           capa A: carga CASEN/Censo, modelo, índice comunal
│   ├── checkin/               capa C: CUSUM y alertas (pendientes)
│   └── db/                    SQLite, catálogo de indicadores y conversaciones sintéticas
├── notebooks/                 exploración
└── outputs/                   gráficos, mapas y tablas para el pitch
```

## Entorno

```bash
./scripts/descargar_datos.sh   # descarga CASEN y Censo a data/raw/ (~450 MB, no versionados)
uv sync            # instala dependencias
uv run python ...  # ejecuta dentro del entorno
```

Para preparar la base local de demostración y verificarla:

```bash
uv run python -m src.db --db data/processed/faro.db
uv run pytest -q
```

El comando crea el esquema, cinco dimensiones, 16 indicadores y cinco personas ficticias con 70 intentos de conversación. Si ya hay personas, conserva los datos existentes. Las observaciones, alertas y resultados CUSUM quedan vacíos hasta implementar el procesamiento.

Para generar las dos bases sintéticas, los archivos de intercambio y un ZIP completo:

```bash
uv run python -m src.db.export --archive outputs/faro_datos_sinteticos.zip
```

Los archivos se crean en `data/synthetic/`: `faro_sintetico.db` contiene el modelo completo y `conversaciones.db` contiene una tabla `conversaciones(id, conversacion)`. Incluyen perfiles, catálogo, parámetros y anotaciones esperadas para 14 días. La [guía del paquete](data/synthetic/README.md) explica cada archivo. Esta generación es independiente de la base operativa existente.

## Panel de FARO 100% real (API + SQLite + voz)

FARO ayuda a los equipos municipales a reconocer cambios en la vida cotidiana de las personas mayores y coordinar apoyo oportuno. Cada señal conserva su evidencia, cada caso tiene un responsable y cada acción queda en seguimiento. Las llamadas son automáticas: el operador revisa transcripciones y decide (derivar, avisar a contacto autorizado, solicitar llamada humana, ajustar frecuencia, cerrar con decisión).

```bash
scripts/seed_demo.sh          # reconstruye la BD y procesa las 70 conversaciones (reproducción, sin red); --jev usa TypeSafe
uv run uvicorn src.api.app:app --port 8000
cd dashboard && npm install && npm run dev      # http://localhost:5173
```

- Todo el panel lee de la API: `/api/bandeja`, `/api/personas/{id}` (`?incluir_salud=1` para medicamentos), `/api/alertas`, `/api/llamadas`, `POST /api/decisiones`, `POST /api/personas/{id}/asignar|frecuencia`, y `GET /api/eventos` (SSE: `persona_actualizada`, `alerta_creada`, `decision_registrada`). «Restablecer demo» llama a `POST /api/demo/reset` (re-siembra en modo reproducción). Si tenías una BD anterior, vuelve a correr `scripts/seed_demo.sh` (el esquema cambió).
- Voz (Fish Audio), claves solo en el servidor (`.env`, cargado en tiempo de ejecución): `FISH_API_KEY` (obligatoria para voz), `FISH_VOICE_ID` (opcional: `reference_id` de una voz; si falta, Fish usa su voz por defecto). `GET /api/voz/estado`, `POST /api/voz/tts {texto}` (modelo `drama-3`, MP3, con la dirección «[tono cálido, pausado y cercano]») y `POST /api/voz/stt` (multipart, `transcribe-1-pro`, `language=es`). Sin clave, el navegador usa `speechSynthesis` / Web Speech y, si no existen, texto.
- Bienestar y Geográfico siguen siendo «Datos agregados de demostración».

## Horarios críticos (6 nov 2026)

- **14:45** congelamiento del prototipo + checklist ético completo (requisito de admisibilidad).
- **16:15–18:15** pitch: 5 min con demo + 3 min de preguntas.
