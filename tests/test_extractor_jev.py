"""Jev extractor tests: HTTP is always faked; no network, no real key."""
import json

import pytest

from src.checkin import extractor_jev as J
from src.checkin.pipeline import process_conversation
from tests.checkin_helpers import build_db, conv_id

FAKE_KEY = "sk-FAKE-KEY-123456"


def msgs(conn, cid):
    return [dict(r) for r in conn.execute(
        "SELECT turn, role, question_code, text FROM message WHERE conversation_id=? ORDER BY turn", (cid,))]


def catalog():
    return J.catalog_by_code()


def canned(req, overrides=None, model="jev-test"):
    """Build a well-formed Jev response for a request; defaults are confident 'negative' answers."""
    answers = {}
    for qid, q in req["questions"].items():
        if q["type"] == "choice":
            first = next(k for k in q["criteria"] if k not in J.NULL_REASONS)
            answers[qid] = {"type": "choice", "choice": first, "confidence": 0.9,
                            "probabilities": {first: 0.9}}
        else:
            answers[qid] = {"type": "noul", "noul": 0.05}
    for k, v in (overrides or {}).items():
        answers[k] = v
    return {"model": model, "answers": answers, "usage": {"input_tokens": 100, "output_tokens": 10}}


def choice(opt, conf=0.9):
    return {"type": "choice", "choice": opt, "confidence": conf, "probabilities": {opt: conf}}


def noul(p):
    return {"type": "noul", "noul": p}


@pytest.fixture()
def rosa():
    conn = build_db()
    cid = conv_id(conn, "Rosa", 1)
    m = msgs(conn, cid)
    asked = J.asked_codes(m)
    req = J.build_request(m, asked, catalog())
    return conn, cid, m, asked, req


def test_request_has_one_question_per_asked_code_plus_urgent(rosa):
    _, _, m, asked, req = rosa
    assert req["model"] == "jev-latest" or req["model"].startswith("jev")
    qs = req["questions"]
    for code in asked:
        assert any(k == code or k.startswith(code + "__") for k in qs)
    for u in ("urgente__ayuda_inmediata", "urgente__caida_con_lesion", "urgente__sintoma_agudo"):
        assert qs[u]["type"] == "noul"
    # category -> choice with null reasons; bool -> noul
    assert qs["soledad_percibida"]["type"] == "choice"
    assert set(J.NULL_REASONS) <= set(qs["soledad_percibida"]["criteria"])
    assert {"no", "a_veces", "frecuente"} <= set(qs["soledad_percibida"]["criteria"])
    assert qs["contacto_social_24h"]["type"] == "noul"
    # not asked -> not requested
    assert "menor_contacto_habitual" not in qs
    st = req["state"]
    assert "24 horas" in st["contexto"] and st["turnos"][0]["rol"] in ("asistente", "persona")


def test_list_indicator_one_noul_per_option():
    conn = build_db()
    cat = catalog()
    m = [{"turn": 1, "role": "asistente", "question_code": "actividad_afectada", "text": "¿Qué le cuesta?"},
         {"turn": 2, "role": "persona", "question_code": None, "text": "Me cuesta comprar."}]
    req = J.build_request(m, ["actividad_afectada"], cat)
    ids = [k for k in req["questions"] if k.startswith("actividad_afectada__")]
    assert len(ids) == len(cat["actividad_afectada"].allowed_values)
    resp = canned(req, {"actividad_afectada__comprar": noul(0.95)})
    drafts = {d.indicator_code: d for d in J.map_response(resp, ["actividad_afectada"], m)}
    d = drafts["actividad_afectada"]
    assert d.state == "informado" and json.loads(d.value_text) == ["comprar"]
    assert d.evidence_quote == "Me cuesta comprar."


def test_list_band_makes_whole_field_pendiente():
    m = [{"turn": 1, "role": "asistente", "question_code": "barrera_tratamiento", "text": "?"},
         {"turn": 2, "role": "persona", "question_code": None, "text": "No sé, a veces."}]
    req = J.build_request(m, ["barrera_tratamiento"], catalog())
    resp = canned(req, {"barrera_tratamiento__olvido": noul(0.5)})
    d = next(d for d in J.map_response(resp, ["barrera_tratamiento"], m))
    assert d.state == "pendiente_confirmar" and d.value_text is None and d.value_num is None
    resp = canned(req)
    d = next(d for d in J.map_response(resp, ["barrera_tratamiento"], m))
    assert d.state == "informado" and json.loads(d.value_text) == []


def test_choice_mapping_null_reason_low_confidence_and_ok(rosa):
    _, _, m, asked, req = rosa
    d = {x.indicator_code: x for x in J.map_response(
        canned(req, {"soledad_percibida": choice("no_sabe", 0.8)}), asked, m)}["soledad_percibida"]
    assert d.state == "no_sabe" and d.value_text is None
    d = {x.indicator_code: x for x in J.map_response(
        canned(req, {"soledad_percibida": choice("frecuente", 0.4)}), asked, m)}["soledad_percibida"]
    assert d.state == "pendiente_confirmar" and d.value_text is None and d.confidence == 0.4
    d = {x.indicator_code: x for x in J.map_response(
        canned(req, {"soledad_percibida": choice("a_veces", 0.8)}), asked, m)}["soledad_percibida"]
    assert d.state == "informado" and d.value_text == "a_veces" and d.confidence == 0.8


def test_noul_thresholds_and_confidence(rosa):
    _, _, m, asked, req = rosa
    by = lambda p: {x.indicator_code: x for x in J.map_response(
        canned(req, {"contacto_social_24h": noul(p)}), asked, m)}["contacto_social_24h"]
    assert by(0.7).value_num == 1 and by(0.7).state == "informado"
    assert by(0.3).value_num == 0 and by(0.3).state == "informado"
    mid = by(0.5)
    assert mid.state == "pendiente_confirmar" and mid.value_num is None
    assert by(0.9).confidence == pytest.approx(0.9) and by(0.1).confidence == pytest.approx(0.9)


def test_urgent_indicator_asymmetric_threshold(rosa):
    _, _, m, asked, req = rosa
    d = {x.indicator_code: x for x in J.map_response(
        canned(req, {"necesita_ayuda_inmediata": noul(0.55)}), asked, m)}["necesita_ayuda_inmediata"]
    assert d.state == "informado" and d.value_num == 1
    d = {x.indicator_code: x for x in J.map_response(
        canned(req, {"necesita_ayuda_inmediata": noul(0.4)}), asked, m)}["necesita_ayuda_inmediata"]
    assert d.state == "pendiente_confirmar"


def test_quote_comes_from_persona_turn_after_question(rosa):
    _, _, m, asked, req = rosa
    d = {x.indicator_code: x for x in J.map_response(canned(req), asked, m)}
    assert d["soledad_percibida"].evidence_quote == "No, gracias a Dios, tengo con quien conversar."
    assert d["contacto_social_24h"].evidence_quote == "Sí, conversé con unos amigos en la tarde."


def test_validate_response_detects_missing_or_wrong_type(rosa):
    _, _, m, asked, req = rosa
    good = canned(req)
    assert J.validate_response(good, asked)
    bad = json.loads(json.dumps(good))
    del bad["answers"]["soledad_percibida"]
    assert not J.validate_response(bad, asked)
    bad = json.loads(json.dumps(good))
    bad["answers"]["contacto_social_24h"] = {"type": "choice", "choice": "x", "confidence": 1}
    assert not J.validate_response(bad, asked)


def fake_client(responder, status=200):
    calls = []

    def transport(url, headers, body, timeout):
        calls.append((url, headers, body))
        out = responder(body)
        if isinstance(out, Exception):
            raise out
        return status, out

    return J.JevClient(api_key=FAKE_KEY, model="jev-test", transport=transport), calls


def test_client_sends_bearer_and_model_and_parses():
    cli, calls = fake_client(lambda body: canned(body))
    req = {"state": {}, "questions": {"a": {"type": "noul", "instructions": "x"}}}
    resp = cli.extract(req["state"], req["questions"])
    assert calls[0][1]["Authorization"] == f"Bearer {FAKE_KEY}"
    assert calls[0][2]["model"] == "jev-test"
    assert resp["answers"]["a"]["noul"] == 0.05


def test_client_retries_once_on_5xx_then_raises_without_key():
    n = {"i": 0}

    def transport(url, headers, body, timeout):
        n["i"] += 1
        return 503, {"detail": f"boom {FAKE_KEY}"}

    cli = J.JevClient(api_key=FAKE_KEY, model="m", transport=transport)
    with pytest.raises(J.JevError) as e:
        cli.extract({}, {"a": {"type": "noul", "instructions": "x"}})
    assert n["i"] == 2 and "503" in str(e.value) and FAKE_KEY not in str(e.value)


def test_client_4xx_no_retry_and_timeout_retry():
    n = {"i": 0}

    def t401(url, headers, body, timeout):
        n["i"] += 1
        return 401, {"detail": {"message": "bad key"}}

    with pytest.raises(J.JevError):
        J.JevClient(api_key=FAKE_KEY, model="m", transport=t401).extract({}, {"a": {}})
    assert n["i"] == 1
    m = {"i": 0}

    def tt(url, headers, body, timeout):
        m["i"] += 1
        raise TimeoutError("slow")

    with pytest.raises(J.JevError):
        J.JevClient(api_key=FAKE_KEY, model="m", transport=tt).extract({}, {"a": {}})
    assert m["i"] == 2


def test_missing_key_raises(monkeypatch):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.setattr(J, "load_dotenv", lambda *a, **k: None)
    with pytest.raises(J.JevError):
        J.get_client()


def run_extract(conn, cid, responder=None, overrides=None):
    cli, calls = fake_client(responder or (lambda body: canned(body, overrides)))
    return J.extract_conversation(conn, cid, cli), calls


def test_store_extraction_and_observations(rosa):
    conn, cid, *_ = rosa
    res, _ = run_extract(conn, cid)
    ex = conn.execute("SELECT * FROM extraction WHERE conversation_id=?", (cid,)).fetchone()
    assert ex["schema_valid"] == 1 and ex["prompt_version"] == J.PROMPT_VERSION and ex["model"] == "jev-test"
    assert FAKE_KEY not in ex["raw_json"] and "Authorization" not in ex["raw_json"]
    assert json.loads(ex["raw_json"])["response"]["answers"]
    obs = conn.execute("SELECT * FROM observation WHERE conversation_id=? AND source='ia'", (cid,)).fetchall()
    assert obs and all(o["extraction_id"] == ex["id"] for o in obs)
    assert {"soledad_percibida", "contacto_social_24h"} <= {o["indicator_code"] for o in obs}
    assert ex["summary"]


def test_idempotent_per_conversation_and_prompt_version(rosa):
    conn, cid, *_ = rosa
    run_extract(conn, cid)
    n1 = [conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("extraction", "observation")]
    res, calls = run_extract(conn, cid)
    n2 = [conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("extraction", "observation")]
    assert n1 == n2 and calls == [] and res["reused"]


def test_skips_indicators_set_by_regla():
    conn = build_db()
    cid = conv_id(conn, "Teresa", 11)
    from src.checkin.urgent import run_urgent
    run_urgent(conn, cid)
    regla = {r[0] for r in conn.execute("SELECT indicator_code FROM observation WHERE conversation_id=? AND source='regla'", (cid,))}
    assert regla
    run_extract(conn, cid)
    ia = {r[0] for r in conn.execute("SELECT indicator_code FROM observation WHERE conversation_id=? AND source='ia'", (cid,))}
    assert not (ia & regla)


def test_safety_net_creates_level2_never_level3(rosa):
    conn, cid, *_ = rosa
    run_extract(conn, cid, overrides={"urgente__ayuda_inmediata": noul(0.6)})
    al = conn.execute("SELECT * FROM alert WHERE rule_code='R2_POSIBLE_URGENCIA_IA'").fetchall()
    assert len(al) == 1 and al[0]["level"] == 2 and al[0]["due_at"]
    assert conn.execute("SELECT COUNT(*) FROM alert WHERE level=3").fetchone()[0] == 0
    run_extract(conn, cid)  # idempotent
    assert conn.execute("SELECT COUNT(*) FROM alert WHERE rule_code='R2_POSIBLE_URGENCIA_IA'").fetchone()[0] == 1


def test_safety_net_not_created_when_regex_fired():
    conn = build_db()
    cid = conv_id(conn, "Teresa", 11)
    from src.checkin.urgent import run_urgent
    run_urgent(conn, cid)
    run_extract(conn, cid, overrides={"urgente__ayuda_inmediata": noul(0.9)})
    assert conn.execute("SELECT COUNT(*) FROM alert WHERE rule_code='R2_POSIBLE_URGENCIA_IA'").fetchone()[0] == 0


def test_pipeline_jev_mode_uses_ia_observations(rosa):
    conn, cid, *_ = rosa
    cli, _ = fake_client(lambda body: canned(body))
    log = process_conversation(conn, cid, mode="jev", client=cli)
    assert any(s["step"] == "jev" for s in log) and not any(s.get("fallback") for s in log)
    assert conn.execute("SELECT COUNT(*) FROM observation WHERE conversation_id=? AND source='ia'", (cid,)).fetchone()[0] > 0
    assert conn.execute("SELECT COUNT(*) FROM observation WHERE conversation_id=? AND source='reproduccion'", (cid,)).fetchone()[0] == 0


def test_pipeline_falls_back_to_replay_on_jev_error(rosa):
    conn, cid, *_ = rosa
    cli, _ = fake_client(lambda body: TimeoutError("x"))
    log = process_conversation(conn, cid, mode="jev", client=cli)
    fb = [s for s in log if s.get("fallback")]
    assert fb and fb[0]["step"] == "replay"
    ex = conn.execute("SELECT * FROM extraction WHERE conversation_id=?", (cid,)).fetchone()
    assert ex["schema_valid"] == 0 and ex["summary"] == "fallback: reproducción"
    assert FAKE_KEY not in ex["raw_json"]
    assert conn.execute("SELECT COUNT(*) FROM observation WHERE conversation_id=? AND source='reproduccion'", (cid,)).fetchone()[0] > 0
    assert conn.execute("SELECT COUNT(*) FROM assessment WHERE conversation_id=?", (cid,)).fetchone()[0] == 1


def test_get_client_accepts_alias_name_and_bearer_prefix(monkeypatch):
    for n in J.KEY_ENV_NAMES:
        monkeypatch.delenv(n, raising=False)
    monkeypatch.setattr(J, "load_dotenv", lambda *a, **k: None)
    monkeypatch.setenv("JEV", f"Bearer {FAKE_KEY}")
    c = J.get_client()
    assert c._key == FAKE_KEY and FAKE_KEY not in repr(c)
