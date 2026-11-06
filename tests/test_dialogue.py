"""Adaptive dialogue: tree branching, urgent stop, clarification, respect rules, persistence."""
import json
from datetime import datetime, timezone

import pytest

from src.checkin.dialogue import (DialogueSession, JevTurnClassifier, KeywordFakeClassifier,
                                  TurnClassification)
from src.checkin.dialogue_tree import TREE, approved_prefixes
from src.checkin.extractor_jev import JevClient, ObservationDraft
from tests.checkin_helpers import build_db

CLOCK = lambda: datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)  # noqa: E731  (odd ordinal)
INTRO_OK = ["Sí, soy yo", "Sí, bueno"]


@pytest.fixture
def conn():
    c = build_db()
    yield c
    c.close()


def person(conn, name):
    return conn.execute("SELECT * FROM person WHERE preferred_name=?", (name,)).fetchone()


def run(conn, name, answers, classifier=None):
    s = DialogueSession(person(conn, name), TREE, classifier or KeywordFakeClassifier(), CLOCK, conn=conn)
    utter = [s.start()]
    results = []
    for a in answers:
        if s.done:
            break
        r = s.reply(a)
        results.append(r)
        utter.extend(r.utterances)
    return s, utter, results


def asked(conn, s):
    return [r["question_code"] for r in conn.execute(
        "SELECT question_code FROM message WHERE conversation_id=? AND role='asistente' ORDER BY turn", (s.conversation_id,))
        if r["question_code"]]


def obs(conn, s):
    return {r["indicator_code"]: r for r in conn.execute(
        "SELECT * FROM observation WHERE conversation_id=?", (s.conversation_id,))}


QUIET_TAIL = ["Igual que siempre", "Sí, todos", "Bien", "No", "No", "No"]


def test_adherencia_ninguna_asks_barrera(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No, no estoy sola", "Sí, hoy hablé con mi hija", "Igual que siempre",
                                            "No tomé ninguno", "Se me olvidan", "Bien", "No", "No", "No"])
    codes = asked(conn, s)
    assert codes.index("barrera_tratamiento") == codes.index("adherencia_reportada") + 1
    o = obs(conn, s)
    assert o["adherencia_reportada"]["value_text"] == "ninguna"
    assert json.loads(o["barrera_tratamiento"]["value_text"]) == ["olvido"]
    assert o["barrera_tratamiento"]["evidence_quote"] == "Se me olvidan"


def test_soledad_frecuente_asks_apoyo(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["Me siento sola con frecuencia", "No, nadie me puede ayudar"])
    assert s.pending_code == "contacto_social_24h"
    assert "apoyo_disponible" in s.asked_codes
    assert s.drafts["apoyo_disponible"].value_num == 0.0


def test_soledad_no_skips_apoyo(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No, para nada"])
    assert "apoyo_disponible" not in s.asked_codes
    assert s.pending_code == "contacto_social_24h"


def test_contacto_no_asks_menor_contacto(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No", "No, no he hablado con nadie"])
    assert s.pending_code == "menor_contacto_habitual"


def test_no_treatment_skips_medication_and_records_no_aplica(conn):
    s, _, _ = run(conn, "Elena", INTRO_OK + ["No", "Sí", "Igual", "Bien", "No", "No", "No", "No", "No"])
    assert s.done
    assert "adherencia_reportada" not in asked(conn, s)
    o = obs(conn, s)
    assert o["adherencia_reportada"]["value_text"] == "no_aplica"
    assert o["adherencia_reportada"]["evidence_quote"] is None


def test_fall_with_injury_stops_script_and_alert_exists_before_close(conn):
    s, utter, results = run(conn, "Teresa", INTRO_OK + ["No", "Sí", "Igual que siempre", "Sí, todos", "Bien", "Sí, me caí",
                                                         "Sí, me lastimé la cadera"])
    r = results[-1]
    assert r.urgent and not r.done
    assert utter[-1] == TREE.node("protocolo_urgente").prompt
    alert = conn.execute("SELECT * FROM alert WHERE person_id=? AND level=3", (person(conn, "Teresa")["id"],)).fetchall()
    assert any(a["created_at"] == s.started_at for a in alert)  # exists before goodbye
    final = s.reply("Sí, mi hijo está aquí")
    assert final.done and final.utterances == [TREE.node("cierre_urgente").prompt]
    assert "necesita_ayuda_inmediata" not in asked(conn, s)
    assert conn.execute("SELECT status FROM conversation WHERE id=?", (s.conversation_id,)).fetchone()[0] == "parcial"
    # later dimensions never asked
    assert "confusion_nueva_reportada" not in asked(conn, s)


def test_regex_urgent_stops_even_if_classifier_disagrees(conn):
    class Calm:
        def classify(self, node, conv, text):
            return TurnClassification(ObservationDraft(node.indicator_code, "informado", 0.0, None, text, 0.99))

    s, _, results = run(conn, "Rosa", INTRO_OK + ["No sé, necesito ayuda ahora"], Calm())
    assert results[-1].urgent
    assert conn.execute("SELECT COUNT(*) FROM alert WHERE level=3 AND origin='regla_urgente'").fetchone()[0] == 1


def test_classified_urgent_indicator_triggers_stop(conn):
    s, _, results = run(conn, "Rosa", INTRO_OK + ["No", "Sí", "Igual", "Sí, todos", "Bien", "No",
                                                  "Sí, necesito que vengan"])
    assert results[-1].urgent
    a = conn.execute("SELECT rule_code FROM alert WHERE level=3").fetchone()
    assert a["rule_code"] == "R3_AYUDA_INMEDIATA"


def test_low_confidence_reasks_once_then_null_state(conn):
    s, utter, _ = run(conn, "Rosa", INTRO_OK + ["mmm quizás", "ehh no sé bien qué decir"])
    assert utter[-2] == TREE.node("soledad_percibida").alt_prompt
    assert s.pending_code == "contacto_social_24h"
    assert s.drafts["soledad_percibida"].state == "pendiente_confirmar"
    assert s.drafts["soledad_percibida"].value_text is None


def test_clarify_success_second_try(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["mmm quizás", "A veces"])
    assert s.drafts["soledad_percibida"].value_text == "a_veces"
    assert s.pending_code == "apoyo_disponible"


def test_speaker_not_confirmed_neutral_close(conn):
    s, utter, _ = run(conn, "Rosa", ["No, soy su hija"])
    assert s.done
    close = utter[-1]
    assert close == TREE.node("cierre_no_confirmado").prompt
    assert "Rosa" not in close
    assert obs(conn, s) == {}
    row = conn.execute("SELECT * FROM conversation WHERE id=?", (s.conversation_id,)).fetchone()
    assert row["status"] == "parcial" and row["speaker_confirmed"] == 0


def test_refusal_closes_rechazada_without_observations(conn):
    s, _, _ = run(conn, "Rosa", ["Sí, soy yo", "No, ahora no puedo"])
    assert s.done
    row = conn.execute("SELECT * FROM conversation WHERE id=?", (s.conversation_id,)).fetchone()
    assert row["status"] == "rechazada" and row["speaker_confirmed"] == 1
    assert obs(conn, s) == {}


def test_prefers_not_to_answer_records_state_and_moves_on(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["Prefiero no responder"])
    assert s.drafts["soledad_percibida"].state == "prefiere_no_responder"
    assert s.pending_code == "contacto_social_24h"


def test_no_sabe_records_state(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No sé", "No recuerdo"])
    assert s.drafts["soledad_percibida"].state == "no_sabe"
    assert s.drafts["contacto_social_24h"].state == "no_sabe"


def test_human_request_creates_level1_alert_and_closes(conn):
    s, _, results = run(conn, "Rosa", INTRO_OK + ["Quiero hablar con una persona"])
    assert results[-1].done
    a = conn.execute("SELECT * FROM alert WHERE rule_code='R1_SOLICITA_CONTACTO_HUMANO'").fetchall()
    assert len(a) == 1 and a[0]["level"] == 1


def test_all_utterances_come_from_tree(conn):
    s, utter, _ = run(conn, "Rosa", INTRO_OK + ["Me siento sola con frecuencia", "No", "Sí", "Igual que siempre",
                                                "Sí, todos", "Bien", "No", "No", "No"])
    allowed = {t.format(nombre="Rosa") for t in TREE.all_utterances()}
    prefixes = approved_prefixes("Rosa")

    def approved(u):  # an approved acknowledgment may precede a tree question
        return u in allowed or any(u.startswith(p + " ") and u[len(p) + 1:] in allowed for p in prefixes)

    assert all(approved(u) for u in utter)
    assert utter[0] == ("Buenos días, Rosa. Le habla el asistente automático del programa de acompañamiento. ¿Hablo con Rosa?")


def test_messages_alternate_and_codes_valid(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No", "Sí", "Igual que siempre", "Sí, todos", "Bien", "No", "No", "No"])
    assert s.done
    msgs = conn.execute("SELECT role, question_code FROM message WHERE conversation_id=? ORDER BY turn",
                        (s.conversation_id,)).fetchall()
    assert [m["role"] for m in msgs] == ["asistente", "persona"] * ((len(msgs) - 1) // 2) + ["asistente"]
    valid = {r[0] for r in conn.execute("SELECT code FROM indicator")}
    assert all(m["question_code"] is None or m["question_code"] in valid for m in msgs)


def test_pipeline_after_dialogue_writes_assessment_and_ia_observations(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["No", "Sí", "Igual que siempre", "Sí, todos", "Bien", "No", "No", "No"])
    a = conn.execute("SELECT * FROM assessment WHERE conversation_id=?", (s.conversation_id,)).fetchone()
    assert a is not None and a["level"] is not None
    srcs = {r["source"] for r in conn.execute("SELECT source FROM observation WHERE conversation_id=?", (s.conversation_id,))}
    assert srcs == {"ia"}
    conv = conn.execute("SELECT * FROM conversation WHERE id=?", (s.conversation_id,)).fetchone()
    assert (conv["channel"], conv["status"], conv["scenario_id"], conv["speaker_confirmed"]) == (
        "simulado", "completada", "interactivo", 1)
    assert conn.execute("SELECT COUNT(*) FROM extraction WHERE conversation_id=?", (s.conversation_id,)).fetchone()[0] == 1


def test_max_questions_cap(conn):
    s, _, _ = run(conn, "Rosa", INTRO_OK + ["Con frecuencia", "No", "No", "No", "Peor", "Me cuesta caminar", "Ninguno",
                                            "Se me olvidan", "Mal", "Persistente", "No", "No"])
    assert s.done
    assert len(asked(conn, s)) <= 12
    assert asked(conn, s)[-1] == "necesita_ayuda_inmediata"


def test_jev_turn_classifier_with_fake_transport():
    calls = []

    def transport(url, headers, body, timeout):
        calls.append(body)
        ans = {}
        for qid, q in body["questions"].items():
            if qid == "responde_pregunta":
                ans[qid] = {"type": "noul", "noul": 0.95}
            elif qid == "intencion_fuera_de_tema":
                ans[qid] = {"type": "choice", "choice": "otro_tema", "confidence": 0.9}
            else:
                ans[qid] = ({"type": "choice", "choice": "a_veces", "confidence": 0.9} if q["type"] == "choice"
                            else {"type": "noul", "noul": 0.05})
        return 200, {"answers": ans, "model": "fake"}

    client = JevClient("k", transport=transport)
    clf = JevTurnClassifier(client)
    node = TREE.node("soledad_percibida")
    conv = [{"role": "asistente", "question_code": "soledad_percibida", "text": "¿Ha sentido soledad?"}]
    r = clf.classify(node, conv, "A ratos sí")
    assert (r.draft.state, r.draft.value_text, r.draft.evidence_quote) == ("informado", "a_veces", "A ratos sí")
    assert len(calls) == 1 and "soledad_percibida" in calls[0]["questions"]
    assert r.latency_ms >= 0 and r.raw["answers"]


def test_jev_error_degrades_to_pending():
    def transport(*a):
        return 500, {}

    clf = JevTurnClassifier(JevClient("k", transport=transport))
    r = clf.classify(TREE.node("soledad_percibida"), [], "hola")
    assert r.draft.state == "pendiente_confirmar"
