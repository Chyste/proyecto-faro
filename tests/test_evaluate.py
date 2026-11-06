from src.checkin import extractor_jev as J
from src.checkin.evaluate import evaluate_jev, evaluation_report
from src.checkin.pipeline import process_conversation
from tests.checkin_helpers import build_db, conv_id
from tests.test_extractor_jev import FAKE_KEY, canned, fake_client, noul


def _perfect(conn, cid):
    """Responder that reproduces scenario expectations exactly."""
    exp = {r["indicator_code"]: r["expected_value"] for r in conn.execute(
        "SELECT indicator_code, expected_value FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NOT NULL", (cid,))}

    def responder(body):
        ov = {}
        for qid, q in body["questions"].items():
            code = qid.split("__")[0]
            if code not in exp or qid.startswith("urgente"):
                continue
            v = exp[code]
            if q["type"] == "choice":
                ov[qid] = {"type": "choice", "choice": v, "confidence": 0.95, "probabilities": {v: 0.95}}
            elif "__" in qid:
                import json
                ov[qid] = noul(0.95 if qid.split("__")[1] in json.loads(v) else 0.02)
            else:
                ov[qid] = noul(0.95 if v == "true" else 0.02)
        return canned(body, ov)
    return responder


def test_evaluation_perfect_run():
    conn = build_db()
    cid = conv_id(conn, "Rosa", 1)
    cli, _ = fake_client(_perfect(conn, cid))
    process_conversation(conn, cid, mode="jev", client=cli)
    ev = evaluate_jev(conn)
    assert ev["fields"]["total"]["correct"] == ev["fields"]["total"]["n"] > 0
    assert ev["levels"]["ok"] == ev["levels"]["n"] == 1
    assert ev["false_reds"] == 0 and ev["missed_reds"] == 0
    assert ev["tokens"] == 110 and ev["latency_ms_avg"] >= 0


def test_evaluation_counts_wrong_and_review():
    conn = build_db()
    cid = conv_id(conn, "Rosa", 1)
    cli, _ = fake_client(lambda b: canned(b, {"contacto_social_24h": noul(0.5), "apoyo_disponible": noul(0.01)}))
    process_conversation(conn, cid, mode="jev", client=cli)
    f = evaluate_jev(conn)["fields"]
    assert f["by_indicator"]["contacto_social_24h"]["revision"] == 1
    assert f["by_indicator"]["apoyo_disponible"]["wrong"] == 1


def test_report_text_has_tables_and_no_key():
    conn = build_db()
    cid = conv_id(conn, "Rosa", 1)
    cli, _ = fake_client(_perfect(conn, cid))
    process_conversation(conn, cid, mode="jev", client=cli)
    txt = evaluation_report(conn)
    for s in ("Precisión por campo", "Matriz de confusión", "Falsos rojos", "Rojos perdidos", "Tokens"):
        assert s in txt
    assert FAKE_KEY not in txt
