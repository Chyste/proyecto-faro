"""Conversation quality: relevance gate, don't-know detection, acknowledgments."""
from datetime import datetime, timezone

import pytest

from src.checkin.dialogue import DialogueSession, JevTurnClassifier, KeywordFakeClassifier
from src.checkin.dialogue_tree import TREE, approved_prefixes
from src.checkin.extractor_jev import JevClient
from tests.checkin_helpers import build_db

CLOCK = lambda: datetime(2026, 11, 7, 10, 5, tzinfo=timezone.utc)  # noqa: E731
INTRO_OK = ["Sí, soy yo", "Sí, bueno"]
Q_CONTACTO = TREE.node("contacto_social_24h").prompt


@pytest.fixture
def conn():
    c = build_db()
    yield c
    c.close()


def start(conn, classifier=None, name="Rosa", answers=()):
    p = conn.execute("SELECT * FROM person WHERE preferred_name=?", (name,)).fetchone()
    s = DialogueSession(p, TREE, classifier or KeywordFakeClassifier(), CLOCK, conn=conn)
    s.start()
    out = [s.reply(a) for a in answers]
    return s, out


def test_off_topic_hora_records_nothing_and_reasks(conn):
    s, res = start(conn, answers=INTRO_OK + ["No, no estoy sola", "que hora es?"])
    r = res[-1]
    assert r.off_topic and r.intent == "pregunta_hora"
    assert "10:05" in r.utterances[0] and r.utterances[0].endswith(Q_CONTACTO)
    assert "contacto_social_24h" not in s.drafts
    assert s.pending_code == "contacto_social_24h"
    assert s.turn_log[-1]["fuera_de_tema"] is True


def test_second_off_topic_records_no_comprendido_and_moves_on(conn):
    s, res = start(conn, answers=INTRO_OK + ["No", "que hora es?", "y quien eres tu"])
    assert s.drafts["contacto_social_24h"].state == "no_comprendido"
    assert s.drafts["contacto_social_24h"].value_num is None
    assert s.pending_code == "menor_contacto_habitual" or s.pending_code != "contacto_social_24h"


def test_quien_es_and_repetir_intents(conn):
    s, res = start(conn, answers=INTRO_OK + ["No", "quien habla?"])
    assert res[-1].intent == "pregunta_quien_es"
    assert "asistente automático" in res[-1].utterances[0]
    s2, res2 = start(conn, answers=INTRO_OK + ["No", "perdón, ¿puede repetir?"])
    assert res2[-1].intent == "pide_repetir" and res2[-1].off_topic


def test_off_topic_then_real_answer_is_recorded(conn):
    s, _ = start(conn, answers=INTRO_OK + ["No", "que hora es?", "no, nadie"])
    assert s.drafts["contacto_social_24h"].state == "informado"
    assert s.drafts["contacto_social_24h"].value_num == 0.0


@pytest.mark.parametrize("text", ["nose", "no se", "No sé", "quién sabe", "ni idea", "no me acuerdo"])
def test_dont_know_variants(conn, text):
    s, _ = start(conn, answers=INTRO_OK + ["No", text])
    d = s.drafts["contacto_social_24h"]
    assert d.state == "no_sabe" and d.value_num is None and d.value_text is None


@pytest.mark.parametrize("text", ["prefiero no responder", "no quiero contestar", "paso"])
def test_prefers_not_to_answer_variants(conn, text):
    s, _ = start(conn, answers=INTRO_OK + ["No", text])
    assert s.drafts["contacto_social_24h"].state == "prefiere_no_responder"


def test_acknowledgment_prefixed_to_next_question(conn):
    s, res = start(conn, answers=INTRO_OK + ["Me siento sola con frecuencia"])
    u = res[-1].utterances[0]
    nxt = TREE.node("apoyo_disponible").prompt
    assert u.endswith(nxt) and len(u) > len(nxt)
    ack = u[: -len(nxt)].strip()
    assert ack in approved_prefixes("Rosa")
    assert len(ack.split()) <= 8


def test_dont_know_ack(conn):
    s, res = start(conn, answers=INTRO_OK + ["No", "nose"])
    assert res[-1].utterances[0].startswith("No se preocupe, sigamos.")


def test_acks_vary_across_turns(conn):
    s, res = start(conn, answers=INTRO_OK + ["No, para nada", "Sí, hoy hablé con mi hija", "Igual que siempre",
                                            "Sí, todos", "Bien", "No"])
    acks = []
    for r in res[2:]:
        for t in approved_prefixes("Rosa"):
            if r.utterances and r.utterances[0].startswith(t):
                acks.append(t)
    assert len(acks) >= 4 and len(set(acks)) >= 3


def test_no_ack_on_confirm_nodes_or_urgent(conn):
    s, res = start(conn, answers=["Sí, soy yo"])
    assert res[0].utterances == [TREE.node("permiso").prompt]
    s, res = start(conn, answers=INTRO_OK + ["necesito ayuda ahora"])
    assert res[-1].urgent and res[-1].utterances == [TREE.node("protocolo_urgente").prompt]


def test_urgent_wins_over_off_topic(conn):
    s, res = start(conn, answers=INTRO_OK + ["que hora es? me caí y me duele, necesito ayuda"])
    assert res[-1].urgent and not res[-1].off_topic


def test_jev_relevance_gate_blocks_value():
    def transport(url, headers, body, timeout):
        ans = {}
        for qid, q in body["questions"].items():
            if qid == "responde_pregunta":
                ans[qid] = {"type": "noul", "noul": 0.1}
            elif qid == "intencion_fuera_de_tema":
                ans[qid] = {"type": "choice", "choice": "otro_tema", "confidence": 0.9}
            elif q["type"] == "choice":
                ans[qid] = {"type": "choice", "choice": "no", "confidence": 0.95}
            else:
                ans[qid] = {"type": "noul", "noul": 0.05}
        return 200, {"answers": ans, "model": "fake"}

    node = TREE.node("contacto_social_24h")
    r = JevTurnClassifier(JevClient("k", transport=transport)).classify(node, [], "mi nieto juega fútbol")
    assert r.relevance == pytest.approx(0.1) and r.intent == "otro_tema"
    assert r.draft.state == "pendiente_confirmar" and r.draft.value_num is None


def test_jev_off_topic_in_dialogue_reasks(conn):
    def transport(url, headers, body, timeout):
        ans = {}
        for qid, q in body["questions"].items():
            if qid == "responde_pregunta":
                ans[qid] = {"type": "noul", "noul": 0.1}
            elif qid == "intencion_fuera_de_tema":
                ans[qid] = {"type": "choice", "choice": "otro_tema", "confidence": 0.9}
            elif q["type"] == "choice":
                ans[qid] = {"type": "choice", "choice": "no", "confidence": 0.95}
            else:
                ans[qid] = {"type": "noul", "noul": 0.9}
        return 200, {"answers": ans, "model": "fake"}

    clf = JevTurnClassifier(JevClient("k", transport=transport))
    s, res = start(conn, clf, answers=INTRO_OK + ["mi nieto juega fútbol"])
    assert res[-1].off_topic and res[-1].intent == "otro_tema"
    assert res[-1].utterances[0].startswith("Entiendo. Para terminar pronto, le preguntaba:")
    assert "soledad_percibida" not in s.drafts
