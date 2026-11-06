"""Immutable catalog of dimensions and indicators (fed later to the LLM prompt)."""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass


@dataclass(frozen=True)
class Dimension:
    code: str
    name: str


@dataclass(frozen=True)
class Indicator:
    code: str
    dimension_code: str
    value_type: str
    description: str
    is_urgent_trigger: bool = False


DIMENSIONS: tuple[Dimension, ...] = (
    Dimension("aislamiento", "Aislamiento social"),
    Dimension("funcional", "Deterioro funcional"),
    Dimension("medicacion", "Medicamentos y tratamientos"),
    Dimension("emocional_cognitiva", "Salud emocional y cognitiva"),
    Dimension("seguridad", "Seguridad y emergencias"),
)

_S = "score_0_2"
_B = "bool"


def _ind(code, dim, vtype, desc, urgent=False):
    return Indicator(code, dim, vtype, desc, urgent)


INDICATORS: tuple[Indicator, ...] = (
    _ind("contacto_social", "aislamiento", _S,
         "0 bien, 1 regular, 2 mal: frecuencia de contacto con otras personas (familia, vecinos, amistades) en los últimos días; 0 = conversó con alguien hoy o ayer, 1 = contacto escaso, 2 = no ha hablado con nadie en varios días."),
    _ind("salio_casa", "aislamiento", _S,
         "0 bien, 1 regular, 2 mal: salidas del hogar; 0 = salió en los últimos días, 1 = salió solo una vez en la semana, 2 = no sale de la casa."),
    _ind("soledad_percibida", "aislamiento", _S,
         "0 bien, 1 regular, 2 mal: sensación subjetiva de soledad; 0 = no se siente sola/o, 1 = a veces, 2 = se siente sola/o la mayor parte del tiempo."),
    _ind("dificultad_avd", "funcional", _S,
         "0 bien, 1 regular, 2 mal: dificultad para actividades básicas de la vida diaria (vestirse, bañarse, cocinar, asearse); 0 = sin dificultad, 1 = dificultad ocasional, 2 = necesita ayuda o no puede hacerlas."),
    _ind("alimentacion", "funcional", _S,
         "0 bien, 1 regular, 2 mal: alimentación; 0 = come normalmente, 1 = come menos o saltea comidas, 2 = casi no come."),
    _ind("movilidad", "funcional", _S,
         "0 bien, 1 regular, 2 mal: capacidad de desplazarse dentro y fuera de la casa; 0 = se mueve sin problemas, 1 = con dificultad o apoyo, 2 = casi no puede desplazarse."),
    _ind("adherencia", "medicacion", _S,
         "0 bien, 1 regular, 2 mal: cumplimiento de medicamentos indicados; 0 = los toma todos como corresponde, 1 = olvida algunas dosis, 2 = dejó de tomarlos."),
    _ind("acceso_remedios", "medicacion", _S,
         "0 bien, 1 regular, 2 mal: disponibilidad de medicamentos; 0 = tiene todos, 1 = le quedan pocos, 2 = se le acabaron o no puede conseguirlos."),
    _ind("motivo_no_adherencia", "medicacion", "text",
         "Motivo textual, con palabras de la persona, por el cual no toma sus medicamentos (olvido, sin stock, efectos adversos, costo). Vacío si no aplica."),
    _ind("animo", "emocional_cognitiva", _S,
         "0 bien, 1 regular, 2 mal: estado de ánimo; 0 = contenta/o o tranquila/o, 1 = decaída/o o desanimada/o a ratos, 2 = muy triste, apagada/o o sin ganas de nada."),
    _ind("sueno", "emocional_cognitiva", _S,
         "0 bien, 1 regular, 2 mal: calidad del sueño; 0 = duerme bien, 1 = duerme irregular o se despierta, 2 = casi no duerme."),
    _ind("olvidos_desorientacion", "emocional_cognitiva", _S,
         "0 bien, 1 regular, 2 mal: olvidos o desorientación; 0 = sin olvidos relevantes, 1 = olvidos frecuentes de cosas cotidianas, 2 = se pierde, no reconoce lugares o fechas, confusión."),
    _ind("caida", "seguridad", _B,
         "Verdadero si la persona refiere haberse caído recientemente o estar en el suelo sin poder levantarse.", True),
    _ind("lesion", "seguridad", _B,
         "Verdadero si la persona refiere una lesión o golpe reciente (por ejemplo dolor intenso de cadera, herida, fractura).", True),
    _ind("sintoma_agudo", "seguridad", _B,
         "Verdadero si refiere un síntoma agudo de alarma (dolor de pecho, falta de aire, mareo intenso, desmayo, confusión repentina).", True),
    _ind("solicita_ayuda", "seguridad", _B,
         "Verdadero si la persona pide ayuda de forma explícita o dice necesitar que alguien vaya a verla.", True),
    _ind("desesperanza", "seguridad", _B,
         "Verdadero si expresa desesperanza o ideas de no querer seguir viviendo, o de ser una carga.", True),
)


def seed_catalog(conn: sqlite3.Connection) -> None:
    """Insert dimensions and indicators (idempotent)."""
    conn.executemany(
        "INSERT OR IGNORE INTO dimension (code, name) VALUES (?, ?)",
        [(d.code, d.name) for d in DIMENSIONS],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO indicator (code, dimension_code, value_type, description, is_urgent_trigger)"
        " VALUES (?, ?, ?, ?, ?)",
        [(i.code, i.dimension_code, i.value_type, i.description, int(i.is_urgent_trigger)) for i in INDICATORS],
    )
    conn.commit()
