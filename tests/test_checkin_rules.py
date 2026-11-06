from datetime import date, timedelta
from itertools import count

from src.checkin.rules import RULE_VERSION, Call, Obs, evaluate

_ids = count(1)
D0 = date(2026, 10, 23)


def call(day, valid=True, **vals):
    obs = []
    for code, v in vals.items():
        if isinstance(v, tuple):  # (None, state)
            obs.append(Obs(next(_ids), code, None, v[1]))
        else:
            obs.append(Obs(next(_ids), code, v, "informado"))
    return Call(day, D0 + timedelta(days=day - 1), valid, tuple(obs))


STABLE = dict(soledad_percibida="no", apoyo_disponible=True, animo_reportado="bien")


def test_version():
    assert RULE_VERSION == "demo-v1"


def test_stable_is_zero_and_living_alone_not_penalised():
    r = evaluate([call(1, **STABLE, contacto_social_24h=True)])
    assert r.level == 0 and set(r.dimension_levels.values()) == {0}


def test_partial_call_with_one_informed_dimension_is_unassessed():
    # Elena day 9: interrupted call, only "no necesita ayuda" answered -> not enough to call it stable.
    r = evaluate([call(1, animo_reportado=(None, "no_comprendido"), necesita_ayuda_inmediata=False)])
    assert r.level is None
    assert r.reasons[0]["rule_code"] == "C0_SIN_EVALUACION"


def test_single_dimension_signal_is_level_1():
    assert evaluate([call(1, soledad_percibida="a_veces")]).level == 1


def test_two_fields_same_dimension_count_once():
    r = evaluate([call(1, soledad_percibida="a_veces", menor_contacto_habitual=True)])
    assert r.level == 1


def test_two_dimensions_is_level_2():
    r = evaluate([call(1, soledad_percibida="a_veces", adherencia_reportada="parcial")])
    assert r.level == 2
    assert {x["dimension_code"] for x in r.reasons} >= {"aislamiento", "medicacion"}


def test_three_of_five_persistence():
    calls = [call(1, confusion_nueva_reportada=True), call(2, confusion_nueva_reportada=False),
             call(3, confusion_nueva_reportada=True)]
    assert evaluate(calls).dimension_levels["emocional_cognitiva"] == 1
    calls.append(call(4, confusion_nueva_reportada=True))
    assert evaluate(calls).level == 2


def test_persistence_window_is_five_calendar_days():
    calls = [call(1, confusion_nueva_reportada=True), call(2, confusion_nueva_reportada=True),
             call(6, confusion_nueva_reportada=True)]
    assert evaluate(calls).level == 1  # day 1 fell out of the window


def test_no_aplica_is_not_a_signal():
    assert evaluate([call(1, adherencia_reportada="no_aplica", **STABLE)]).level == 0


def test_null_states_are_not_signals_nor_stability():
    r = evaluate([call(1, soledad_percibida=(None, "no_sabe"))])
    assert r.level is None


def test_invalid_call_is_unassessed():
    assert evaluate([call(1, soledad_percibida="a_veces"), call(2, valid=False)]).level is None


def test_urgent_indicator_is_three():
    assert evaluate([call(1, necesita_ayuda_inmediata=True)]).level == 3
    assert evaluate([call(1, caida_reportada=True, lesion_reportada=True)]).level == 3


def test_open_urgent_alert_persists():
    assert evaluate([call(1, **STABLE)], open_urgent=True).level == 3


def test_fall_without_injury_is_level_2():
    r = evaluate([call(1, caida_reportada=True, lesion_reportada=False)])
    assert r.dimension_levels["seguridad"] == 2 and r.level == 2


def test_functional_worsening_is_dimension_level_2_and_difficulty_is_1():
    assert evaluate([call(1, cambio_autonomia="empeora")]).level == 2
    assert evaluate([call(1, dificultad_puntual_reportada=True)]).level == 1


def test_reasons_reference_observation_ids():
    c = call(1, soledad_percibida="a_veces")
    r = evaluate([c])
    assert c.observations[0].id in [i for x in r.reasons for i in x["observation_ids"]]
    assert all(x["explanation"] for x in r.reasons)
