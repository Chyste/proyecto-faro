"""Deterministic synthetic dataset: 5 fictional older adults x 14 days of check-ins.

No randomness: wording variation comes from template pools indexed by day and person.
Pipeline outputs (extractions, observations, alerts, cusum_state) are NOT seeded.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta

DEFAULT_START = "2026-10-23"
N_DAYS = 14
COMUNA_CUT = 13129  # San Joaquin
TZ = "-03:00"

STAFF = (
    ("Camila Rojas", "monitor_oam"),
    ("Dr. Pablo Díaz", "cesfam"),
)


@dataclass(frozen=True)
class PersonSpec:
    name: str
    full_name: str
    birth_year: int
    lives_alone: bool
    priority: str
    contact_name: str
    contact_relation: str


PEOPLE = (
    PersonSpec("Rosa", "Rosa Ficticia Soto", 1947, True, "alta", "Marta Soto", "hija"),
    PersonSpec("Luis", "Luis Ficticio Pérez", 1954, True, "media", "Andrés Pérez", "hijo"),
    PersonSpec("Carmen", "Carmen Ficticia Vera", 1942, True, "alta", "Paola Vera", "nieta"),
    PersonSpec("Jorge", "Jorge Ficticio Mora", 1958, False, "baja", "Ana Mora", "esposa"),
    PersonSpec("Elena", "Elena Ficticia Lagos", 1945, True, "media", "Rodrigo Lagos", "sobrino"),
)

# question code, assistant wording (name interpolated where {n})
ROTATING = ("salio_casa", "alimentacion", "sueno", "dificultad_avd", "acceso_remedios")

GREETINGS = (
    "Buenos días, {n}. ¿Cómo amaneció hoy?",
    "Hola {n}, buen día. ¿Cómo se siente esta mañana?",
    "Buenos días {n}, ¿cómo le fue en la noche, cómo amaneció?",
    "Hola {n}, ¿cómo ha amanecido hoy?",
)
QUESTIONS = {
    "adherencia": (
        "¿Se acordó de tomar sus remedios hoy?",
        "¿Pudo tomar sus remedios como le indicaron?",
        "¿Cómo va con sus remedios, los ha tomado?",
    ),
    "contacto_social": (
        "¿Conversó con alguien ayer o esta mañana?",
        "¿Ha hablado con algún familiar o vecino estos días?",
        "¿Alguien la pasó a ver o conversó con usted?",
    ),
    "salio_casa": ("¿Pudo salir de la casa estos días?", "¿Salió a hacer algún trámite o a caminar?"),
    "alimentacion": ("¿Ha estado comiendo bien?", "¿Qué tal el almuerzo, pudo comer con ganas?"),
    "sueno": ("¿Cómo durmió anoche?", "¿Pudo descansar bien en la noche?"),
    "dificultad_avd": (
        "¿Pudo arreglarse y hacer sus cosas de la casa sin problemas?",
        "¿Le costó algo hacer las cosas del día, como bañarse o cocinar?",
    ),
    "acceso_remedios": ("¿Le quedan remedios suficientes?", "¿Tiene todos sus remedios en la casa?"),
}
GOODBYES = (
    "Muchas gracias, {n}. Que tenga un lindo día, mañana le vuelvo a escribir.",
    "Gracias por conversar conmigo, {n}. Cualquier cosa me avisa. Hasta mañana.",
    "Perfecto, {n}, gracias. Que le vaya muy bien, nos hablamos mañana.",
)

# Default (stable / good) answers per question code, indexed by day + person offset.
GOOD = {
    "animo": ("Bien, gracias, amanecí tranquila.", "Todo bien, con ánimo hoy.", "Bien nomás, contenta con el solcito.", "Muy bien, gracias por preguntar."),
    "adherencia": ("Sí, ya me tomé todos los remedios.", "Sí, a la hora de siempre.", "Claro, me los tomé con el desayuno.", "Sí, no se me ha pasado ninguno."),
    "contacto_social": ("Sí, hablé con mi hija por teléfono.", "Sí, vino la vecina a tomar once ayer.", "Sí, conversé con mi familia en la tarde.", "Sí, estuve conversando con unas amigas."),
    "salio_casa": ("Sí, fui a la feria ayer.", "Salí a caminar un ratito a la plaza.", "Sí, fui a comprar el pan.", "Fui a la farmacia y volví al tiro."),
    "alimentacion": ("Sí, comí bien, hice porotos.", "Comí harto, me preparé un buen almuerzo.", "Bien, almorcé y tomé once.", "Sí, comiendo normal, gracias."),
    "sueno": ("Dormí bien, de corrido.", "Bien, descansé harto.", "Dormí tranquila toda la noche.", "Sí, dormí como lirón."),
    "dificultad_avd": ("No, pude hacer todo sola sin problemas.", "Nada, hice mis cosas como siempre.", "Sin problemas, me arreglé y ordené la casa.", "No, todo bien, me las arreglo bien."),
    "acceso_remedios": ("Sí, tengo para todo el mes.", "Sí, me alcanzan todavía.", "Tengo suficientes, gracias.", "Sí, la semana pasada los retiré del consultorio."),
}

ROSA_LATE = {
    "animo": {9: "Más o menos, un poco decaída.", 10: "Regular nomás, con poco ánimo.", 11: "Mal, sin ganas de nada hoy.", 12: "Decaída, no tengo ganas de levantarme.", 13: "Mal, muy desanimada.", 14: "Muy mal, me siento apagada."},
    "adherencia": {9: "A veces se me olvida alguna pastilla.", 10: "Me tomé solo algunas, se me pasaron.", 11: "No, se me acabaron las pastillas.", 12: "No he podido tomar nada, se me acabaron las pastillas.", 13: "Sigo sin remedios, no he podido ir a buscarlos.", 14: "No, sigo sin pastillas."},
    "contacto_social": {9: "Hablé poquito con la vecina.", 10: "Solo un ratito con mi hija por teléfono.", 11: "No, ayer no vino nadie.", 12: "No, no he hablado con nadie.", 13: "No, hace días que no converso con nadie.", 14: "No, nadie, estoy sola."},
    "salio_casa": {9: "Salí poquito, solo al patio.", 10: "No, ya casi no salgo.", 11: "No he salido.", 12: "No, no he salido de la casa.", 13: "No salgo desde hace días.", 14: "No, no he salido."},
    "alimentacion": {9: "Comí un poco menos.", 10: "Comí poquito.", 11: "Casi no tengo hambre.", 12: "Tomé solo un té.", 13: "Casi no he comido.", 14: "Muy poco, no me dan ganas."},
    "sueno": {9: "Dormí algo inquieta.", 10: "Dormí mal, me desperté varias veces.", 11: "Casi no dormí.", 12: "Mal, di vueltas toda la noche.", 13: "No pude dormir.", 14: "Dormí muy mal."},
    "dificultad_avd": {9: "Me costó un poco ordenar.", 10: "Me cuesta más hacer las cosas.", 11: "Me cuesta todo, no hice nada.", 12: "Casi no hice nada hoy.", 13: "Me cuesta hasta vestirme.", 14: "No pude hacer nada de la casa."},
    "acceso_remedios": {9: "Me quedan pocos.", 10: "Me quedan muy pocos.", 11: "No, se me acabaron los remedios.", 12: "No tengo, se me acabaron.", 13: "No, sin remedios todavía.", 14: "No tengo remedios."},
}

CARMEN_FALL = {
    "animo": "Ay, mal. Me caí en el baño y no me puedo levantar, me duele mucho la cadera.",
    "adherencia": "No he podido ni llegar a mis remedios, estoy en el suelo desde que me caí.",
    "contacto_social": "No, estoy sola. Por favor ayúdeme, me caí y no puedo pararme.",
    "salio_casa": "No, no puedo moverme, me caí y me duele la cadera.",
    "alimentacion": "No he comido nada, no me puedo levantar de la caída.",
    "sueno": "No dormí, me duele mucho desde que me caí.",
    "dificultad_avd": "No puedo hacer nada, me caí y no me puedo mover.",
    "acceso_remedios": "Están en la cocina y no puedo llegar, me caí.",
}
CARMEN_AFTER = {
    "animo": "Un poco mejor, mi nieta vino y me llevó al consultorio.",
    "adherencia": "Sí, mi nieta me ayudó con los remedios.",
    "contacto_social": "Sí, mi nieta se quedó conmigo.",
    "salio_casa": "Solo para ir al consultorio con mi nieta.",
    "alimentacion": "Comí un poquito, mi nieta me hizo sopa.",
    "sueno": "Dormí más o menos, todavía me duele.",
    "dificultad_avd": "Me cuesta, estoy con bastón por ahora.",
    "acceso_remedios": "Sí, mi nieta compró lo que faltaba.",
}

JORGE_BAD = {"animo": "Más o menos, dormí mal anoche y ando cansado.", "sueno": "Mal, no pude dormir casi nada."}


def _person_reply(spec: PersonSpec, idx: int, day: int, code: str) -> str:
    if spec.name == "Rosa" and day >= 9:
        return ROSA_LATE[code][day]
    if spec.name == "Carmen" and day == 12:
        return CARMEN_FALL[code]
    if spec.name == "Carmen" and day > 12:
        return CARMEN_AFTER[code]
    if spec.name == "Jorge" and day == 6 and code in JORGE_BAD:
        return JORGE_BAD[code]
    pool = GOOD[code]
    return pool[(day + idx) % len(pool)]


def _script(spec: PersonSpec, idx: int, day: int, when: date) -> list[tuple[str, str | None, str]]:
    """Return (role, question_code, text) turns for an answered day."""
    rot = ROTATING[when.weekday() % len(ROTATING)]
    turns: list[tuple[str, str | None, str]] = []
    asks = (("animo", GREETINGS), ("adherencia", QUESTIONS["adherencia"]),
            ("contacto_social", QUESTIONS["contacto_social"]), (rot, QUESTIONS[rot]))
    for code, pool in asks:
        text = pool[(day + idx) % len(pool)].format(n=spec.name)
        turns.append(("asistente", code, text))
        turns.append(("persona", None, _person_reply(spec, idx, day, code)))
    turns.append(("asistente", None, GOODBYES[(day + idx) % len(GOODBYES)].format(n=spec.name)))
    return turns


def _day_status(spec: PersonSpec, day: int) -> str:
    return "sin_respuesta" if spec.name == "Elena" and day >= 11 else "completada"


def seed_synthetic(conn: sqlite3.Connection, start_date: str | date = DEFAULT_START) -> None:
    """Populate staff, people, consents and 14 days of conversations (deterministic)."""
    start = date.fromisoformat(start_date) if isinstance(start_date, str) else start_date
    staff_ids = []
    for name, role in STAFF:
        cur = conn.execute("INSERT INTO staff_user (name, role) VALUES (?, ?)", (name, role))
        staff_ids.append(cur.lastrowid)
    monitor = staff_ids[0]
    granted = datetime.combine(start - timedelta(days=1), datetime.min.time()).replace(hour=9)

    for idx, spec in enumerate(PEOPLE):
        pid = conn.execute(
            "INSERT INTO person (preferred_name, birth_year, comuna_cut, lives_alone, priority, assigned_to, is_synthetic)"
            " VALUES (?, ?, ?, ?, ?, ?, 1)",
            (spec.name, spec.birth_year, COMUNA_CUT, int(spec.lives_alone), spec.priority, monitor),
        ).lastrowid
        conn.execute(
            "INSERT INTO person_identity (person_id, full_name, phone, address) VALUES (?, ?, ?, ?)",
            (pid, spec.full_name, f"+56 9 0000 000{idx + 1}", f"Calle Ficticia {100 + idx}, San Joaquín"),
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
        for day in range(1, N_DAYS + 1):
            when = start + timedelta(days=day - 1)
            status = _day_status(spec, day)
            answered = status != "sin_respuesta"
            purge = (when + timedelta(days=30)).isoformat() + "T10:00:00" + TZ
            cid = conn.execute(
                "INSERT INTO conversation (person_id, channel, started_at, status, speaker_confirmed, transcript_purge_at)"
                " VALUES (?, 'simulado', ?, ?, ?, ?)",
                (pid, f"{when.isoformat()}T10:00:00{TZ}", status, int(answered), purge),
            ).lastrowid
            if answered:
                turns = _script(spec, idx, day, when)
            else:
                turns = [("asistente", "animo", GREETINGS[(day + idx) % len(GREETINGS)].format(n=spec.name))]
            conn.executemany(
                "INSERT INTO message (conversation_id, turn, role, question_code, text) VALUES (?, ?, ?, ?, ?)",
                [(cid, t, role, code, text) for t, (role, code, text) in enumerate(turns, start=1)],
            )
    conn.commit()


_TABLES = (
    "dimension", "indicator", "staff_user", "person", "person_identity", "trusted_contact",
    "consent_record", "conversation", "message", "extraction", "observation", "cusum_state",
    "alert", "alert_evidence", "intervention",
)


def manifest(conn: sqlite3.Connection) -> dict[str, int]:
    """Row counts per table."""
    return {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in _TABLES}
