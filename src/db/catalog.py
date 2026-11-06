"""Immutable catalog of dimensions and indicators (fed later to the LLM prompt)."""
from __future__ import annotations

import json
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
    allowed_values: tuple[str, ...] | None = None


DIMENSIONS: tuple[Dimension, ...] = (
    Dimension("aislamiento", "Aislamiento social"),
    Dimension("funcional", "Deterioro funcional"),
    Dimension("medicacion", "Medicamentos y tratamientos"),
    Dimension("emocional_cognitiva", "Salud emocional y cognitiva"),
    Dimension("seguridad", "Seguridad y emergencias"),
)

_P = " Período: desde la última conversación, máximo 24 horas."


def _ind(code, dim, vtype, allowed, desc, urgent=False):
    return Indicator(code, dim, vtype, desc + _P, urgent, tuple(allowed) if allowed else None)


INDICATORS: tuple[Indicator, ...] = (
    _ind("soledad_percibida", "aislamiento", "category", ("no", "a_veces", "frecuente"),
         "Sensación de soledad que la persona declara: no se siente sola, a veces o con frecuencia. No se deduce de vivir sola."),
    _ind("contacto_social_24h", "aislamiento", "bool", None,
         "Verdadero si la persona conversó con alguien (familia, vecinos, amistades) en el período."),
    _ind("menor_contacto_habitual", "aislamiento", "bool", None,
         "Verdadero si la persona refiere tener menos contacto con otras personas que lo habitual para ella."),
    _ind("apoyo_disponible", "aislamiento", "bool", None,
         "Verdadero si la persona declara contar con alguien que puede ayudarla si lo necesita; falso si refiere haber perdido ese apoyo."),
    _ind("cambio_autonomia", "funcional", "category", ("sin_cambio", "mejora", "empeora"),
         "Cambio reportado en su autonomía para las actividades cotidianas respecto de su situación habitual: sin cambio, mejora o empeora."),
    _ind("dificultad_puntual_reportada", "funcional", "bool", None,
         "Verdadero si la persona refiere una dificultad puntual en una actividad cotidiana, sin que se haya confirmado un cambio en su autonomía."),
    _ind("actividad_afectada", "funcional", "list",
         ("desplazarse", "asearse", "vestirse", "alimentarse", "comprar", "preparar_alimentos", "otra"),
         "Actividades cotidianas en las que refiere dificultad; lista vacía si no menciona ninguna."),
    _ind("adherencia_reportada", "medicacion", "category", ("completa", "parcial", "ninguna", "no_aplica"),
         "Cumplimiento reportado de sus medicamentos: completa, parcial o ninguna; no_aplica si no tiene tratamiento."),
    _ind("barrera_tratamiento", "medicacion", "list", ("olvido", "acceso", "molestia_reportada", "otra"),
         "Motivos que la persona da para no seguir su tratamiento (olvido, no conseguir los medicamentos, molestias, otro); lista vacía si no reporta barrera."),
    _ind("animo_reportado", "emocional_cognitiva", "category", ("bien", "regular", "mal"),
         "Estado de ánimo que la persona declara: bien, regular o mal."),
    _ind("tristeza_reportada", "emocional_cognitiva", "category", ("no", "ocasional", "persistente"),
         "Tristeza que la persona declara sentir: no, ocasional o persistente."),
    _ind("confusion_nueva_reportada", "emocional_cognitiva", "bool", None,
         "Verdadero solo si la persona declara explícitamente confusión nueva; no es un diagnóstico ni se infiere de una frase confusa."),
    _ind("caida_reportada", "seguridad", "bool", None,
         "Verdadero si la persona refiere haberse caído en el período (por sí sola, sin que se infiera una lesión)."),
    _ind("lesion_reportada", "seguridad", "bool", None,
         "Verdadero si la persona refiere una lesión, golpe o dolor intenso asociado a un incidente reciente.", True),
    _ind("sintoma_agudo_protocolo", "seguridad", "bool", None,
         "Verdadero si refiere un síntoma agudo contemplado en el guion de emergencia (por ejemplo dolor de pecho, falta de aire o desmayo).", True),
    _ind("necesita_ayuda_inmediata", "seguridad", "bool", None,
         "Verdadero solo si la persona pide ayuda de forma explícita ahora o dice necesitar que alguien vaya a verla de inmediato.", True),
)


def seed_catalog(conn: sqlite3.Connection) -> None:
    """Insert dimensions and indicators (idempotent)."""
    conn.executemany(
        "INSERT OR IGNORE INTO dimension (code, name) VALUES (?, ?)",
        [(d.code, d.name) for d in DIMENSIONS],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO indicator"
        " (code, dimension_code, value_type, allowed_values, description, is_urgent_trigger)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        [(i.code, i.dimension_code, i.value_type,
          json.dumps(list(i.allowed_values)) if i.allowed_values else None,
          i.description, int(i.is_urgent_trigger)) for i in INDICATORS],
    )
    conn.commit()
