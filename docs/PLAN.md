# PLAN — Envejecer con autonomía (Grupo 01)

Hackathon IA Aplicada · Congreso Social UC 2026 · Desafío 1
Prototipo congelado: **14:45** · Pitch: 5 min + 3 min preguntas

---

## 1. Problema

- ~600 mil personas mayores viven en hogares compuestos solo por personas mayores sin servicio doméstico (16,5%, INE–SENAMA, Censo 2024). Ver cifras con página en `docs/DATOS.md` §3.
- Las señales de riesgo (dejar de salir, abandonar remedios, aislarse, perder funcionalidad) son graduales e invisibles.
- La Oficina del Adulto Mayor (OAM) tiene baja capacidad de seguimiento individual. Falla en dos cosas:
  1. **No sabe a quién priorizar** ni dónde concentrar esfuerzos.
  2. **Se entera tarde** de que alguien se está deteriorando.

**Pregunta del desafío:** detectar a tiempo situaciones de riesgo en personas mayores que viven solas y conectarlas con redes de apoyo, respetando autonomía y privacidad.

## 2. Solución en una frase

> Un sistema que ayuda a la OAM a **priorizar** a quién acompañar y, a quienes aceptan participar, los **acompaña con un check-in diario por voz** que detecta a tiempo cuando algo cambia, para que **un humano decida** qué hacer.

## 3. Usuarios

| Usuario | Qué obtiene |
|---|---|
| Persona mayor que vive sola | Contacto diario sin apps ni formularios (llamada o audio de WhatsApp); decide quién recibe avisos |
| Monitor / funcionario OAM | Panel con semáforo de alertas explicadas y prioridades; decide la acción |
| Cuidador informal / familiar | Aviso solo si la persona lo autorizó y el funcionario lo decide |
| SENAMA / Gobierno Regional | Ranking comunal para decidir dónde pilotear y cuántos recursos asignar |

---

## 4. Capa A — Modelo de riesgo esperado (CASEN → Censo)

### 4.1 Qué es
Una regresión logística estimada en CASEN 2024 que relaciona un perfil sociodemográfico con la probabilidad de **ser dependiente funcional sin cuidador dentro del hogar**. La definición incluye a quienes tienen exclusivamente un cuidador externo. Se usa de dos formas.

```
CASEN 2024 ──► regresión logística ──┬──► × Censo 2024 ──► Producto 1: ranking comunal
                                     └──► regla simple ───► Producto 2: prioridad al inscribir
                                                                      │
                                                                      ▼
                                                              Capa C (check-in)
```

### 4.2 Producto 1 — Ranking comunal
- **Para quién:** SENAMA, GORE, fundaciones (deciden *entre* comunas). También sirve en el pitch para dimensionar el impacto.
- **Cómo:** aplicar los coeficientes a cada persona 60+ del Censo y agregar por comuna → personas esperadas en riesgo (N) y tasa (%).
- **Por qué combinar fuentes:** CASEN mide dependencia pero no es representativa por comuna; el Censo cubre todas las comunas pero no mide dependencia. El modelo transfiere la relación de una a otra.

### 4.3 Producto 2 — Prioridad al inscribir
- **Para quién:** la OAM, *dentro* de su comuna.
- **Cómo:** al inscribir a una persona (con consentimiento), el monitor registra las características habilitadas para el modelo (edad, vive sola, dificultad funcional autodeclarada, escolaridad, área). Una eventual regla derivada del modelo entrega una prioridad de acompañamiento y se identifica aparte del nivel de atención 0–3.
- **Qué define la prioridad:** frecuencia del check-in, frecuencia de visitas presenciales y si se sugiere un contacto de respaldo.
- **Explicable:** se muestra qué factores suben la prioridad (coeficientes / odds ratios).

### 4.4 Especificación del modelo
- **Población:** personas 60+ en CASEN 2024.
- **Variable respuesta (Y):** `depen_fun = 1` y `persona_cuidada ∈ {0, 2}` (dependiente sin cuidador dentro del hogar). 2.136 casos, 3,8% ponderado.
- **Covariables (X), presentes en CASEN y Censo:** tramo de edad, sexo, vive solo, discapacidad (Washington Group), escolaridad, área urbano/rural. Opcionales: estado civil, pueblo indígena, nacido en el extranjero.
- **Peso:** `expr` (factor de expansión regional).
- **Validación:** AUC, calibración por deciles; comparar tasa predicha vs. observada en las 142 comunas CASEN con ≥100 personas 60+.
- **Sesgos:** revisar calibración por sexo, área y pueblo indígena.
- Detalle de variables, códigos y uniones: `docs/DATOS.md` §4–5.

### 4.5 Qué NO hace
- No identifica personas ni barrios (el Censo, por secreto estadístico, llega a comuna-área).
- No calcula puntajes de nadie que no haya consentido participar.
- No es una medición: es **riesgo esperado según perfil**.

---

## 5. Capa C — Check-in diario y detección de cambio

### 5.1 Flujo de la persona (ejemplo)
**Alcance de la hackatón:** reproducir llamadas ficticias y sus indicadores sobre perfiles sintéticos, sin telefonía real. El ejemplo describe la experiencia que se simula.

> Doña Rosa, 79 años, vive sola. Un monitor la inscribe y ella consiente.
> Cada día recibe una llamada o audio: *"¿Cómo amaneció? ¿Tomó sus remedios? ¿Ha conversado con alguien?"*
> Responde hablando, con sus palabras.

### 5.2 Pipeline
1. **Conversación → indicadores:** se extraen los campos de las cinco dimensiones definidos en [el contrato del MVP](MVP_PARAMETROS_Y_SIMULACION.md). La demo identifica si la extracción es en vivo sobre texto ficticio o si se reproducen indicadores preparados. Los datos desconocidos se conservan como tales. Para una operación real, el diseño conserva indicadores y no audio ni transcripciones completas.
2. **Reglas y evolución:** se calculan los niveles 0–3 con motivos. CUSUM es un análisis complementario frente a una línea base propia cuando exista referencia suficiente. Las llamadas sin respuesta se registran como situaciones de contacto, sin inventar indicadores de salud. Un evento urgente del guion activa primero la ruta de protocolo, sin esperar IA o estadística.
3. **Alerta explicada:** texto legible, p. ej. *"3 días sin remedios, ánimo a la baja, sin salir desde el lunes"*.

### 5.3 Por qué CUSUM y no un modelo predictivo
- No existen datos públicos longitudinales etiquetados (eventos de riesgo en el tiempo) para entrenar un predictor individual.
- Cada persona es su propio control una vez que existe una referencia suficiente. Durante el inicio se utilizan reglas explícitas; una urgencia no espera a completar la línea base.
- Parámetros (`k`, `h`) interpretables y ajustables según la prioridad de la capa A (prioridad alta → umbral más sensible).

---

## 6. Modelo de operación

```
Señal CUSUM ──► Panel OAM ──► FUNCIONARIO/A REVISA (decisión humana)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  Sin acción (se registra)  Llamar a la persona o     Derivar: CESFAM, visita
                            a su contacto autorizado  domiciliaria, junta de vecinos
```

| Nivel | Condición | Acción |
|---|---|---|
| 0 · Verde · Seguimiento habitual | Bienestar estable, actividades mantenidas y apoyo disponible | Continuar controles periódicos |
| 1 · Amarillo · Atención preventiva | Señales aisladas | Seguimiento y preguntas para profundizar |
| 2 · Naranja · Revisión prioritaria | Varias señales, cambios persistentes o pérdida de autonomía | Revisión del equipo y contacto oportuno |
| 3 · Rojo · Situación urgente | Necesidad de ayuda inmediata, caída con lesión o síntomas agudos que requieren atención | Activar el protocolo correspondiente, sin esperar el análisis de IA |

- La IA no decide intervenciones de forma autónoma. El equipo ejecuta el protocolo urgente sin esperar su análisis.
- La información insuficiente se muestra aparte y no equivale a verde. La falta de respuesta se gestiona como situación de contacto, sin presumir una emergencia confirmada.
- La persona elige su contacto de confianza y puede salirse en cualquier momento.
- El funcionario marca cada alerta como *útil / falsa alarma* → sirve para ajustar umbrales.

Campos, reglas de demostración y escenarios sintéticos: [Definición del MVP](MVP_PARAMETROS_Y_SIMULACION.md).

---

## 7. Ética y privacidad (25% de la nota)

| Restricción del desafío | Medida |
|---|---|
| Consentimiento informado | Inscripción presencial y voluntaria con monitor; retiro en cualquier momento |
| Minimización de datos de salud | Campos definidos por propósito en el MVP; datos ficticios en la demo. En operación real, indicadores y acceso restringido; sin grabaciones ni diagnósticos inferidos |
| No vigilancia invasiva | Sin cámaras, sensores ni GPS; solo lo que la persona quiere contar. Capa A no identifica personas |
| Decisión humana final | Toda alerta pasa por un funcionario antes de cualquier acción |
| Sesgos | Calibración del modelo A por sexo, área y pueblo indígena; en C cada persona es su propio control |
| Transparencia | Declaración de modelos de IA usados; alertas y prioridades explicadas |

**Checklist ético:** completarlo en los dos checkpoints. **Sin checklist a las 14:45, no hay evaluación.**

---

## 8. Datos

| Dato | Uso | Ubicación |
|---|---|---|
| CASEN 2024 (+ base comunal) | Estimar modelo A | `data/raw/casen/` |
| Censo 2024 (parquet) | Aplicar modelo A por comuna | `data/raw/censo/` |
| Informes CASEN | Cifras del pitch | `docs/pitch/` |
| Check-ins sintéticos | Demo capa C | `data/synthetic/` |

---

## 9. Entregables y tareas de hoy

| # | Tarea | Capa | Responsable | Estado |
|---|---|---|---|---|
| T1 | Cargar y limpiar CASEN 60+ (unión con base comunal, códigos negativos → NaN) | A | Estadístico | ⬜ |
| T2 | Estimar regresión logística + validación + odds ratios | A | Estadístico | ⬜ |
| T3 | Agregar Censo 60+ por comuna y aplicar modelo → ranking | A | Estadístico | ⬜ |
| T4 | Regla de prioridad al inscribir (alta/media/baja) | A | Estadístico | ⬜ |
| T5 | Check-ins sintéticos (5 personas, 14 días, cuatro niveles y faltantes) | C | Estadístico | ⬜ |
| T6 | Reglas de niveles 0–3 y alerta explicada; CUSUM complementario con referencia | C | Estadístico | ⬜ |
| T7 | Extracción voz/texto → JSON de indicadores con LLM | C | Técnico | ⬜ |
| T8 | Panel OAM (semáforo, alertas, botón revisar/derivar, ranking) | A+C | Técnico | ⬜ |
| T9 | Preguntas del check-in y protocolo de la OAM | Operación | Social / salud | ⬜ |
| T10 | Checklist ético + declaración de transparencia | Ética | Todo el equipo | ⬜ |
| T11 | Pitch y guion de la demo | Pitch | Todo el equipo | ⬜ |

**Prioridad si falta tiempo:** C (T5–T7) > T10 > panel (T8) > A (T1–T3) > T4.

## 10. Guion de la demo (5 min)

1. **Problema (45 s):** cifra de personas mayores solas + baja capacidad de la OAM.
2. **Dónde (45 s):** ranking comunal (Producto 1).
3. **Inscripción (30 s):** el monitor inscribe a Rosa → prioridad (Producto 2).
4. **Check-in (1 min):** audio de Rosa → indicadores extraídos en vivo.
5. **Alerta (1 min):** series de días → cambios persistentes → nivel naranja explicado; evento urgente independiente → rojo y protocolo simulado sin esperar IA.
6. **Decisión humana (30 s):** el funcionario revisa y deriva al CESFAM.
7. **Ética e impacto (30 s):** consentimiento, minimización, escalamiento a otras comunas.

## 11. Preguntas esperables del jurado

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué necesita IA? | Entender respuestas habladas libres de personas con baja alfabetización digital; sin IA requiere formularios o un operador por llamada |
| ¿Con qué datos validaron? | Modelo A: se evaluará con CASEN, AUC y calibración; se reportarán solo resultados calculados. Capa C: los sintéticos comprueban el flujo de demostración; los umbrales requieren evaluación en un piloto |
| ¿No es vigilancia? | Solo lo que la persona quiere contar, con consentimiento y retiro libre; sin sensores; la capa A no identifica a nadie |
| ¿Y si hay falsa alarma? | Siempre la revisa un humano; las falsas alarmas cuestan una llamada, no una intervención |
| ¿Qué pasa si no contesta? | Se abre una situación de contacto para revisar horario, teléfono, accesibilidad y contexto. No se inventan datos de salud ni se confirma una emergencia solo por falta de respuesta |
| ¿Mal uso? | Un municipio podría usar el puntaje para negar beneficios → el puntaje solo define intensidad de acompañamiento, nunca elegibilidad |
