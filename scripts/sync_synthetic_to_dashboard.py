import json
from pathlib import Path
from collections import defaultdict

base_dir = Path("data/synthetic")

with open(base_dir / "personas.json") as f:
    personas_raw = json.load(f)

with open(base_dir / "catalogo.json") as f:
    catalogo = json.load(f)

with open(base_dir / "equipo.json") as f:
    equipo = {e["id"]: f"{e['name']} ({e['role'].replace('_', ' ').title()})" for e in json.load(f)}

with open(base_dir / "parametros_demo.json") as f:
    parametros = json.load(f)

esperados = []
with open(base_dir / "esperados.jsonl") as f:
    for line in f:
        if line.strip():
            esperados.append(json.loads(line))

llamadas = {}
with open(base_dir / "llamadas.jsonl") as f:
    for line in f:
        if line.strip():
            item = json.loads(line)
            llamadas[item["id"]] = item

ind_to_dim = {i["code"]: i["dimension_code"] for i in catalogo["indicadores"]}
ind_to_desc = {i["code"]: i["description"] for i in catalogo["indicadores"]}
ind_to_q = {i["code"]: (i["preguntas"][0] if i.get("preguntas") else i["code"]) for i in catalogo["indicadores"]}
dim_names = {d["code"]: d["name"] for d in catalogo["dimensiones"]}

level_map = {
    0: "estable",
    1: "preventivo",
    2: "prioritario",
    3: "urgente",
    None: "estable"
}

# 1. PERSONAS
personas_out = []
for p in personas_raw:
    p_id = p["id"]
    p_esperados = [e for e in esperados if e["persona_id"] == p_id]
    p_esperados.sort(key=lambda x: x["fecha"])
    latest_esp = p_esperados[-1]
    latest_lvl = level_map[latest_esp["nivel_esperado"]]

    # Historial de Controles
    historial_controles = []
    senales = []

    for e in p_esperados:
        l_id = e["llamada_id"]
        ll = llamadas[l_id]
        fecha_str = e["fecha"][:10]
        lvl_str = level_map[e["nivel_esperado"]]

        respuestas = []
        for code, data in e["indicadores"].items():
            ev = data.get("evidencia")
            if ev:
                dim = ind_to_dim.get(code, "aislamiento")
                q_text = ind_to_q.get(code, code)
                respuestas.append({
                    "pregunta": q_text,
                    "respuesta": ev,
                    "dominio": dim
                })

            # Check signal
            val = data.get("valor")
            is_signal = False
            sev = "media"
            if code in ("soledad_percibida",) and val in ("a_veces", "frecuente"):
                is_signal = True
                sev = "alta" if val == "frecuente" else "media"
            elif code in ("contacto_social_24h", "apoyo_disponible") and val is False:
                is_signal = True
                sev = "media"
            elif code in ("menor_contacto_habitual", "cambio_autonomia") and val in ("menor", "empeoro"):
                is_signal = True
                sev = "alta" if val == "empeoro" else "media"
            elif code in ("dificultad_puntual_reportada", "barrera_tratamiento"):
                if val is True:
                    is_signal = True
                    sev = "media"
            elif code in ("confusion_nueva_reportada", "caida_reportada", "lesion_reportada", "sintoma_agudo_protocolo", "necesita_ayuda_inmediata"):
                if val is True:
                    is_signal = True
                    sev = "alta"
            elif code in ("adherencia_reportada",) and val in ("parcial", "nula"):
                is_signal = True
                sev = "alta" if val == "nula" else "media"
            elif code in ("animo_reportado",) and val in ("regular", "mal"):
                is_signal = True
                sev = "media" if val == "regular" else "alta"
            elif code in ("tristeza_reportada",) and val is True:
                is_signal = True
                sev = "media"

            if is_signal and ev:
                senales.append({
                    "dominio": ind_to_dim.get(code, "aislamiento"),
                    "descripcion": f"{code.replace('_', ' ').capitalize()}: {ev}",
                    "fecha": fecha_str,
                    "severidad": sev
                })

        historial_controles.append({
            "id": f"c-{l_id}",
            "fecha": fecha_str,
            "tipo": "telefonica",
            "duracion": max(4, min(10, len(ll.get("mensajes", [])) // 2 + 3)),
            "resumen": e["motivo"],
            "nivelResultante": lvl_str,
            "respuestas": respuestas[:4]
        })

    # Contacto emergencia
    contactos = p.get("contactos", [])
    if contactos:
        c0 = contactos[0]
        contacto_str = f"{c0['name']} ({c0['relation']}) - {c0['phone']}"
    else:
        contacto_str = "No especificado"

    # Acciones
    acciones = []
    if p_id == 1: # Rosa
        acciones.append({
            "id": "act-101",
            "fecha": "2026-11-04",
            "tipo": "Derivación OAM Territorial",
            "descripcion": "Aviso a monitor comunitario por persistencia de soledad y barrera en retiro de fármacos crónicos (Losartán y Metformina).",
            "profesional": "Camila Rojas",
            "estado": "en_progreso"
        })
        acciones.append({
            "id": "act-102",
            "fecha": "2026-11-05",
            "tipo": "Coordinación CESFAM",
            "descripcion": "Gestión con farmacia comunal para entrega domiciliaria de medicamentos.",
            "profesional": "Dr. Pablo Díaz",
            "estado": "completada"
        })
    elif p_id == 5: # Teresa
        acciones.append({
            "id": "act-501",
            "fecha": "2026-11-02",
            "tipo": "Activación Protocolo Urgente",
            "descripcion": "Reporte de caída con dolor intenso en cadera y solicitud expresa de ayuda inmediata.",
            "profesional": "Camila Rojas",
            "estado": "en_progreso"
        })
        acciones.append({
            "id": "act-502",
            "fecha": "2026-11-03",
            "tipo": "Coordinación Familiar y Territorial",
            "descripcion": "Contacto con Paola Vera (nieta) y visita de apoyo kinésico en curso. Pendiente resolución de alta médica.",
            "profesional": "Dr. Pablo Díaz",
            "estado": "en_progreso"
        })
    elif p_id == 4: # Miguel
        acciones.append({
            "id": "act-401",
            "fecha": "2026-10-31",
            "tipo": "Interconsulta Preventiva",
            "descripcion": "Revisión médica por episodios de desorientación matinal reportados en tres llamadas consecutivas.",
            "profesional": "Dr. Pablo Díaz",
            "estado": "completada"
        })
    elif p_id == 3: # Elena
        acciones.append({
            "id": "act-301",
            "fecha": "2026-11-01",
            "tipo": "Reintento de Contacto",
            "descripcion": "Seguimiento presencial por monitor territorial tras llamadas con dificultades técnicas.",
            "profesional": "Camila Rojas",
            "estado": "completada"
        })

    estado_rev = "pendiente" if latest_lvl == "urgente" else ("en_revision" if latest_lvl == "prioritario" else "revisado")

    full_name_parts = p["identidad_ficticia"]["full_name"].split()
    apellido = full_name_parts[-1]

    meds_list = [{"name": m["name"], "source": m["source"], "verified_at": m["verified_at"]} for m in p.get("medicamentos", [])]

    personas_out.append({
        "id": f"p-{p_id}",
        "nombre": p["preferred_name"],
        "apellido": apellido,
        "edad": p["age"],
        "region": "Metropolitana de Santiago",
        "comuna": p["comuna_nombre"],
        "telefono": p["identidad_ficticia"]["phone"],
        "fechaRegistro": "2026-10-22",
        "fechaUltimoControl": latest_esp["fecha"][:10],
        "nivel": latest_lvl,
        "senales": senales[-5:],  # ultimas 5 senales
        "historialControles": historial_controles,
        "historialAcciones": acciones,
        "profesionalAsignado": equipo.get(p.get("assigned_to", 1), "Camila Rojas (Monitor OAM)"),
        "estadoRevision": estado_rev,
        "contactoEmergencia": contacto_str,
        "observaciones": f"{p.get('autonomia_base', '')} {p.get('red_apoyo_base', '')}",
        "direccion": p["identidad_ficticia"]["address"],
        "autonomia_base": p.get("autonomia_base", ""),
        "red_apoyo_base": p.get("red_apoyo_base", ""),
        "intereses": p.get("intereses", []),
        "medicamentos": meds_list,
        "scenario_id": f"escenario_{p['preferred_name'].lower()}"
    })

# 2. ALERTAS (todos los registros con nivel 1, 2 o 3, deduplicados o los ultimos mas relevantes)
alertas_out = []
# Sort esperados by date descending
esp_sorted = sorted(esperados, key=lambda x: x["fecha"], reverse=True)
p_by_id = {p["id"]: p for p in personas_raw}

for e in esp_sorted:
    lvl_num = e["nivel_esperado"]
    if lvl_num in (1, 2, 3):
        p = p_by_id[e["persona_id"]]
        full_name_parts = p["identidad_ficticia"]["full_name"].split()
        apellido = full_name_parts[-1]
        
        # detect primary signal
        sig_text = e["motivo"]
        sig_dim = "seguridad" if lvl_num == 3 else ("aislamiento" if "aislamiento" in e["motivo"].lower() or "soledad" in e["motivo"].lower() else ("emocional_cognitiva" if "confusión" in e["motivo"].lower() or "tristeza" in e["motivo"].lower() else "medicacion"))
        
        # Action suggestion based on level
        if lvl_num == 3:
            sugerencia = "Derivación urgente a monitor territorial y equipo de enlace CESFAM. Contactar red de apoyo familiar."
        elif lvl_num == 2:
            sugerencia = "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
        else:
            sugerencia = "Seguimiento preventivo en próximo check-in diario."

        estado_alerta = "pendiente" if lvl_num == 3 else ("en_revision" if lvl_num == 2 else "revisado")

        alertas_out.append({
            "id": f"alt-{e['llamada_id']}",
            "personaId": f"p-{p['id']}",
            "nombre": p["preferred_name"],
            "apellido": apellido,
            "edad": p["age"],
            "comuna": p["comuna_nombre"],
            "senalDetectada": sig_text,
            "dominio": sig_dim,
            "nivel": level_map[lvl_num],
            "fechaUltimoControl": e["fecha"][:10],
            "estadoRevision": estado_alerta,
            "explicacion": e["motivo"],
            "accionSugerida": sugerencia
        })

# 3. DATOS COMUNALES
# Main: San Joaquin from synthetic dataset
san_joaquin_niveles = defaultdict(int)
for p in personas_out:
    san_joaquin_niveles[p["nivel"]] += 1

datos_comunales_out = [
    {
        "comuna": "San Joaquín",
        "region": "Metropolitana de Santiago",
        "totalPersonas": len(personas_out),
        "alertas": len([a for a in alertas_out if a["nivel"] in ("urgente", "prioritario") and a["fechaUltimoControl"] >= "2026-11-04"]),
        "controlesRealizados": len(llamadas),
        "porcentajeControles": 94,
        "distribucionNiveles": {
            "estable": san_joaquin_niveles["estable"],
            "preventivo": san_joaquin_niveles["preventivo"],
            "prioritario": san_joaquin_niveles["prioritario"],
            "urgente": san_joaquin_niveles["urgente"]
        }
    },
    {
        "comuna": "La Granja",
        "region": "Metropolitana de Santiago",
        "totalPersonas": 4,
        "alertas": 1,
        "controlesRealizados": 52,
        "porcentajeControles": 92,
        "distribucionNiveles": { "estable": 3, "preventivo": 1, "prioritario": 0, "urgente": 0 }
    },
    {
        "comuna": "San Miguel",
        "region": "Metropolitana de Santiago",
        "totalPersonas": 3,
        "alertas": 1,
        "controlesRealizados": 41,
        "porcentajeControles": 96,
        "distribucionNiveles": { "estable": 2, "preventivo": 0, "prioritario": 1, "urgente": 0 }
    },
    {
        "comuna": "Puente Alto",
        "region": "Metropolitana de Santiago",
        "totalPersonas": 6,
        "alertas": 2,
        "controlesRealizados": 78,
        "porcentajeControles": 91,
        "distribucionNiveles": { "estable": 4, "preventivo": 1, "prioritario": 1, "urgente": 0 }
    },
    {
        "comuna": "La Florida",
        "region": "Metropolitana de Santiago",
        "totalPersonas": 5,
        "alertas": 1,
        "controlesRealizados": 67,
        "porcentajeControles": 95,
        "distribucionNiveles": { "estable": 4, "preventivo": 0, "prioritario": 1, "urgente": 0 }
    }
]

# 4. EVOLUCION MENSUAL / DIARIA (los 14 dias de simulacion)
by_date = defaultdict(lambda: {"controles": 0, "alertas": 0, "nuevos": 0})
date_first_seen = {}

for e in sorted(esperados, key=lambda x: x["fecha"]):
    d = e["fecha"][:10]
    p_id = e["persona_id"]
    if p_id not in date_first_seen:
        date_first_seen[p_id] = d
        by_date[d]["nuevos"] += 1
    
    by_date[d]["controles"] += 1
    if e["nivel_esperado"] in (1, 2, 3):
        by_date[d]["alertas"] += 1

evolucion_out = []
# Format date nicely: "23 Oct", "24 Oct", etc.
meses_es = {"10": "Oct", "11": "Nov"}
for d in sorted(by_date):
    parts = d.split("-")
    label = f"{parts[2]} {meses_es.get(parts[1], parts[1])}"
    evolucion_out.append({
        "mes": label,
        "controles": by_date[d]["controles"],
        "alertas": by_date[d]["alertas"],
        "nuevosRegistros": by_date[d]["nuevos"]
    })

# 5. DATOS DOMINIO (las 5 dimensiones del catalogo)
signals_by_dim = {
    "aislamiento": {"label": "Aislamiento social", "total": 10, "alta": 4, "media": 4, "baja": 2},
    "funcional": {"label": "Deterioro funcional", "total": 6, "alta": 2, "media": 3, "baja": 1},
    "medicacion": {"label": "Medicamentos y tratamientos", "total": 3, "alta": 2, "media": 1, "baja": 0},
    "emocional_cognitiva": {"label": "Salud emocional y cognitiva", "total": 4, "alta": 2, "media": 2, "baja": 0},
    "seguridad": {"label": "Seguridad y emergencias", "total": 5, "alta": 4, "media": 1, "baja": 0}
}

datos_dominio_out = [
    {
        "dominio": code,
        "label": data["label"],
        "total": data["total"],
        "alta": data["alta"],
        "media": data["media"],
        "baja": data["baja"]
    }
    for code, data in signals_by_dim.items()
]

# Write syntheticData.ts
ts_content = f'''// ─────────────────────────────────────────────────────────────
// Generated directly from data/synthetic/ (FARO MVP Synthetic Dataset)
// 5 personas ficticias × 14 días = 70 intentos de check-in telefónico
// ─────────────────────────────────────────────────────────────

import type {{
  Persona,
  Alerta,
  DatosComunal,
  DatosEvolucionMensual,
  DatosDominio,
}} from './types';

export const syntheticPersonas: Persona[] = {json.dumps(personas_out, indent=2, ensure_ascii=False)};

export const syntheticAlertas: Alerta[] = {json.dumps(alertas_out, indent=2, ensure_ascii=False)};

export const syntheticDatosComunales: DatosComunal[] = {json.dumps(datos_comunales_out, indent=2, ensure_ascii=False)};

export const syntheticEvolucionMensual: DatosEvolucionMensual[] = {json.dumps(evolucion_out, indent=2, ensure_ascii=False)};

export const syntheticDatosDominio: DatosDominio[] = {json.dumps(datos_dominio_out, indent=2, ensure_ascii=False)};

export function getPersonas(): Persona[] {{
  return syntheticPersonas;
}}

export function getAlertas(): Alerta[] {{
  return syntheticAlertas;
}}

export function getDatosComunales(): DatosComunal[] {{
  return syntheticDatosComunales;
}}

export function getEvolucionMensual(): DatosEvolucionMensual[] {{
  return syntheticEvolucionMensual;
}}

export function getDatosDominio(): DatosDominio[] {{
  return syntheticDatosDominio;
}}
'''

out_path = Path("dashboard/src/data/syntheticData.ts")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Generated {out_path} successfully!")
print(f"- Personas: {len(personas_out)}")
print(f"- Alertas: {len(alertas_out)}")
print(f"- Controles totales cargados: {sum(len(p['historialControles']) for p in personas_out)}")
print(f"- Evolución (días): {len(evolucion_out)}")
print(f"- Dominios de bienestar: {len(datos_dominio_out)}")

