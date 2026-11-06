"""Attention-level rules (contract section 5). Pure functions: no database access.

Rules are a demonstration, not a validated clinical protocol.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from src.db.catalog import INDICATORS

RULE_VERSION = "demo-v1"
WINDOW_DAYS = 5
PERSISTENCE_MIN = 3

DIM_OF = {i.code: i.dimension_code for i in INDICATORS}
DIMENSIONS = ("aislamiento", "funcional", "medicacion", "emocional_cognitiva", "seguridad")
DIM_NAME = {"aislamiento": "aislamiento social", "funcional": "deterioro funcional",
            "medicacion": "medicamentos y tratamientos", "emocional_cognitiva": "salud emocional y cognitiva",
            "seguridad": "seguridad y emergencias"}
PERSISTENT_DIMS = ("aislamiento", "medicacion", "emocional_cognitiva")


@dataclass(frozen=True)
class Obs:
    id: int
    indicator: str
    value: object  # bool | str | list | None
    state: str = "informado"


@dataclass(frozen=True)
class Call:
    conversation_id: int
    day: date
    valid: bool  # completada / parcial
    observations: tuple[Obs, ...] = ()


@dataclass(frozen=True)
class AssessmentResult:
    level: int | None
    dimension_levels: dict
    reasons: list = field(default_factory=list)


def _vals(call: Call) -> dict[str, Obs]:
    return {o.indicator: o for o in call.observations if o.state == "informado" and o.value is not None}


def signals(call: Call) -> dict[str, list[tuple[Obs, bool]]]:
    """Per dimension, the (observation, strong) signals of a call. Strong ones carry over the window.

    no_aplica and null-reason states are never signals. Mild signals (regular mood, occasional
    sadness, a punctual difficulty) count toward 3-of-5 persistence but are not carried over alone.
    """
    out: dict[str, list[tuple[Obs, bool]]] = {d: [] for d in DIMENSIONS}
    if not call.valid:
        return out
    v = _vals(call)

    def add(code, strong, cond=lambda x: True):
        o = v.get(code)
        if o is not None and cond(o.value):
            out[DIM_OF[code]].append((o, strong))

    add("soledad_percibida", False, lambda x: x == "a_veces")
    add("soledad_percibida", True, lambda x: x == "frecuente")
    add("menor_contacto_habitual", False, lambda x: x is True)
    add("apoyo_disponible", True, lambda x: x is False)
    add("cambio_autonomia", True, lambda x: x == "empeora")
    add("dificultad_puntual_reportada", False, lambda x: x is True)
    add("adherencia_reportada", False, lambda x: x == "parcial")
    add("adherencia_reportada", True, lambda x: x == "ninguna")
    add("barrera_tratamiento", False, lambda x: bool(x))
    add("animo_reportado", False, lambda x: x in ("regular", "mal"))
    add("tristeza_reportada", False, lambda x: x in ("ocasional", "persistente"))
    add("confusion_nueva_reportada", True, lambda x: x is True)
    fall = v.get("caida_reportada")
    if fall is not None and fall.value is True and not (v.get("lesion_reportada") and v["lesion_reportada"].value is True):
        out["seguridad"].append((fall, True))
    return out


def urgent_observations(call: Call) -> list[Obs]:
    """Observations that make the call urgent (explicit help request, acute symptom, fall with injury)."""
    if not call.valid:
        return []
    v = _vals(call)
    found = [v[c] for c in ("necesita_ayuda_inmediata", "sintoma_agudo_protocolo") if c in v and v[c].value is True]
    if "caida_reportada" in v and "lesion_reportada" in v and v["caida_reportada"].value is True and v["lesion_reportada"].value is True:
        found += [v["caida_reportada"], v["lesion_reportada"]]
    return found


def evaluate(calls: list[Call], open_urgent: bool = False) -> AssessmentResult:
    """Evaluate the last call of `calls` (chronological), using only data up to it."""
    cur = calls[-1]
    dims: dict = {d: None for d in DIMENSIONS}
    if not cur.valid:
        return AssessmentResult(None, dims, [_reason("C0_SIN_EVALUACION", None, [],
            "Intento sin conversación válida: no se registran indicadores de salud; se conserva la señal previa.")])

    urgent = urgent_observations(cur)
    window = [c for c in calls if c.valid and cur.day - timedelta(days=WINDOW_DAYS - 1) <= c.day <= cur.day]
    per_call = [(c, signals(c)) for c in window]
    reasons: list[dict] = []
    levels: dict[str, int] = {}
    for d in DIMENSIONS:
        today = signals(cur)[d]
        hist = [(c, s[d]) for c, s in per_call if s[d]]
        ids_window = [o.id for _, sig in hist for o, _ in sig]
        lvl, code, text = 0, None, ""
        if d == "seguridad":
            if urgent:
                lvl, code = 3, "R3_URGENTE"
                text = "Evento urgente explícito: caída con lesión, síntoma agudo o petición de ayuda inmediata."
            elif today:
                lvl, code = 2, "R2_CAIDA_SIN_LESION"
                text = "Caída reportada sin lesión informada: revisar y aclarar el incidente."
        elif d == "funcional":
            if any(s for o, s in today if o.indicator == "cambio_autonomia"):
                lvl, code = 2, "R2_FUNCIONAL_EMPEORA"
                text = "Empeoramiento de la autonomía expresamente reportado respecto de su base."
            elif today or any(strong for _, sig in hist for _, strong in sig):
                lvl, code = 1, "R1_FUNCIONAL"
                text = "Dificultad puntual reportada o empeoramiento reciente aún en la ventana de 5 días; confirmar cambio."
        else:
            if len(hist) >= PERSISTENCE_MIN:
                lvl, code = 2, f"R2_{d.upper()}_PERSISTENTE"
                text = f"Señal de {DIM_NAME[d]} en {len(hist)} llamadas válidas dentro de los últimos {WINDOW_DAYS} días."
            elif today or any(strong for _, sig in hist for _, strong in sig):
                lvl, code = 1, f"R1_{d.upper()}"
                text = (f"Señal aislada de {DIM_NAME[d]} reportada hoy." if today else
                        f"Señal reciente de {DIM_NAME[d]} aún dentro de la ventana de {WINDOW_DAYS} días.")
        levels[d] = lvl
        if lvl:
            ids = [o.id for o in urgent] if lvl == 3 else (ids_window if lvl == 2 and d in PERSISTENT_DIMS else
                  [o.id for o, _ in today] or ids_window)
            reasons.append(_reason(code, d, ids, text))
    dims = dict(levels)

    flagged = [d for d, v in levels.items() if v >= 1]
    if urgent or open_urgent:
        level, rc = 3, "R3_URGENTE"
        txt = ("Evento urgente activo en esta llamada." if urgent else
               "Alerta urgente abierta: el nivel 3 se mantiene hasta que un responsable la resuelva.")
        ids = [o.id for o in urgent]
    elif any(v == 2 for v in levels.values()):
        level, rc, ids = 2, "R2_DIMENSION_NIVEL2", [i for r in reasons for i in r["observation_ids"]]
        txt = "Al menos una dimensión en nivel 2 (persistencia o pérdida de autonomía reportada)."
    elif len(flagged) >= 2:
        level, rc, ids = 2, "R2_VARIAS_DIMENSIONES", [i for r in reasons for i in r["observation_ids"]]
        txt = "Señales activas en dos o más dimensiones: " + ", ".join(DIM_NAME[d] for d in flagged) + "."
    elif len(flagged) == 1:
        level, rc, ids = 1, "R1_SENAL_AISLADA", [i for r in reasons for i in r["observation_ids"]]
        txt = f"Una sola dimensión con señal aislada: {DIM_NAME[flagged[0]]}."
    elif _vals(cur):
        level, rc, ids, txt = 0, "R0_ESTABLE", [], "Información suficiente, sin señales activas y con apoyo disponible."
    else:
        level, rc, ids = None, "C0_SIN_EVALUACION", []
        txt = "Información insuficiente en esta llamada: sin evaluación actual (no equivale a nivel 0)."
    reasons.insert(0, _reason(rc, None, ids, txt))
    return AssessmentResult(level, dims, reasons)


def _reason(rule_code, dimension_code, observation_ids, explanation) -> dict:
    return {"rule_code": rule_code, "dimension_code": dimension_code,
            "observation_ids": list(dict.fromkeys(observation_ids)), "explanation": explanation}
