# FARO · Definición del dashboard y las llamadas simuladas

Versión de trabajo: 6 de noviembre de 2026.

Este documento concreta el alcance inmediato: **qué datos muestra el dashboard, qué análisis realiza y cómo lo alimentan llamadas sintéticas**. Adopta los cuatro niveles y las cinco dimensiones indicadas por el equipo. Los campos y reglas detalladas son una propuesta implementable para la demo; aún no están implementados.

## 1. Las dos piezas del MVP

1. **Dashboard:** información de la persona, parámetros de seguimiento, evolución, nivel de atención, razones y acción pendiente. Una pestaña independiente presenta los análisis estadísticos disponibles y su estado.
2. **Llamadas simuladas:** perfiles y conversaciones ficticias con historia temporal. Al reproducir una llamada, se registran sus indicadores y se actualiza la ficha. La demo no requiere telefonía real.

La ruta de datos es: **perfil sintético → llamada simulada → indicadores estructurados → reglas y evolución → nivel explicado → revisión humana**.

## 2. Niveles de atención definidos por el equipo

| Nivel | Color | Significado | Acción |
|---|---|---|---|
| **0 · Seguimiento habitual** | Verde | Bienestar estable, actividades mantenidas y apoyo disponible | Continuar controles periódicos |
| **1 · Atención preventiva** | Amarillo | Señales aisladas: menor contacto social, tristeza ocasional o dificultad puntual con medicamentos | Realizar seguimiento y profundizar mediante preguntas |
| **2 · Revisión prioritaria** | Naranja | Varias señales, cambios persistentes o pérdida de autonomía respecto del historial | Enviar el caso al equipo responsable para revisión y contacto oportuno |
| **3 · Situación urgente** | Rojo | Declara necesitar ayuda inmediata, caída con lesión o síntomas agudos que requieren atención | Activar el protocolo de emergencia o asistencia inmediata correspondiente, sin esperar el análisis de IA |

**Información insuficiente** es un estado de los datos, no un quinto nivel de atención. Si no es posible evaluar, se muestra «sin evaluación actual» junto con la fecha del último resultado conocido. Una señal ya conocida no desaparece porque falten respuestas posteriores.

## 3. Datos de la persona

Un registro por persona. Los campos repetidos en una llamada no sobrescriben automáticamente la ficha inicial.

| Campo | Formato o valores | Uso en el dashboard |
|---|---|---|
| `persona_id` | ID interno, por ejemplo `SYN-001` | Relacionar ficha, llamadas y acciones |
| `es_sintetico` | Siempre `true` en la demo | Etiqueta visible «datos de demostración» |
| `nombre`, `nombre_preferido` | Texto ficticio | Encabezado y trato en la llamada |
| `edad` | Años; población de demostración de 60 años o más | Ficha; derivar tramo del modelo |
| `comuna_cut`, `comuna_nombre` | Código y nombre coherentes | Filtro y contexto territorial |
| `sexo_modelo` | Codificación homologada a CASEN, o desconocido | Solo análisis estadístico habilitado |
| `area` | Urbana / rural / desconocida | Contexto y modelo |
| `escolaridad_anios` | Años o desconocido | Entrada del modelo, si procede |
| `discapacidad_wg` | Sí / no / desconocida, según definición homologada | Entrada del modelo; no se deduce del diálogo libre |
| `vive_sola` | Sí / no / desconocido | Contexto social y modelo |
| `autonomia_base` | Actividades habituales y ayudas que utiliza | Comparar cambios en autonomía |
| `red_apoyo_base` | Quién ayuda, disponibilidad y frecuencia | Entender apoyos existentes |
| `contacto_confianza_id` | Referencia a contacto ficticio autorizado | Gestionar un aviso decidido por el equipo |
| `tiene_tratamiento` | Sí / no / desconocido | Determinar si corresponde preguntar por adherencia |
| `medicamentos_declarados` | Lista ficticia, fuente y fecha | Módulo restringido; contexto de seguimiento |
| `horario_preferido`, `intereses` | Franja y temas autorizados | Personalizar la llamada |
| `responsable_id` | Funcionario ficticio asignado | Mostrar quién atiende el caso |
| `autorizacion_demo` | Estado ficticio y fecha | Demostrar participación y pausa |

El teléfono real, RUT y dirección exacta no son necesarios para reproducir llamadas sintéticas. El vínculo a un contacto puede demostrarse con nombres ficticios sin números telefónicos utilizables.

Los medicamentos descritos en la ficha se distinguen de la adherencia reportada en cada llamada. El asistente no cambia indicaciones ni pautas. El grado de soledad tampoco se deduce de vivir sola.

## 4. Parámetros de cada llamada: cinco dimensiones

El período de referencia inicial es **desde la última conversación, con un máximo de 24 horas**, salvo que la conversación especifique otro. Si se salta un día, no se inventan respuestas para ese día. Cada observación conserva fecha, fuente y estado del dato.

| Dimensión | Campo | Valores definidos para la demo |
|---|---|---|
| **Aislamiento social** | `soledad_percibida` | `no`, `a_veces`, `frecuente` |
| | `contacto_social_24h` | Sí / no |
| | `menor_contacto_habitual` | Sí / no; cambio reportado o comparación con historia suficiente |
| | `apoyo_disponible` | Sí / no; puede actualizar la disponibilidad conocida |
| **Deterioro funcional** | `cambio_autonomia` | `sin_cambio`, `mejora`, `empeora` |
| | `dificultad_puntual_reportada` | Sí / no; requiere profundizar si no se ha confirmado cambio |
| | `actividad_afectada` | Lista: desplazarse, asearse, vestirse, alimentarse, comprar, preparar alimentos u otra |
| **Medicamentos y tratamientos** | `adherencia_reportada` | `completa`, `parcial`, `ninguna`, `no_aplica` |
| | `barrera_tratamiento` | Lista: olvido, acceso, molestia reportada, otra; vacía si no se reporta barrera |
| **Salud emocional y cognitiva** | `animo_reportado` | `bien`, `regular`, `mal` |
| | `tristeza_reportada` | `no`, `ocasional`, `persistente` |
| | `confusion_nueva_reportada` | Sí / no; declaración explícita, no diagnóstico |
| **Seguridad y emergencias** | `caida_reportada` | Sí / no |
| | `lesion_reportada` | Sí / no; en el contexto del incidente |
| | `sintoma_agudo_protocolo` | Sí / no; evento explícito contemplado en el guion de emergencia |
| | `necesita_ayuda_inmediata` | Sí / no; petición explícita |

Todos los campos admiten `null` y un motivo: `no_preguntado`, `no_sabe`, `prefiere_no_responder` o `no_comprendido`. `no_aplica` en adherencia es un valor válido cuando no tiene tratamiento; no equivale a mala adherencia.

Una dificultad habitual con apoyo no equivale automáticamente a pérdida de autonomía reciente. Una frase confusa no acredita deterioro cognitivo. Alimentación detallada, sueño y otras escalas quedan como extensiones posteriores.

### Metadatos de la llamada

Cada intento registra `llamada_id`, `persona_id`, fecha programada y del evento, `escenario_id`, `es_sintetico`, estado del intento e interlocutor confirmado. Los estados de demo son `completada`, `parcial`, `sin_respuesta`, `rechazada` y `fallo_tecnico`.

Una llamada sin respuesta o fallida no genera indicadores de salud. La falta de contacto se muestra en la bandeja operativa para seguimiento; no se convierte por sí sola en tristeza, abandono de tratamiento o una emergencia confirmada.

## 5. Reglas concretas de demostración

Estas reglas permiten reproducir los cuatro niveles con datos ficticios. **No constituyen un protocolo clínico validado**; el protocolo para una operación real debe acordarse con la institución.

### Nivel por dimensión

| Dimensión | Señal aislada de nivel 1 | Condición de nivel 2 en la demo |
|---|---|---|
| Aislamiento | Soledad reportada, menor contacto habitual o pérdida de un apoyo disponible | La señal se repite en al menos 3 llamadas válidas dentro de los últimos 5 días |
| Funcionalidad | Dificultad puntual que requiere profundizar, aún sin cambio confirmado | Empeoramiento de autonomía expresamente reportado respecto de su base |
| Tratamiento | Adherencia parcial o ninguna, o barrera que impide seguir el tratamiento | La señal se repite en al menos 3 llamadas válidas dentro de los últimos 5 días |
| Emocional y cognitiva | Ánimo bajo, tristeza o nueva confusión reportada que necesita revisión | La señal se repite en al menos 3 llamadas válidas dentro de los últimos 5 días |
| Seguridad | Un incidente incompletamente descrito, pendiente de aclarar | Caída reportada sin lesión informada, o caída cuya lesión se desconoce; revisar y aclarar |

`dificultad_puntual_reportada` permite registrar una dificultad mientras se confirma `cambio_autonomia`. No se interpreta como empeoramiento confirmado.

Si existe un evento urgente explícito —petición de ayuda inmediata, caída con lesión o síntoma agudo contemplado en el protocolo— se asigna **nivel 3** y se ejecuta primero la ruta de urgencia.

### Nivel general

1. Un evento urgente activo implica **nivel 3**, aunque el resto de los datos esté incompleto o antes fuera estable.
2. Una dimensión en nivel 2, o señales activas en dos o más dimensiones en la misma evaluación, implica **nivel 2**. Dos campos de una misma dimensión cuentan como una dimensión.
3. Una sola dimensión con señal aislada implica **nivel 1**.
4. **Nivel 0** requiere información suficiente y vigente, estabilidad y apoyo disponible. No basta con que no se haya detectado una señal.
5. Si no existe información suficiente para establecer estabilidad y tampoco hay una señal conocida, el nivel queda sin evaluar. Se conserva el último resultado con su fecha, claramente diferenciado del actual.

Las evaluaciones utilizan solo datos disponibles hasta ese momento. Las llamadas desconocidas no cuentan como señales ni como respuestas favorables. La ausencia de un apoyo requiere revisión del contexto, sin presuponer abandono.

**Resultado automatizado y estado del caso son distintos:** una mejoría posterior no cierra una tarea abierta. El nivel urgente se mantiene activo hasta que el responsable registre su resolución o corrección justificada.

### Urgencias sin esperar IA

En la simulación, el guion contiene un evento explícito `evento_urgente_guion`, con su tipo y la frase ficticia que lo respalda. Al reproducirlo se activa inmediatamente el nivel 3 y se demuestra el registro del protocolo. El extractor y los análisis estadísticos pueden procesar después el resto del diálogo.

La simulación no llama a servicios de emergencia ni envía avisos reales. La pantalla identifica «activación simulada del protocolo». El objetivo es mostrar que la ruta urgente no depende de esperar una respuesta del modelo.

## 6. Regresiones y otros resultados analíticos

### Regresión logística de contexto

El proyecto plantea ajustar una regresión con CASEN y aplicar sus relaciones a variables homologadas del Censo para obtener resultados por comuna.

**Objetivo preciso:** dependencia funcional **sin cuidador dentro del hogar**. La definición que figura en `DATOS.md` incluye personas con cuidador exclusivamente externo; por eso no debe rotularse como «sin ningún cuidador».

- `Y = 1`: `depen_fun = 1` y `persona_cuidada` en `{0, 2}`.
- `Y = 0`: no dependencia, o dependencia con cuidador dentro del hogar (`persona_cuidada` en `{1, 3}`).
- Dependencia o situación de cuidado desconocida: se trata según una regla de faltantes documentada, sin convertir automáticamente un desconocido en ausencia de evento.
- Entradas iniciales: tramo de edad, sexo del modelo, área, escolaridad, vive sola e indicador WG homologado.
- Tramos de edad: 60–64, 65–69, 70–74, 75–79, 80–84 y 85 o más.
- Ajuste ponderado según el diseño acordado para CASEN. Los errores estándar e intervalos deben considerar el diseño muestral si se presentan como inferencia poblacional.

La especificación inicial se puede expresar como:

```text
logit(P(Y = 1)) = intercepto + tramo_edad + sexo_modelo + area
                  + escolaridad_anios + vive_sola + discapacidad_wg
```

Se pueden usar modelos binomiales con enlace logit; véase la [documentación oficial de modelos lineales generalizados de statsmodels](https://www.statsmodels.org/stable/glm.html). El ajuste concreto y el tratamiento del diseño muestral aún deben implementarse y revisarse.

### Qué mostrar en el dashboard

| Resultado | Dónde se muestra | Condición para mostrarlo |
|---|---|---|
| Nivel 0–3, cinco dimensiones y explicación | Resumen de la persona | Reglas versionadas y observaciones suficientes |
| Serie temporal por dimensión | Evolución de la persona | Datos válidos; faltantes visibles como huecos |
| Estimación exploratoria según perfil CASEN | Pestaña de análisis individual, si se habilita | Modelo ajustado y revisado, entradas completas y homologadas; fuente, versión y alcance visibles |
| Coeficientes y odds ratios | Pestaña del modelo | Modelo realmente ajustado; interpretación de asociación, no causalidad |
| AUC y calibración | Pestaña del modelo | Resultados calculados sobre evaluación separada del ajuste |
| Cantidad esperada y tasa estimada por comuna | Vista territorial | Aplicación a Censo y agregación verificadas |
| Detección de cambio CUSUM | Evolución, como análisis complementario | Referencia individual y parámetros definidos; estado de calibración visible |

El nivel de atención y la salida de la regresión se muestran separados. La regresión contextual no predice automáticamente aislamiento, urgencias, adherencia o un evento futuro de esa persona. Las llamadas sintéticas prueban el flujo de software; no acreditan desempeño clínico ni sirven para validar el modelo poblacional.

Al revisar este alcance, `src/territorial/` y `src/checkin/` contienen únicamente sus archivos de inicialización. Por lo tanto, los resultados del modelo se mostrarán como **pendientes** hasta disponer de artefactos reales; no se inventarán coeficientes, porcentajes o métricas.

CUSUM requiere una referencia y parámetros de diseño; véase [NIST](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm). Para mostrarlo se pueden reservar los primeros 7 días de historia sintética como referencia didáctica y evaluar desde el día 8. Esa cantidad no se presenta como validación clínica. El manejo de indicadores binarios requiere una formulación adecuada. La ruta de urgencia opera desde el primer día.

## 7. Llamadas sintéticas: cinco personas y catorce días

Se propone **un intento programado por persona y día: 70 intentos**, incluidos los fallidos y no respondidos. Se conserva la relación entre cada conversación, sus indicadores y sus resultados esperados.

| Perfil ficticio | Historia | Qué demuestra |
|---|---|---|
| Rosa | Primera semana estable; después menor contacto, soledad y barreras de tratamiento; mejoría tras una acción registrada | Transición a amarillo/naranja y seguimiento de la acción |
| Carlos | Vive solo, se siente acompañado, mantiene actividades y apoyo | Verde sin penalizar vivir solo |
| Elena | Sin tratamiento; tristeza ocasional en una llamada, con apoyo y autonomía conservados | Amarillo; adherencia «no aplica» |
| Miguel | Confusión nueva reportada en varias llamadas; después un fallo técnico y una llamada sin respuesta | Dimensión cognitiva, persistencia y faltantes sin indicadores inventados |
| Teresa | Reporta pérdida de autonomía y, posteriormente, una caída con lesión y necesidad de ayuda inmediata | Naranja y luego rojo, con prioridad sobre cualquier promedio |

### Ejemplo de llamada sintética

```text
Asistente: Rosa, ¿ha podido conversar con alguien desde ayer?
Rosa: No, y últimamente me he sentido sola.
Asistente: ¿Ha tenido dificultades para seguir su tratamiento?
Rosa: Ayer no pude seguirlo porque no había conseguido los medicamentos.
Asistente: ¿Necesita ayuda inmediata en este momento?
Rosa: No, ahora no. Me gustaría que alguien del equipo me llamara.
```

Observaciones esperadas: soledad reportada, ausencia de contacto en el período, barrera de acceso y adherencia incompleta. El ejemplo presenta señales en dos dimensiones, por lo que las reglas de demostración asignan **nivel 2**. Pedir un contacto de seguimiento no equivale a declarar una urgencia inmediata. El resto de los campos no respondidos queda desconocido.

Otro guion puede incluir: «Me caí, me lesioné y necesito ayuda ahora». Ese evento activa **nivel 3** al reproducirse, sin esperar extracción de IA o CUSUM.

### Archivos a preparar al implementar

| Archivo propuesto | Contenido |
|---|---|
| `personas.json` | Cinco perfiles ficticios y sus preferencias |
| `llamadas.jsonl` | Intentos y conversaciones, fechas, estado y eventos explícitos del guion |
| `esperados.jsonl` | Indicadores y niveles esperados, anotados para comprobar el comportamiento |
| `observaciones.jsonl` | Salidas efectivas del extractor o del modo de reproducción, con modo identificado |
| `modelo_metadata.json` | Estado del modelo: pendiente o ajustado, versión, fuentes y métricas realmente calculadas |

Los valores esperados y la salida efectiva se mantienen separados. En modo **reproducción**, se cargan indicadores preparados y se indica que la extracción está simulada. En modo **extracción en vivo**, se procesa el texto ficticio y se compara la salida con la anotación esperada. Un cambio de modo se muestra explícitamente.

Estos archivos son un contrato de implementación; este documento no afirma que ya hayan sido generados.

## 8. Distribución del dashboard

### Vista general

Contadores de personas por nivel, casos sin evaluación actual y acciones pendientes. Tabla con nombre, comuna, nivel actual, motivo principal, última conversación útil, calidad del dato, responsable y próxima acción. Filtros por nivel, dimensión, responsable y fecha.

### Ficha de la persona

1. **Resumen:** datos personales permitidos, nivel actual, motivo, responsable y acción.
2. **Cinco dimensiones:** último estado, fuente, fecha y datos pendientes; detalle al abrir cada dimensión.
3. **Evolución:** gráficas separadas por indicador, historial de niveles y acciones. Los valores faltantes se representan como huecos.
4. **Llamadas simuladas:** historial, estado y botón «Reproducir siguiente llamada». Los textos ficticios están identificados como material de demostración.
5. **Análisis:** regresión y detector de cambio, con fuente, versión y estado disponible/pendiente.
6. **Gestión:** registrar contacto, asignar, derivar y cerrar con resultado. La pantalla de urgencia muestra la activación simulada del protocolo.

Los datos de salud y de contacto se filtran según rol. La ficha conserva todo el historial autorizado; la vista general muestra las columnas necesarias para priorizar.

## 9. Condiciones de una demo coherente

- Cada color tiene un motivo vinculado a observaciones y una acción.
- Existen ejemplos de los cuatro niveles y de información insuficiente.
- Ninguna llamada fallida inventa respuestas y ningún desconocido equivale a verde.
- La urgencia se activa antes de los análisis de IA o estadísticos y permanece pendiente hasta revisión humana.
- El caso de una persona que vive sola y está acompañada se mantiene estable.
- El ejemplo sin tratamiento usa «no aplica» correctamente.
- El modelo y sus métricas se presentan solo cuando existen; los datos sintéticos y el modo de extracción se identifican.
- Las acciones y derivaciones quedan registradas; una mejoría posterior no las cierra automáticamente.

La arquitectura y el diseño general se desarrollan en [Etapa 3](ETAPA_3_DISENO.md). Este documento concreta los campos, niveles y simulación que deben guiar la construcción inmediata.
