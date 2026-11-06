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

El comando crea el esquema, cinco dimensiones, 17 indicadores y cinco personas ficticias con 70 conversaciones. Si ya hay personas, conserva los datos existentes. Las observaciones, alertas y resultados CUSUM quedan vacíos hasta implementar el procesamiento.

## Horarios críticos (6 nov 2026)

- **14:45** congelamiento del prototipo + checklist ético completo (requisito de admisibilidad).
- **16:15–18:15** pitch: 5 min con demo + 3 min de preguntas.
