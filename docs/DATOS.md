# DATOS: inventario y mapeo de variables

Hackathon IA Aplicada, Congreso Social UC 2026, Desafío 1 "Envejecer con autonomía". Congelamiento del prototipo: 14:45.
Todo lo de este documento fue verificado contra los datos reales y los libros de códigos, salvo lo marcado como "no verificado".

## 1. Inventario

| Archivo | Fuente | Formato / tamaño | Etiqueta | Utilidad | Para qué sirve |
|---|---|---|---|---|---|
| `data/raw/casen/casen_2024.RData` | MDSF, CASEN 2024 | RData, 47 MB; 218.367 filas x 877 columnas (objeto `casen_2024`) | `[CORE-A]` | Alta | Base de personas para estimar el modelo logístico (riesgo en 60+) |
| `data/raw/casen/casen_2024_provincia_comuna.dta` | MDSF, CASEN 2024 | Stata, 2,9 MB; 218.367 x 6 | `[CORE-A]` | Alta | Aporta `comuna`, `provincia` y los factores `expp` / `expc`. La base principal NO trae comuna |
| `data/raw/censo/viv_hog_per_censo2024.zip` | INE, Censo 2024 | ZIP, 394 MB; 3 parquet | `[CORE-A]` | Alta | Microdatos a agregar por comuna (personas 18.480.432; hogares 6.622.597; viviendas 7.664.466) |
| `data/raw/casen/Libro_de_codigos_Casen_2024.xlsx` | MDSF | XLSX, 242 KB; 25 hojas (H, E, O, Y, S, R, V, PM, Var MDSF, anexos) | `[DOC-VARIABLES]` | Alta | Etiquetas de valores de CASEN (columnas: variable, etiqueta, valor, etiqueta de valor, frecuencia) |
| `data/raw/casen/Libro_de_codigos_Casen_2024_prov_comuna.xlsx` | MDSF | XLSX, 34 KB; 2 hojas | `[DOC-VARIABLES]` | Media | Describe el `.dta` y el Anexo 1 con el CUT (códigos de comuna) |
| `docs/referencia/manual_uso_microdatos_censo2024.pdf` | INE | PDF, 114 págs. | `[DOC-VARIABLES]` | Alta | Diccionario del Censo (cap. 6, págs. ~58-95) y control de divulgación (cap. 5, págs. 45-49) |
| `docs/referencia/Cuestionario_Casen_2024.pdf` | MDSF | PDF, 96 págs. | `[REFERENCIA]` | Media | Redacción exacta de s31-s34 (págs. ~66-70) y r7 (redes) |
| `docs/pitch/Dependencia_y_Cuidados_Casen2024.pdf` | MDSF, Obs. Social, may-2026 | PDF, 35 págs. | `[PITCH]` | Alta | Cifras oficiales de dependencia, cuidadores y soledad (sección 3) |
| `docs/pitch/Hogares_Unipersonales_Casen_2024.pdf` | MDSF, Obs. Social, jun-2026 | PDF, 24 págs. | `[PITCH]` | Alta | Cifras oficiales de hogares unipersonales (sección 3) |
| `docs/bases/Bases_Hackathon_IA_Congreso_Social_UC_2026-1.pdf` | Organización | PDF, 12 págs. | `[REFERENCIA]` | Baja | Reglas. Datos sugeridos: Censo, CASEN, datos abiertos municipales y sintéticos. Restricciones éticas: consentimiento informado y minimización de datos sensibles |

No hay archivos `[NO-USAR]` como tales. Sí hay columnas a evitar (ver sección 6). No existe base de check-ins de voz: el caso C (CUSUM) usa **datos sintéticos propios**.

## 2. Resumen por archivo

### 2.1 `casen_2024.RData` [CORE-A]
- Carga con `pyreadr.read_r(...)['casen_2024']`. **Todas las columnas llegan como `float64`** y sin etiquetas: los significados están en el libro de códigos. Los códigos especiales negativos (`-88` no sabe, `-99` no responde, `-77` no aplica) se deben pasar a NaN.
- Llaves: persona = `folio` + `id_persona`; hogar = `folio`; vivienda = `id_vivienda` (hoja "Llave" del libro). Sin duplicados en `(folio, id_persona)`.
- 60+ años: 51.861 filas (37.461 de 65+). 3,91 millones de personas 60+ expandidas con `expr`.
- Variables útiles para el proyecto:
  - Demografía: `edad` (0-107), `sexo`, `area`, `region`, `ecivil`, `esc`, `pueblos_indigenas`, `lugar_nac`, `r1a`.
  - Hogar: `numper`, `tot_per_h`, `tipohogar`, `men18c`, `may60c`.
  - Salud, dependencia, cuidado: `s28` (tratamiento), `s29` (GES), `s31_1..s31_7`, `s32a..s32l`, `s33a..s33l`, `s34a..s34c3`, `disc_wg`, `depen_fun`, `depen_grado`, `persona_cuidada`, `cuidador`.
  - Redes: `r7a..r7i`, `hh_d_cui`, `hh_d_apoyo`, `hh_d_tsocial`, `hh_d_conec`.
  - Diseño muestral: `expr`, `expr_osig`, `varstrat`, `varunit`.

### 2.2 `casen_2024_provincia_comuna.dta` [CORE-A]
- Columnas: `folio` (int32), `id_persona` (int8), `expp`, `expc`, `provincia`, `comuna`.
- **Trampa:** `pd.read_stata()` por defecto convierte `comuna` y `provincia` a texto (p. ej. "Recoleta"). Hay que usar `convert_categoricals=False` para obtener el CUT numérico (1101-16305).
- Cubre 335 comunas. Mediana de 297 encuestados por comuna y mínimo 16.

### 2.3 `viv_hog_per_censo2024.zip` [CORE-A]
- Se leyó el esquema directo de los parquet. Descomprimir **fuera** del proyecto (scratchpad) y leer solo las columnas necesarias: `personas` pesa 311 MB y tiene 18,5 millones de filas.
- `personas` (63 columnas). Llaves: `id_vivienda`, `id_hogar`, `id_persona`. Territorio: `region`, `provincia`, `comuna`, `comuna_bajo_umbral`, `area`.
- Variables clave: `tipo_operativo`, `sexo`, `edad`, `edad_quinquenal`, `parentesco`, `p23_est_civil`, `p25_lug_nacimiento_rec`, `p27_nacionalidad_rec`, `p28_autoid_pueblo`, `p32a..p32f` (dificultades), `discapacidad`, `escolaridad`, `sit_fuerza_trabajo`.
- `hogares` (18 columnas). Trae `tipologia_hogar` (1 = unipersonal) y acceso a internet/equipamiento (`p15*`).
- `viviendas` (25 columnas). Trae `cant_per`, `p11a_num_personas` e `indice_hacinamiento`.
- **No existe factor de expansión.** Es un censo completo: cada fila vale 1 (el manual no define ponderador).

### 2.4 Libros de códigos y manual
- `Libro_de_codigos_Casen_2024.xlsx`: hojas "S" (salud), "R" (identidades, redes y participación), "Var MDSF" (derivadas), "PM" (pobreza multidimensional), "Factor", "Llave". Formato de columnas: [vacía], variable, etiqueta, valor, etiqueta del valor, frecuencia.
- Anexo 4 (CUT) del libro CASEN y Anexo 1 del libro prov_comuna: tabla región / provincia / comuna con el código de comuna.
- Manual del Censo: diccionario de variables (cap. 6) y control de divulgación estadística (cap. 5).

## 3. Cifras para el pitch (citas textuales, con página)

Las páginas son las del PDF (coinciden con el número impreso). DC = *Dependencia y Cuidados en los hogares de Chile*; HU = *Hogares unipersonales en Chile*.

| # | Cifra (cita textual) | Fuente y pág. |
|---|---|---|
| 1 | "la proporción de personas de 60 años y más alcanzó el 20,1% del total de la población, un aumento significativo respecto al 6,6% registrado en el Censo 1992." | DC p. 8 |
| 2 | "la población de 80 años y más, el grupo más envejecido, y con mayor demanda de cuidados, se duplica en 18 años, pasando de 300 mil personas en 2006 a 650 mil en 2024." | DC p. 8 |
| 3 | "pasando de 8,3 % en 1992 a 21,8 % en 2024" (porcentaje de hogares unipersonales según los Censos) | HU p. 4 |
| 4 | "Los hogares unipersonales muestran el aumento más marcado, pasando de 9,1% en 2006 a 20,4% en 2024" (CASEN) | HU p. 6 |
| 5 | "destacando el grupo de 80 años y más, cuya proporción alcanza un 34,5% en 2024" (jefaturas de 65 a 79 años: 25,0%, tabla 3) | HU p. 8 |
| 6 | "En hogares unipersonales, la ausencia o disminución de redes de cuidado es un predictor crítico de exclusión y vulnerabilidad especialmente ante enfermedades o dependencia." | HU p. 4-5 |
| 7 | "en el grupo de 60 años o más la cifra asciende a 14,1%" (dependencia funcional; en 15 a 59 años es 1,7% y en 15+ es 4,7%) | DC p. 13 |
| 8 | "Un 12,1% corresponde a hogares unipersonales, lo que en términos absolutos equivale a cerca de 85 mil hogares en los que personas con algún grado de dependencia viven solas." | DC p. 18 |
| 9 | "el 61,1% corresponde a personas de 75 años o más" (de esas personas con dependencia que viven solas) | DC p. 18 |
| 10 | "Un 12,0% declara no tener una persona cuidadora que proporcione ayuda continua; el 53,0% reporta contar únicamente con una persona cuidadora residente en el hogar" | DC p. 23 |
| 11 | "el 5,3% no recibe ningún tipo de asistencia" (personas con dependencia severa) | DC p. 24 |
| 12 | "el 9,8% de los hogares presenta al menos una persona de 15 años o más con algún grado de dependencia funcional" (701 mil hogares) | DC p. 17 |

Notas de uso:
- La cifra 4 es porcentaje de **hogares**; la cifra 3 viene del Censo. No mezclarlas en una misma frase sin aclarar la fuente.
- Cálculos propios, replicables con estos datos y que coinciden con los informes:
  - Dependencia funcional en 60+, ponderada con `expr`: 14,13%. Coincide con la cifra 7.
  - 60+ que viven solos: 15,0% en CASEN (65+: 16,7%) y 16,5% en el Censo (conteo directo, 597.696 personas de 3.632.093).
  - De los 60+ que viven solos, 12,4% tiene dependencia funcional (cerca de 72.700 personas con `expr`).
  - Entre los 60+ dependientes que viven solos (`expr`): 24,9% no tiene cuidador, 73,5% tiene solo cuidador externo al hogar y 1,6% tiene cuidador interno (el dato proviene de `persona_cuidada`).

## 4. Mapeo de variables para el modelo A

Universo del modelo: 60+ años. Los códigos especiales (`-88`, `-99`) pasan a NaN.

### 4.1 Covariables comunes (CASEN vs Censo)

| Concepto | CASEN (variable y códigos) | Censo (variable y códigos) | ¿En ambos? / armonización |
|---|---|---|---|
| Edad | `edad` 0-107 | `edad_quinquenal` (límite inferior del tramo: 0, 5, ..., 85 = 85+); `edad` 0-85, pero **-66 (suprimida) en las 51 comunas bajo 6.000 hab.** | Sí. Usar siempre `edad_quinquenal` en el Censo y construir `(edad//5)*5` topado en 85 en CASEN |
| Sexo | `sexo` 1 hombre, 2 mujer | `sexo` 1 hombre, 2 mujer | Sí, idéntico |
| Área | `area` 1 urbano, 2 rural | `area` 1 urbano, 2 rural | Sí, idéntico |
| Vive solo / tamaño del hogar | `numper` (1-19; excluye servicio doméstico puertas adentro), `tipohogar` 1 = unipersonal, `tot_per_h` | **No viene como variable.** Se deriva: contar personas por (`id_vivienda`, `id_hogar`) con `tipo_operativo` = 2. Equivale exacto a `hogares.tipologia_hogar` = 1 (verificado: 1.437.648 unipersonales) | Sí (derivada). `numper` == 1 en CASEN. Ojo: el conteo del Censo incluye servicio doméstico puertas adentro (`parentesco` = 16) |
| Dificultad funcional / discapacidad | `disc_wg` 0 sin, 1 con (indicador Washington Group; -88 no sabe). Ítems: `s32a..s32l` (1 ninguna, 2 leve, 3 moderada, 4 severa, 5 extrema) y `s31_1..s31_6` | `discapacidad` **1 con, 2 sin**, -99. Ítems `p32a..p32f`: 1 sin dificultad, 2 algo, 3 mucha, 4 no puede hacerlo, -99 | Sí, pero **recodificar el sentido**: Censo 1 -> 1 y 2 -> 0. Regla del manual: valor 3 o 4 en algún ítem = discapacidad. Prevalencia 60+: CASEN 28,3% vs Censo 27,9% (muy cercanas) |
| Cuidado personal (ítem puntual) | `s32b` (asearse), `s32f` (vestirse), `s32a` (alimentarse), `s32d` (baño) | `p32e_dificultad_cuidado` 1-4 | Proxy aproximado: las escalas no coinciden 1 a 1. Úsese solo si se quiere un ítem de autocuidado |
| Escolaridad | `esc` (años, 0-31, solo 15+; 0,6% NA en 60+) | `escolaridad` (años, 0-24; **-99 = sin dato**) | Sí. Media en 60+: 9,50 (CASEN) vs 9,52 (Censo) |
| Pueblo indígena | `pueblos_indigenas` 0/1 (derivada de `r3`) | `p28_autoid_pueblo` 1 sí, 2 no, -99 | Sí, pero **dato sensible**: el Censo suprime categorías con menos de 50 casos por comuna. En 60+: 7,6% (CASEN) vs 9,3% (Censo): definiciones algo distintas |
| Nacido en el extranjero | `lugar_nac` 0 Chile, 1 fuera de Chile, -88 | `p25_lug_nacimiento_rec` 1 Chile, 2 otro país, -99 | Sí. Nacionalidad: `r1a` vs `p27_nacionalidad_rec` (1 chilena, 2 otra) |
| Estado civil | `ecivil` 1 casado ... 7 viudo, 8 soltero | `p23_est_civil`, mismos códigos 1-8 (-99; universo 15+) | Sí, idéntico (en 60+: viudos 19,1% CASEN vs 17,9% Censo) |
| Identificador de comuna | `comuna` (solo en el `.dta`), CUT de 4 o 5 dígitos, 1101-16305 | `comuna` (int32), mismo CUT, 1101-16305 | Sí. **Formato igual, sin ceros a la izquierda.** Ver sección 5 |
| Factor de expansión | `expr`, `expp`, `expc` | **No existe** (peso = 1) | No. Ver sección 5 |
| Región / provincia | `region` (1-16); `provincia` en el `.dta` | `region`, `provincia` | Sí |

Otras variables disponibles en ambos y que podrían sumar: situación laboral (`sit_fuerza_trabajo` en el Censo; en CASEN hay que derivarla del módulo O) y `parentesco` (`pco1` en CASEN usa otra codificación). No se verificó su armonización.

### 4.2 Variables solo en CASEN (candidatas a proxy de riesgo)

| Concepto de riesgo | Variable CASEN | Códigos | Observaciones |
|---|---|---|---|
| Dependencia funcional | `depen_fun` | 0 no dependiente, 1 dependiente | Definida para 15+. En 60+: 7.613 de 51.861 filas (14,1% ponderado) |
| Grado de dependencia | `depen_grado` | 1 severa, 2 moderada, 3 leve | NaN si no es dependiente |
| Cuidador principal | `persona_cuidada` | 0 no tiene, 1 solo integrante del hogar, 2 solo externo, 3 dentro y fuera | NaN si no es dependiente |
| Ayuda de terceros | `s33a..s33l` | 1 nunca, 2 casi nunca, 3 algunas veces, 4 muchas veces, 5 siempre | "Muchas veces o siempre" define dependencia (DC p. 6-7). Aplica solo a quien declara dificultad |
| Dificultad en AVD / AIVD | `s32a..s32l` | 1 ninguna ... 5 extrema o no puede | Incluye `s32g` salir a la calle, `s32h` tareas del hogar, `s32j` compras o ir al médico, `s32k` relacionarse con gente cercana |
| Tiene quién ayude | `s34a` (integrante del hogar), `s34c` (externo) | 1 sí, 2 no | Solo para quien tiene dificultad. `s34c2` relación (1 familiar ... 4 no familiar), `s34c3` remunerado (1 sí, 2 no) |
| Redes de apoyo (aislamiento) | `r7a` cuidado en enfermedad, `r7i` consejo ante problemas personales (también `r7b..r7h`) | 1 alguien fuera del hogar, 2 dentro, 3 ambas, 4 no conoce | En 60+: 10,2% responde "4 no conoce" en `r7a` y 20,7% en `r7i` (conteos sin ponderar). Proxy razonable de aislamiento |
| Hogar carente | `hh_d_cui` (cuidados), `hh_d_apoyo` (apoyos), `hh_d_tsocial` (trato igualitario), `hh_d_conec` (conectividad) | 0 no carente, 1 carente | Indicadores de pobreza multidimensional a nivel de hogar. No verifiqué su definición exacta |
| Salud / adherencia | `s28` (tratamiento por condición, 1-22; 22 = ninguna), `s29` (cubierto por GES, 1/2), `s30` (motivo por el que no lo cubrió el GES), `s26a` (controles en 12 meses; 0 = ninguno), `s19a..s19e` (problemas de acceso: 1 sí, 2 no), `s18` (motivo de no consulta) | | **No hay variable directa de abandono de tratamiento.** Los más cercanos son `s19d/e` (costo), `s29`/`s30` y `s26a` |
| Vive solo | `numper` == 1 o `tipohogar` == 1 | | También existe en el Censo (ver 4.1) |

### 4.3 Definiciones de la variable respuesta (opciones y conteos reales en 60+)

| Opción | Definición | Eventos (sin ponderar) | Prevalencia ponderada |
|---|---|---|---|
| Y_A (recomendada) | `depen_fun` = 1 y `persona_cuidada` en {0, 2} (sin cuidador dentro del hogar) | 2.136 | 3,8% |
| Y_B | `depen_fun` = 1 y `numper` = 1 | 1.110 | 1,9% |
| Y_C | `disc_wg` = 1 y `numper` = 1 | 2.675 | 4,4% |
| Y_D | `depen_fun` = 1 (solo dependencia) | 7.613 | 14,1% |

Recomendación: Y_A, con `vive_solo` como **covariable** (en el Censo es observable). Si "vive solo" entra a la vez en Y y en X, el modelo se vuelve circular. Y_B / Y_C sirven solo como indicador descriptivo directo, calculable en el Censo sin modelo. Con Y_D (la más estable estadísticamente) se obtendría un índice de dependencia esperada, al que se le suma después el conteo observado de personas que viven solas.

Gradiente por edad de `depen_fun` (60+, sin ponderar): 60-64: 5,5%; 65-69: 6,8%; 70-74: 11,3%; 75-79: 18,4%; 80-84: 30,6%; 85+: 53,9%.

## 5. Llaves de unión y pesos

**Unir CASEN principal con la base de comuna**
- Clave: `folio` + `id_persona`. Verificado: unión 1:1 completa (218.367 de 218.367, sin duplicados ni faltantes).
- Hay que convertir tipos: en el RData las columnas son `float64`, en el `.dta` `folio` es int32 e `id_persona` int8. Hacer `astype('int64')` en ambos lados antes de `merge(..., validate='1:1')`.
- Leer el `.dta` con `convert_categoricals=False`.

**Factores de expansión (solo CASEN)**
- `expr`: factor regional. Suma 20,13 millones de personas. Usar para estimaciones nacionales y regionales, incluido el ajuste del modelo logístico si se quiere representatividad nacional.
- `expc`: factor comunal (proyección con base Censo 2017). Suma 20,10 millones. Usar para estimaciones por comuna.
- `expp`: factor provincial. Usar para estimaciones por provincia.
- `varstrat` / `varunit`: estratos y conglomerados de varianza. Necesarios solo para errores estándar con diseño complejo.
- Ojo: la población expandida de CASEN (20,1 millones) no coincide con los 18,48 millones de personas censadas. **No mezclar conteos** de ambas fuentes: estimar tasas o probabilidades en CASEN y multiplicarlas por los conteos del Censo.
- El Censo no tiene pesos: cada fila es 1.

**Código de comuna**
- En ambas fuentes es el CUT numérico (1101 a 16305): 4 dígitos para las regiones 1-9 y 5 para las 10-16. No es necesario normalizar; unir como entero.
- Cobertura verificada: las 335 comunas de CASEN están todas en el Censo. El Censo trae 346 comunas.
- Faltan en CASEN 11 comunas: 2202, 5104, 5201, 10103, 10401, 10402, 10403, 10404, 11203, 11302, 12202. El modelo individual igual se puede aplicar a ellas, pero sin validación directa.
- En el Censo, `comuna_bajo_umbral` es 1 para las 51 comunas con menos de 6.000 personas censadas (151.199 personas), y 2 para el resto. De esas 51, 41 están presentes en CASEN.

**Armar las covariables en el Censo (esquema)**
1. Leer `personas` con solo las columnas necesarias y filtrar `tipo_operativo` == 2 (vivienda particular), `edad_quinquenal` >= 60.
2. Contar personas por (`id_vivienda`, `id_hogar`) para derivar `vive_solo`.
3. Recodificar `discapacidad` (1 -> 1, 2 -> 0) y mapear `-99` a NaN.
4. Predecir con el modelo ajustado en CASEN y agregar por `comuna` (suma de probabilidades y tasas).

## 6. Advertencias

1. **Representatividad comunal de CASEN.** El diseño es regional. Hay 335 comunas, con mediana de 85 personas 60+ por comuna; 24 comunas tienen menos de 30 y solo 142 llegan a 100. Los eventos de Y_C por comuna tienen mediana de 5. Por eso el modelo debe ser individual y agrupado (covariables, no efectos fijos de comuna). Las tasas directas de CASEN por comuna deben tomarse solo como validación y solo para comunas con n >= 100.
2. **Secreto estadístico del Censo** (manual cap. 5, págs. 45-49): `edad` queda como -66 en las 51 comunas bajo 6.000 hab.; las variables sensibles (como pueblo indígena) se suprimen para categorías con menos de 50 casos por comuna; el nivel territorial recomendado es comuna-área. No se puede bajar de comuna ni cruzar con otros datos para identificar personas.
3. **Edad.** Usar `edad_quinquenal` en el Censo para todos. El tramo `60` significa 60-64 años.
4. **Dependencia no existe en el Censo.** Solo hay dificultades (WG). La dependencia (`depen_fun`) se obtiene en CASEN con informante idóneo del hogar; el propio informe lo reconoce como medida simplificada y distinta de ENDIDE (DC p. 4 y nota 13 de la p. 13). La interpretación debe ser "dependencia esperada según perfil", no medición.
5. **Universos.** `depen_fun` solo existe para 15+ y `persona_cuidada` solo para dependientes. `disc_wg` y los ítems p32 solo para 5+. Todos los análisis de este proyecto son 60+, así que no afecta.
6. **Información de `s28`.** Verificar en el libro si admite respuesta múltiple antes de usarla como indicador de tratamiento.
7. **Ética.** Las bases del evento exigen consentimiento informado y minimización de datos sensibles. El índice territorial debe publicarse agregado por comuna, sin identificación de personas.
8. **Armonización.** Las prevalencias de CASEN y Censo en 60+ son muy cercanas (mujer 55,2% vs 55,6%; rural 14,9% vs 16,1%; discapacidad 28,3% vs 27,9%; escolaridad 9,50 vs 9,52). Es una buena señal de que el modelo transfiere. La diferencia en vive solo (15,0% vs 16,5%) conviene tenerla presente.
9. **Pitch.** Las cifras de la sección 3 provienen de los informes oficiales; las de los cálculos propios deben citarse como "elaboración propia con CASEN 2024 / Censo 2024".

## 7. Próximos pasos recomendados

1. Escribir `src/data/casen.py`: cargar RData, unir con el `.dta`, filtrar 60+, limpiar códigos negativos, derivar Y_A y `edad_q`.
2. Escribir `src/data/censo.py`: leer parquet con columnas mínimas, derivar `vive_solo`, recodificar `discapacidad`, y guardar un parquet pequeño y listo para predecir (60+, una fila por persona).
3. Ajustar regresión logística ponderada con `expr` (variables: `edad_q`, `sexo`, `area`, `esc`, `vive_solo`, `disc`, `ecivil`, `pueblo`, `extranjero`). Validar contra las tasas directas de CASEN en las 142 comunas con n >= 100.
4. Agregar por comuna: número esperado de 60+ en riesgo, tasa y ranking. Marcar las 51 comunas bajo umbral y las 11 sin cobertura CASEN.
5. Generar los check-ins de voz sintéticos para el caso C y conectar la alerta con el nivel territorial (comuna del usuario -> red de apoyo local).
6. Preparar 3-4 cifras de la sección 3 para el pitch, con una diapositiva que cite la fuente y la página.
