# Extracción con TypeSafe Jev

**La IA asiste, no decide.** Jev lee la conversación y devuelve respuestas tipadas (opción o probabilidad) con confianza; nunca texto libre. Las reglas de nivel y la ruta urgente por regex siguen siendo las que deciden.

## Qué es Jev
Modelo de decisión de TypeSafe (API System One, `POST https://api.typesafe.ai/v1/systemone`). Se le envía un `state` y un conjunto de preguntas; responde por pregunta con `choice` (opción, probabilidades, confianza) o `noul` (probabilidad de «sí»). Sin streaming.

## Diseño de la solicitud
Una solicitud por conversación («fan-out»): una pregunta por indicador **preguntado** (los que aparecen como `question_code` en turnos del asistente).
- `state`: `{"contexto": …24 horas, "turnos": [{"rol","pregunta","texto"}]}`.
- Categoría → **Choice** con los valores permitidos más `no_sabe`, `prefiere_no_responder`, `no_comprendido`.
- Booleano → **Noul** (verdadero/falso).
- Lista → un **Noul por opción** (`<indicador>__<opción>`).
- Red de seguridad: 3 Nouls siempre presentes (`urgente__ayuda_inmediata`, `urgente__caida_con_lesion`, `urgente__sintoma_agudo`).
- Las instrucciones piden basarse en lo que la persona **dijo** (autodeclaración) y no diagnosticar.

## Umbrales (`src/checkin/extractor_jev.py`)
| Caso | Regla | Por qué |
|---|---|---|
| Choice | confianza < `CONF_MIN`=0.5 → `pendiente_confirmar` (valor vacío) | no guardar un valor dudoso |
| Choice con motivo nulo | estado = ese motivo, valor vacío | contrato: todo campo admite null + motivo |
| Noul | p ≥ 0.7 → sí; p ≤ 0.3 → no; entre medio → `pendiente_confirmar` | zona gris a revisión humana |
| Indicadores urgentes y Nouls `urgente__*` | p ≥ 0.5 → sí (umbral más bajo) | enrutamiento por probabilidad: perder una urgencia cuesta más que una falsa alarma |
| Lista | opciones con p ≥ 0.7; cualquier opción en 0.3–0.7 → todo el campo `pendiente_confirmar` | no entregar una lista parcial |

`evidence_quote` es el turno de la persona que responde esa pregunta (determinista, no generado). `confidence` = confianza del Choice o max(p, 1−p) del Noul. Los indicadores ya fijados por la regla urgente (`source='regla'`) no se sobrescriben.

## Confianza → revisión humana
Todo lo que queda en `pendiente_confirmar` no cuenta como señal ni como dato favorable (las reglas solo leen `informado`). El valor más probable y las probabilidades quedan en `extraction.raw_json`.

## Política de la red de seguridad
Si un `urgente__*` supera 0.5 y el regex **no** detectó urgencia en esa conversación, se crea una alerta **nivel 2** `R2_POSIBLE_URGENCIA_IA` con vencimiento inmediato. Nunca nivel 3: que la IA fije el nivel urgente dejaría la decisión al modelo; la ruta regex sigue siendo la única que activa nivel 3 automáticamente. Un humano decide.

## Fallback
Si Jev falla (timeout, 5xx tras un reintento, 4xx, respuesta inválida), esa conversación se procesa en modo reproducción y se registra una fila `extraction` con `schema_valid=0` y resumen `fallback: reproducción`; el log del paso 3 lo marca. La ruta urgente (regex) corre siempre antes y no depende de Jev.

## Seguridad de la clave
Se lee de `TYPESAFE_API_KEY` (o `JEV`/`JEV_API_KEY`) en el entorno o en `.env` (ignorado por git). No se guarda en la base, logs, excepciones ni `raw_json`. Los tests usan un transporte falso y nunca llaman a la red. Modelo configurable con `TYPESAFE_MODEL` (por defecto `jev-latest`).

## Cómo ejecutar
```
uv run python -m src.checkin --mode jev --reset --limit 5     # prueba corta
uv run python -m src.checkin --mode jev --reset               # 70 conversaciones
uv run python -m src.checkin --mode jev --reset --person Teresa --day 11
```
Imprime la traza de 7 pasos (el paso 3 muestra probabilidad/confianza por campo) y al final la evaluación (`src/checkin/evaluate.py`) contra `scenario_expectation`.

## Resultados reales (corrida completa, 70 conversaciones, 67 con contacto válido)
- Precisión por campo: **660/666 correctos (99 %)**, 6 derivados a revisión (3 `actividad_afectada`, 3 `barrera_tratamiento`), **0 incorrectos**; sobre campos decididos: 100 %. La cantidad derivada a revisión varía levemente entre corridas.
- Nivel: **67/67** (las 67 conversaciones con Jev); 0 falsos rojos y 0 rojos perdidos. La llamada parcial de Elena (día 9) queda «sin evaluar» porque el nivel 0 exige respuestas informadas en al menos 2 dimensiones (`MIN_INFORMED_DIMENSIONS` en `rules.py`).
- Matriz de confusión: diagonal completa (0→43, 1→7, 2→12, 3→4) salvo ese caso.
- Falsos rojos: 0. Rojos perdidos: 0. Alertas `R2_POSIBLE_URGENCIA_IA`: 0.
- Estados `ia`: 655 informado, 5 pendiente_confirmar, 1 no_sabe, 1 prefiere_no_responder, 1 no_comprendido.
- Tokens Jev: 287 748 (entrada+salida) en total; latencia media 356 ms por conversación; 0 fallbacks.

Límite: los diálogos son sintéticos y limpios; estos números no estiman el desempeño con voz real.
