# Envejecer con autonomía — Grupo 01

Hackathon IA Aplicada · Congreso Social UC 2026 · Desafío 1.
Detección temprana de riesgo (aislamiento, deterioro funcional, abandono de tratamientos) en personas mayores que viven solas, con decisión humana final ante cualquier alerta.

## Solución en dos capas

| Capa | Pregunta | Método | Datos |
|---|---|---|---|
| **A · Territorial** | ¿Dónde buscar? | Regresión logística en CASEN 2024 → aplicada a Censo 2024 → índice por comuna | CASEN + Censo |
| **C · Check-in** | ¿A quién acompañar? | Check-in diario por voz + detección de cambio (CUSUM) contra la línea base de cada persona | Sintéticos |

## Estructura

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
│   └── checkin/               capa C: generador sintético, CUSUM, alertas
├── notebooks/                 exploración
└── outputs/                   gráficos, mapas y tablas para el pitch
```

## Entorno

```bash
uv sync            # instala dependencias
uv run python ...  # ejecuta dentro del entorno
```

## Horarios críticos (6 nov 2026)

- **14:45** congelamiento del prototipo + checklist ético completo (requisito de admisibilidad).
- **16:15–18:15** pitch: 5 min con demo + 3 min de preguntas.
