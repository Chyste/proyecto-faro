"""Deterministic synthetic dataset: 5 fictional older adults x 14 days of check-ins.

Implements the scenarios of docs/MVP_PARAMETROS_Y_SIMULACION.md section 7. No randomness:
wording variation comes from template pools indexed by day and person.
Pipeline outputs (extractions, observations, assessments, alerts, cusum_state) are NOT seeded;
only `scenario_expectation` annotations (what the pipeline should produce) are.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

DEFAULT_START = "2026-10-23"
N_DAYS = 14
COMUNA_CUT = 13129  # San Joaquin
COMUNA_NOMBRE = "San Joaquín"
TZ = "-03:00"

STAFF = (
    ("Camila Rojas", "monitor_oam"),
    ("Dr. Pablo Díaz", "cesfam"),
)


@dataclass(frozen=True)
class PersonSpec:
    name: str
    full_name: str
    age: int
    sexo: str
    vive_sola: str
    tratamiento: str
    priority: str
    escolaridad: int
    discapacidad: str
    autonomia: str
    red_apoyo: str
    horario: str
    intereses: tuple[str, ...]
    medicamentos: tuple[str, ...]
    contact_name: str
    contact_relation: str
    scenario_id: str


PEOPLE = (
    PersonSpec("Rosa", "Rosa Ficticia Soto", 79, "mujer", "si", "si", "alta", 8, "no",
               "Camina sola por el barrio, cocina y se asea sin ayuda.",
               "Hija Marta la llama a diario; una vecina la visita a veces.", "mañana",
               ("jardín", "radio", "tejido"), ("Losartán 50 mg", "Metformina 850 mg"),
               "Marta Soto", "hija", "rosa_aislamiento_tratamiento"),
    PersonSpec("Carlos", "Carlos Ficticio Pérez", 74, "hombre", "si", "si", "baja", 12, "no",
               "Independiente: sale a comprar, cocina y camina a diario.",
               "Hijo Andrés lo visita los fines de semana; participa en un club de adulto mayor.", "tarde",
               ("fútbol", "ajedrez", "noticias"), ("Enalapril 10 mg",),
               "Andrés Pérez", "hijo", "carlos_vive_solo_acompañado"),
    PersonSpec("Elena", "Elena Ficticia Lagos", 81, "mujer", "si", "no", "media", 6, "no",
               "Se maneja sola en casa; usa bastón en la calle.",
               "Sobrino Rodrigo y su vecina Julia la acompañan seguido.", "mañana",
               ("novelas", "cocina", "música"), (),
               "Rodrigo Lagos", "sobrino", "elena_sin_tratamiento"),
    PersonSpec("Miguel", "Miguel Ficticio Mora", 77, "hombre", "no", "si", "media", 10, "no",
               "Autónomo; su esposa lo acompaña en los trámites.",
               "Vive con su esposa Ana; su hija lo llama los domingos.", "tarde",
               ("pesca", "radio", "dominó"), ("Atorvastatina 20 mg",),
               "Ana Mora", "esposa", "miguel_confusion_fallos_contacto"),
    PersonSpec("Teresa", "Teresa Ficticia Vera", 83, "mujer", "si", "si", "alta", 5, "si",
               "Se desplaza con apoyo de bastón; prepara sus comidas.",
               "Nieta Paola la visita dos veces por semana; hija Carolina la llama.", "mañana",
               ("telenovelas", "bordado", "rezar el rosario"), ("Amlodipino 5 mg", "Paracetamol 500 mg"),
               "Paola Vera", "nieta", "teresa_perdida_autonomia_caida"),
)

# ---------------------------------------------------------------------------------------------
# Indicator facts per call
# ---------------------------------------------------------------------------------------------

ASK_ORDER = (
    "soledad_percibida", "contacto_social_24h", "menor_contacto_habitual", "apoyo_disponible",
    "cambio_autonomia", "dificultad_puntual_reportada", "actividad_afectada",
    "adherencia_reportada", "barrera_tratamiento",
    "animo_reportado", "tristeza_reportada", "confusion_nueva_reportada",
    "caida_reportada", "lesion_reportada", "sintoma_agudo_protocolo", "necesita_ayuda_inmediata",
)


@dataclass(frozen=True)
class Missing:
    """A null answer with its reason (no_sabe, prefiere_no_responder, no_comprendido)."""
    reason: str


BASE = {
    "soledad_percibida": "no", "contacto_social_24h": True, "apoyo_disponible": True,
    "cambio_autonomia": "sin_cambio", "adherencia_reportada": "completa", "animo_reportado": "bien",
    "confusion_nueva_reportada": False, "caida_reportada": False, "necesita_ayuda_inmediata": False,
}

URGENT_QUOTE = "Me caí, me lesioné y necesito ayuda ahora"

LEVEL_NOTES = {
    0: "Estable: sin señales y con apoyo disponible.",
    1: "Señal aislada en una sola dimensión.",
    2: "Varias dimensiones con señal o persistencia en una dimensión.",
    3: "Evento urgente explícito: nivel 3 sin esperar análisis de IA.",
    None: "Sin evaluar: no hay indicadores válidos de este intento; se conserva la señal previa.",
}


@dataclass(frozen=True)
class DayPlan:
    status: str
    facts: dict = field(default_factory=dict)
    level: int | None = None
    note: str | None = None
    urgent: tuple[str, str] | None = None  # (event type, quote)
    replies: dict = field(default_factory=dict)  # code -> literal persona text


def _facts(**kw) -> dict:
    return {**BASE, **kw}


def _ok(facts, level, note=None, **kw) -> DayPlan:
    return DayPlan("completada", facts, level, note, **kw)


def _rosa(d: int) -> DayPlan:
    if d <= 7:
        f = _facts(animo_reportado=Missing("prefiere_no_responder")) if d == 4 else _facts()
        return _ok(f, 0, "Primera semana estable." if d != 4 else "Prefiere no responder sobre su ánimo; no se interpreta como señal.")
    if d == 8:
        return _ok(_facts(soledad_percibida="a_veces", contacto_social_24h=False, menor_contacto_habitual=True), 1,
                   "Solo aislamiento: menor contacto y soledad a veces.")
    if d in (9, 10):
        return _ok(_facts(soledad_percibida="a_veces", contacto_social_24h=False, menor_contacto_habitual=True,
                          adherencia_reportada="parcial", barrera_tratamiento=["acceso"]), 2,
                   "Señales en aislamiento y tratamiento: dos dimensiones.")
    if d == 11:
        return _ok(_facts(soledad_percibida="frecuente", contacto_social_24h=False, menor_contacto_habitual=True,
                          adherencia_reportada="ninguna", barrera_tratamiento=["acceso"]), 2,
                   "Empeora: soledad frecuente y sin tratamiento por falta de acceso.")
    if d == 12:
        return _ok(_facts(soledad_percibida="a_veces", menor_contacto_habitual=True,
                          adherencia_reportada="parcial", barrera_tratamiento=["acceso"]), 2,
                   "Aún hay señales. La acción del equipo se registra en vivo durante la demo.")
    if d == 13:
        return _ok(_facts(soledad_percibida="a_veces", menor_contacto_habitual=False,
                          barrera_tratamiento=[]), 2,
                   "Mejora tras la acción, pero la soledad persiste en 3 de las últimas 5 llamadas: sigue en nivel 2.")
    return _ok(_facts(menor_contacto_habitual=False, barrera_tratamiento=[]), 2,
               "Sin señales hoy; la ventana de 5 días aún contiene aislamiento persistente: nivel 2 hasta que se limpie.")


def _carlos(d: int) -> DayPlan:
    return _ok(_facts(dificultad_puntual_reportada=False, actividad_afectada=[]), 0,
               "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.")


def _elena(d: int) -> DayPlan:
    if d == 9:
        return DayPlan("parcial", {"animo_reportado": Missing("no_comprendido"),
                                  "necesita_ayuda_inmediata": False},
                       note="Llamada interrumpida; no comprendió la pregunta de ánimo. Información insuficiente para evaluar.")
    if d == 10:
        return DayPlan("rechazada", note="Prefiere no conversar hoy; no se inventan indicadores ni nivel.")
    f = _facts(adherencia_reportada="no_aplica", tristeza_reportada="no")
    if d == 6:
        f.update(tristeza_reportada="ocasional", animo_reportado="regular")
        return _ok(f, 1, "Tristeza ocasional y ánimo regular ese día; apoyo y autonomía conservados.")
    return _ok(f, 0, "Sin tratamiento: adherencia no aplica, no cuenta como señal.")


def _miguel(d: int) -> DayPlan:
    if d == 10:
        return DayPlan("fallo_tecnico", note="Fallo técnico: sin respuestas ni indicadores; la señal previa sigue conocida.")
    if d == 11:
        return DayPlan("sin_respuesta", note="Sin respuesta: se refleja en la bandeja operativa, no como indicador.")
    confusion = d in (5, 7, 8)
    levels = {5: 1, 6: 1, 7: 1, 8: 2, 9: 2, 12: 1}
    notes = {
        8: "Tercera confusión reportada en los últimos 5 días: persistencia, nivel 2.",
        9: "Persiste la señal en la ventana de 5 días.",
        12: "La señal previa sigue dentro de la ventana; hoy sin confusión.",
    }
    return _ok(_facts(confusion_nueva_reportada=confusion), levels.get(d, 0), notes.get(d))


def _teresa(d: int) -> DayPlan:
    if d <= 5:
        f = _facts(cambio_autonomia=Missing("no_sabe")) if d == 3 else _facts()
        return _ok(f, 0, "Responde que no sabe sobre su autonomía; no cuenta como señal." if d == 3 else None)
    if d <= 9:
        return _ok(_facts(cambio_autonomia="empeora", dificultad_puntual_reportada=True,
                          actividad_afectada=["desplazarse"]), 2,
                   "Empeoramiento de autonomía expresamente reportado.")
    if d == 10:
        return _ok(_facts(dificultad_puntual_reportada=True, actividad_afectada=["desplazarse"]), 1,
                   "Dificultad puntual sin cambio confirmado.")
    if d == 11:
        return _ok(_facts(cambio_autonomia="empeora", dificultad_puntual_reportada=True,
                          actividad_afectada=["desplazarse"], caida_reportada=True, lesion_reportada=True,
                          sintoma_agudo_protocolo=False, necesita_ayuda_inmediata=True),
                   3, "Caída con lesión y petición de ayuda inmediata: nivel 3 desde el guion.",
                   urgent=("necesita_ayuda_inmediata", URGENT_QUOTE),
                   replies={
                       "caida_reportada": "Sí, me caí en el pasillo y no me puedo parar.",
                       "lesion_reportada": "Sí, me golpeé fuerte la cadera y me duele harto.",
                       "necesita_ayuda_inmediata": URGENT_QUOTE + ", por favor.",
                   })
    f = _facts(cambio_autonomia="mejora", lesion_reportada=d != 14)
    return _ok(f, 3, "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.")


PLANS = {"Rosa": _rosa, "Carlos": _carlos, "Elena": _elena, "Miguel": _miguel, "Teresa": _teresa}

# ---------------------------------------------------------------------------------------------
# Wording pools
# ---------------------------------------------------------------------------------------------

INTROS = (
    "Buenos días, {n}. Le habla el asistente automático del programa de acompañamiento. ¿Hablo con {n}?",
    "Hola {n}, buen día. Soy el asistente automático del programa de acompañamiento. ¿Estoy hablando con {n}?",
    "Buenos días {n}, le llama el asistente automático de seguimiento. ¿Me confirma que usted es {n}?",
)
CONFIRMS = ("Sí, soy yo.", "Sí, con {n}, dígame.", "Sí, aquí estoy, buenos días.", "Sí, habla {n}.")
OPENERS = (
    "Gracias por confirmar. Le haré unas preguntas cortas sobre cómo ha estado desde ayer. ",
    "Muchas gracias. Quiero saber cómo ha estado desde la última vez que conversamos. ",
    "Perfecto, gracias. Serán unas preguntas breves sobre las últimas horas. ",
)
GOODBYES = (
    "Muchas gracias, {n}. Que tenga un lindo día, mañana le vuelvo a llamar.",
    "Gracias por conversar conmigo, {n}. Cualquier cosa me avisa. Hasta mañana.",
    "Perfecto, {n}, gracias. Que le vaya muy bien, nos hablamos mañana.",
)
UNANSWERED = "Hola {n}, soy el asistente automático del programa de acompañamiento. ¿Me escucha?"

QUESTIONS = {
    "soledad_percibida": ("¿Se ha sentido sola o solo desde ayer?", "¿Ha sentido soledad desde ayer?",
                          "¿Cómo se ha sentido de compañía en las últimas 24 horas?"),
    "contacto_social_24h": ("¿Conversó con alguien desde ayer?", "¿Ha hablado con algún familiar o vecino desde ayer?",
                            "¿Alguien la o lo pasó a ver o llamó desde ayer?"),
    "menor_contacto_habitual": ("¿Ha tenido menos contacto con la gente que de costumbre?",
                                "¿Siente que ha hablado menos con los suyos que otras veces?"),
    "apoyo_disponible": ("Si necesitara ayuda, ¿tiene alguien a quien recurrir?", "¿Cuenta con alguien que la o lo apoye si hace falta?"),
    "cambio_autonomia": ("¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
                         "Comparado con lo habitual, ¿cómo ha estado para hacer sus cosas?"),
    "dificultad_puntual_reportada": ("¿Le costó algo en particular hacer sus cosas desde ayer?",
                                     "¿Tuvo alguna dificultad para algo del día a día?"),
    "actividad_afectada": ("¿Con qué actividad tuvo dificultad?", "¿Qué cosa le costó más hacer?"),
    "adherencia_reportada": ("¿Pudo tomar sus remedios como le indicaron?", "¿Se acordó de tomar sus remedios desde ayer?",
                             "¿Cómo va con sus remedios, los ha tomado?"),
    "barrera_tratamiento": ("¿Hay algo que le haya impedido tomar sus remedios?", "¿Qué le ha dificultado seguir con su tratamiento?"),
    "animo_reportado": ("¿Cómo ha estado de ánimo hoy?", "¿Cómo se siente de ánimo esta mañana?"),
    "tristeza_reportada": ("¿Ha sentido tristeza desde ayer?", "¿Se ha sentido triste en las últimas 24 horas?"),
    "confusion_nueva_reportada": ("¿Ha sentido confusión nueva, algo que antes no le pasaba?",
                                  "¿Le ha pasado de sentirse confundida o confundido de una forma distinta a lo normal?"),
    "caida_reportada": ("¿Se ha caído desde ayer?", "¿Tuvo alguna caída desde la última vez que hablamos?"),
    "lesion_reportada": ("¿Se lesionó o se golpeó fuerte?", "¿Quedó con algún dolor o golpe por eso?"),
    "sintoma_agudo_protocolo": ("¿Ha tenido dolor de pecho, falta de aire o algún desmayo?",
                                "¿Sintió algo grave como falta de aire o mareo muy fuerte?"),
    "necesita_ayuda_inmediata": ("¿Necesita ayuda inmediata en este momento?", "¿Necesita que alguien vaya a verla o verlo ahora?"),
}

_SI, _NO = "si", "no"
REPLIES = {
    ("soledad_percibida", "no"): ("No, para nada, tengo compañía.", "No, gracias a Dios, tengo con quien conversar.",
                                  "No, con mi gente cerca estoy en paz."),
    ("soledad_percibida", "a_veces"): ("A veces me da pena estar sola.", "De repente sí, a ratos me siento sola."),
    ("soledad_percibida", "frecuente"): ("Sí, casi todo el día me siento sola.", "Sí, me siento muy sola estos días."),
    ("contacto_social_24h", _SI): ("Sí, hablé con mi familia por teléfono.", "Sí, vino la vecina a tomar once ayer.",
                                   "Sí, conversé con unos amigos en la tarde.", "Sí, me llamó mi hijo anoche."),
    ("contacto_social_24h", _NO): ("No, ayer no conversé con nadie.", "No, no ha venido nadie.", "No, no he hablado con nadie."),
    ("menor_contacto_habitual", _SI): ("Sí, estos días me llaman menos.", "Sí, hablo bastante menos que antes."),
    ("menor_contacto_habitual", _NO): ("No, igual que siempre.", "No, mantengo el contacto de costumbre."),
    ("apoyo_disponible", _SI): ("Sí, mi familia está pendiente.", "Sí, tengo a mis vecinos y a mi familia.",
                                "Sí, si pasa algo llamo a mi hijo."),
    ("apoyo_disponible", _NO): ("No, ya no tengo a quién llamar.",),
    ("cambio_autonomia", "sin_cambio"): ("No, me las arreglo igual que siempre.", "Nada ha cambiado, hago mis cosas como siempre.",
                                         "Igual que antes, sin problemas."),
    ("cambio_autonomia", "mejora"): ("Un poquito mejor, ya me muevo más.", "Mejor que la semana pasada."),
    ("cambio_autonomia", "empeora"): ("Sí, me cuesta más que antes hacer mis cosas.", "Estoy peor, ya no me valgo como antes.",
                                      "Sí, noto que cada día me cuesta más."),
    ("dificultad_puntual_reportada", _SI): ("Sí, hoy me costó un poco.", "Sí, me costó harto algo de la casa."),
    ("dificultad_puntual_reportada", _NO): ("No, pude hacer todo sin problemas.", "No, todo bien en la casa."),
    ("actividad_afectada", "ninguna"): ("Ninguna, todo normal.", "Ninguna en particular."),
    ("actividad_afectada", "desplazarse"): ("Para caminar, me cuesta moverme por la casa.", "Para desplazarme, sobre todo en las escaleras."),
    ("adherencia_reportada", "completa"): ("Sí, me los tomé todos a la hora.", "Sí, no se me ha pasado ninguno.",
                                           "Claro, me los tomé con el desayuno."),
    ("adherencia_reportada", "parcial"): ("Me tomé solo algunos, se me pasaron.", "A veces se me olvida alguna pastilla."),
    ("adherencia_reportada", "ninguna"): ("No, no he podido tomar nada.", "No, se me acabaron las pastillas."),
    ("adherencia_reportada", "no_aplica"): ("No tomo remedios, no tengo tratamiento.", "No, yo no tomo ninguno.",
                                            "Ningún remedio, gracias a Dios."),
    ("barrera_tratamiento", "ninguna"): ("Nada, no hay problema.", "Nada me lo ha impedido."),
    ("barrera_tratamiento", "acceso"): ("No he podido ir a buscarlos a la farmacia.", "No conseguí los remedios, no alcancé a retirarlos."),
    ("animo_reportado", "bien"): ("Bien, gracias, amanecí con buen ánimo.", "Bien, con buen ánimo hoy.", "Bien nomás, feliz de ver el solcito."),
    ("animo_reportado", "regular"): ("Regular nomás, con el ánimo medio bajo.", "Más o menos, con poco ánimo."),
    ("animo_reportado", "mal"): ("Mal, sin ganas de nada hoy.",),
    ("tristeza_reportada", "no"): ("No, tristeza no, gracias.", "No, estoy bien."),
    ("tristeza_reportada", "ocasional"): ("De repente, me dio pena un rato ayer.", "A ratos, nada más."),
    ("tristeza_reportada", "persistente"): ("Sí, estoy triste todo el día.",),
    ("confusion_nueva_reportada", _SI): ("Sí, ayer me confundí y no supe dónde había dejado las llaves.",
                                         "Sí, sentí confusión y no entendía bien lo que pasaba."),
    ("confusion_nueva_reportada", _NO): ("No, tengo la cabeza clara.", "No, nada de eso."),
    ("caida_reportada", _SI): ("Sí, me caí en la casa.",),
    ("caida_reportada", _NO): ("No, gracias a Dios, no me he caído.", "No, ninguna caída."),
    ("lesion_reportada", _SI): ("Sí, todavía me duele la cadera del golpe.",),
    ("lesion_reportada", _NO): ("No, no me lesioné.", "No, no quedé con ningún golpe."),
    ("sintoma_agudo_protocolo", _NO): ("No, nada de eso.", "No, ninguno, gracias."),
    ("necesita_ayuda_inmediata", _NO): ("No, ahora no, gracias.", "No, por ahora estoy bien.", "No, ahora no necesito nada."),
    ("necesita_ayuda_inmediata", _SI): ("Sí, necesito ayuda ahora.",),
}
MISSING_REPLIES = {
    "no_sabe": ("Ay, no sé, no sabría decirle.", "La verdad no sé, no me acuerdo bien."),
    "prefiere_no_responder": ("Prefiero no hablar de eso, mijita.", "Eso prefiero no contestarlo, disculpe."),
    "no_comprendido": ("Perdone, no le entendí bien la pregunta.",),
}


def _key(value) -> str:
    if isinstance(value, bool):
        return _SI if value else _NO
    if isinstance(value, list):
        return value[0] if value else "ninguna"
    return value


def _reply(plan: DayPlan, code: str, value, idx: int, day: int, k: int) -> str:
    if code in plan.replies:
        return plan.replies[code]
    if code == "adherencia_reportada" and value == "parcial" and plan.facts.get("barrera_tratamiento") == ["acceso"]:
        return "Pude tomar solo algunos; me faltan los que no he podido retirar."
    pool = MISSING_REPLIES[value.reason] if isinstance(value, Missing) else REPLIES[(code, _key(value))]
    return pool[(day + idx + k) % len(pool)]


def _expected_value(value) -> str | None:
    if isinstance(value, Missing):
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return json.dumps(value)
    return value


def _script(spec: PersonSpec, idx: int, day: int, plan: DayPlan) -> list[tuple[str, str | None, str]]:
    n = spec.name
    turns: list[tuple[str, str | None, str]] = [
        ("asistente", None, INTROS[(day + idx) % len(INTROS)].format(n=n)),
        ("persona", None, CONFIRMS[(day + idx) % len(CONFIRMS)].format(n=n)),
    ]
    if plan.status == "rechazada":
        return turns + [
            ("asistente", None, "¿Le acomoda conversar un momento sobre cómo ha estado?"),
            ("persona", None, "Hoy prefiero no conversar, gracias. Otro día puede ser."),
            ("asistente", None, "De acuerdo, respetamos su decisión. Que esté muy bien."),
        ]
    codes = [c for c in ASK_ORDER if c in plan.facts]
    for k, code in enumerate(codes):
        pool = QUESTIONS[code]
        text = pool[(day + idx + k) % len(pool)]
        if k == 0:
            text = OPENERS[(day + idx) % len(OPENERS)] + text
        turns.append(("asistente", code, text))
        turns.append(("persona", None, _reply(plan, code, plan.facts[code], idx, day, k)))
    if plan.urgent:
        closing = "En esta demostración se registra la activación simulada del protocolo de ayuda inmediata y el aviso al equipo responsable."
    elif plan.status == "parcial":
        turns.extend([
            ("asistente", None, "¿Podemos continuar con las otras preguntas?"),
            ("persona", None, "Disculpe, tengo que cortar ahora. Seguimos otro día."),
        ])
        closing = "De acuerdo, dejamos las preguntas pendientes para otro momento. Gracias por conversar."
    else:
        closing = GOODBYES[(day + idx) % len(GOODBYES)].format(n=n)
    turns.append(("asistente", None, closing))
    if spec.horario == "tarde":
        turns = [(role, code, text.replace("Buenos días", "Buenas tardes").replace("buenos días", "buenas tardes")
                  .replace("buen día", "buenas tardes").replace("esta mañana", "hoy")) for role, code, text in turns]
    return turns


def _insert_person(conn, spec: PersonSpec, idx: int, monitor: int, granted: datetime) -> int:
    pid = conn.execute(
        "INSERT INTO person (preferred_name, age, comuna_cut, comuna_nombre, sexo_modelo, area, escolaridad_anios,"
        " discapacidad_wg, vive_sola, autonomia_base, red_apoyo_base, tiene_tratamiento, horario_preferido,"
        " intereses, priority, assigned_to, is_synthetic)"
        " VALUES (?, ?, ?, ?, ?, 'urbana', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        (spec.name, spec.age, COMUNA_CUT, COMUNA_NOMBRE, spec.sexo, spec.escolaridad, spec.discapacidad,
         spec.vive_sola, spec.autonomia, spec.red_apoyo, spec.tratamiento, spec.horario,
         json.dumps(list(spec.intereses), ensure_ascii=False), spec.priority, monitor),
    ).lastrowid
    conn.execute(
        "INSERT INTO person_identity (person_id, full_name, phone, address) VALUES (?, ?, ?, ?)",
        (pid, spec.full_name, f"+56 9 0000 000{idx + 1}", f"Calle Ficticia {100 + idx}, San Joaquín"),
    )
    conn.executemany(
        "INSERT INTO person_medication (person_id, name, source, verified_at) VALUES (?, ?, 'declarado en la ficha', ?)",
        [(pid, m, granted.date().isoformat()) for m in spec.medicamentos],
    )
    conn.execute(
        "INSERT INTO trusted_contact (person_id, name, relation, phone, notify_allowed) VALUES (?, ?, ?, ?, 1)",
        (pid, spec.contact_name, spec.contact_relation, f"+56 9 0000 001{idx + 1}"),
    )
    conn.execute(
        "INSERT INTO consent_record (person_id, text_version, scope_checkin, scope_sensitive, scope_third_party, granted_at)"
        " VALUES (?, 'v1-demo', 1, 1, 1, ?)",
        (pid, granted.isoformat(timespec="seconds") + TZ),
    )
    return pid


def _insert_day(conn, spec: PersonSpec, idx: int, pid: int, day: int, when: date) -> None:
    plan = PLANS[spec.name](day)
    answered = plan.status in ("completada", "parcial")
    hour = "16:00:00" if spec.horario == "tarde" else "10:00:00"
    purge = (when + timedelta(days=30)).isoformat() + "T" + hour + TZ
    urgent_type, urgent_quote = plan.urgent or (None, None)
    cid = conn.execute(
        "INSERT INTO conversation (person_id, channel, started_at, status, speaker_confirmed, transcript_purge_at,"
        " scenario_id, urgent_event_type, urgent_event_quote) VALUES (?, 'simulado', ?, ?, ?, ?, ?, ?, ?)",
        (pid, f"{when.isoformat()}T{hour}{TZ}", plan.status, int(answered or plan.status == "rechazada"), purge, spec.scenario_id,
         urgent_type, urgent_quote),
    ).lastrowid
    if answered or plan.status == "rechazada":
        turns = _script(spec, idx, day, plan)
    elif plan.status == "sin_respuesta":
        turns = [("asistente", None, UNANSWERED.format(n=spec.name))]
    else:
        turns = []  # technical failure: the call never connected
    conn.executemany(
        "INSERT INTO message (conversation_id, turn, role, question_code, text) VALUES (?, ?, ?, ?, ?)",
        [(cid, t, role, code, text) for t, (role, code, text) in enumerate(turns, start=1)],
    )
    conn.execute(
        "INSERT INTO scenario_expectation (conversation_id, indicator_code, expected_level, note) VALUES (?, NULL, ?, ?)",
        (cid, plan.level, plan.note or LEVEL_NOTES[plan.level]),
    )
    for code in (c for c in ASK_ORDER if c in plan.facts):
        value = plan.facts[code]
        note = value.reason if isinstance(value, Missing) else None
        conn.execute(
            "INSERT INTO scenario_expectation (conversation_id, indicator_code, expected_value, note) VALUES (?, ?, ?, ?)",
            (cid, code, _expected_value(value), note),
        )


def seed_synthetic(conn: sqlite3.Connection, start_date: str | date = DEFAULT_START) -> None:
    """Populate staff, people, consents, 14 days of conversations and expectations (deterministic)."""
    start = date.fromisoformat(start_date) if isinstance(start_date, str) else start_date
    staff_ids = [
        conn.execute("INSERT INTO staff_user (name, role) VALUES (?, ?)", (name, role)).lastrowid
        for name, role in STAFF
    ]
    granted = datetime.combine(start - timedelta(days=1), datetime.min.time()).replace(hour=9)
    for idx, spec in enumerate(PEOPLE):
        pid = _insert_person(conn, spec, idx, staff_ids[0], granted)
        for day in range(1, N_DAYS + 1):
            _insert_day(conn, spec, idx, pid, day, start + timedelta(days=day - 1))
    conn.commit()


_TABLES = (
    "dimension", "indicator", "staff_user", "person", "person_identity", "person_medication",
    "trusted_contact", "consent_record", "conversation", "message", "extraction", "observation",
    "cusum_state", "assessment", "scenario_expectation", "alert", "alert_evidence", "intervention",
)


def manifest(conn: sqlite3.Connection) -> dict[str, int]:
    """Row counts per table."""
    return {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in _TABLES}
