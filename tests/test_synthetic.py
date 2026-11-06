import json
import re

import pytest

from src.db.catalog import seed_catalog
from src.db.connection import connect, init_db
from src.db.synthetic import manifest, seed_synthetic


def build():
    c = connect(":memory:")
    init_db(c)
    seed_catalog(c)
    seed_synthetic(c)
    return c


@pytest.fixture(scope="module")
def conn():
    c = build()
    yield c
    c.close()


def _pid(conn, name):
    return conn.execute("SELECT id FROM person WHERE preferred_name=?", (name,)).fetchone()[0]


def _conv(conn, name, day):
    return conn.execute(
        "SELECT * FROM conversation WHERE person_id=? AND date(started_at)=date('2026-10-23', ?)",
        (_pid(conn, name), f"+{day - 1} days"),
    ).fetchone()


def _level(conn, name, day):
    cid = _conv(conn, name, day)["id"]
    return conn.execute(
        "SELECT expected_level FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NULL",
        (cid,),
    ).fetchone()[0]


def _expected(conn, name, day, code):
    cid = _conv(conn, name, day)["id"]
    return conn.execute(
        "SELECT * FROM scenario_expectation WHERE conversation_id=? AND indicator_code=?", (cid, code)
    ).fetchone()


def _person_msgs(conn, cid):
    return conn.execute("SELECT * FROM message WHERE conversation_id=? AND role='persona'", (cid,)).fetchall()


def test_counts(conn):
    names = {r[0] for r in conn.execute("SELECT preferred_name FROM person")}
    assert names == {"Rosa", "Carlos", "Elena", "Miguel", "Teresa"}
    assert conn.execute("SELECT COUNT(*) FROM conversation").fetchone()[0] == 70
    per = conn.execute("SELECT COUNT(*) n FROM conversation GROUP BY person_id").fetchall()
    assert all(r["n"] == 14 for r in per)
    assert conn.execute("SELECT COUNT(*) FROM staff_user").fetchone()[0] == 2
    assert conn.execute("SELECT COUNT(*) FROM consent_record").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM trusted_contact").fetchone()[0] == 5


def test_no_pipeline_outputs(conn):
    for t in ("extraction", "observation", "alert", "cusum_state", "assessment"):
        assert conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] == 0


def test_all_synthetic_and_assigned(conn):
    assert conn.execute("SELECT COUNT(*) FROM person WHERE is_synthetic=0 OR assigned_to IS NULL").fetchone()[0] == 0
    assert conn.execute("SELECT DISTINCT comuna_cut FROM person").fetchone()[0] == 13129
    assert conn.execute("SELECT DISTINCT comuna_nombre FROM person").fetchone()[0] == "San Joaquín"


def test_profiles(conn):
    rosa = conn.execute("SELECT * FROM person WHERE preferred_name='Rosa'").fetchone()
    assert (rosa["age"], rosa["sexo_modelo"], rosa["vive_sola"], rosa["tiene_tratamiento"]) == (79, "mujer", "si", "si")
    elena = conn.execute("SELECT * FROM person WHERE preferred_name='Elena'").fetchone()
    assert elena["tiene_tratamiento"] == "no"
    assert json.loads(rosa["intereses"])
    meds = conn.execute("SELECT COUNT(*) FROM person_medication WHERE person_id=?", (elena["id"],)).fetchone()[0]
    assert meds == 0


def test_statuses(conn):
    seen = {r[0] for r in conn.execute("SELECT DISTINCT status FROM conversation")}
    assert {"completada", "sin_respuesta", "fallo_tecnico"} <= seen


def test_miguel_fallo_and_sin_respuesta_have_no_person_messages(conn):
    d10, d11 = _conv(conn, "Miguel", 10), _conv(conn, "Miguel", 11)
    assert d10["status"] == "fallo_tecnico" and d11["status"] == "sin_respuesta"
    for c in (d10, d11):
        assert _person_msgs(conn, c["id"]) == []
        assert _level(conn, "Miguel", 10 if c is d10 else 11) is None
        n = conn.execute(
            "SELECT COUNT(*) FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NOT NULL",
            (c["id"],),
        ).fetchone()[0]
        assert n == 0


def test_miguel_confusion_days_and_level_2(conn):
    for day in (5, 7, 8):
        assert _expected(conn, "Miguel", day, "confusion_nueva_reportada")["expected_value"] == "true"
    assert _level(conn, "Miguel", 8) == 2


def test_teresa_urgent_event_day_11(conn):
    c = _conv(conn, "Teresa", 11)
    assert c["urgent_event_type"] in {"necesita_ayuda_inmediata", "caida_con_lesion", "sintoma_agudo"}
    assert c["urgent_event_quote"]
    assert _level(conn, "Teresa", 11) == 3
    quote = c["urgent_event_quote"]
    assert any(quote in m["text"] for m in _person_msgs(conn, c["id"]))
    for day in (12, 13, 14):
        assert _level(conn, "Teresa", day) == 3
    assert _expected(conn, "Teresa", 7, "cambio_autonomia")["expected_value"] == "empeora"
    assert _level(conn, "Teresa", 7) == 2
    others = conn.execute("SELECT COUNT(*) FROM conversation WHERE urgent_event_type IS NOT NULL").fetchone()[0]
    assert others == 1


def test_elena_adherence_not_applicable(conn):
    answered = conn.execute(
        "SELECT id FROM conversation WHERE person_id=? AND status='completada'", (_pid(conn, "Elena"),)
    ).fetchall()
    assert answered
    for r in answered:
        row = conn.execute(
            "SELECT expected_value FROM scenario_expectation WHERE conversation_id=? AND indicator_code='adherencia_reportada'",
            (r["id"],),
        ).fetchone()
        assert row["expected_value"] == "no_aplica"
    assert _level(conn, "Elena", 6) == 1
    assert _expected(conn, "Elena", 6, "tristeza_reportada")["expected_value"] == "ocasional"


def test_carlos_always_level_zero(conn):
    levels = [_level(conn, "Carlos", d) for d in range(1, 15)]
    assert levels == [0] * 14
    assert conn.execute("SELECT vive_sola FROM person WHERE preferred_name='Carlos'").fetchone()[0] == "si"


def test_rosa_story(conn):
    assert [_level(conn, "Rosa", d) for d in range(1, 8)] == [0] * 7
    assert _level(conn, "Rosa", 8) == 1
    assert _level(conn, "Rosa", 10) == 2
    assert _level(conn, "Rosa", 12) == 2
    # Indicators improve on days 13-14, but the 3-of-5 persistence window still holds isolation.
    assert _level(conn, "Rosa", 13) == 2
    assert _level(conn, "Rosa", 14) == 2
    assert _expected(conn, "Rosa", 11, "adherencia_reportada")["expected_value"] == "ninguna"
    assert json.loads(_expected(conn, "Rosa", 11, "barrera_tratamiento")["expected_value"]) == ["acceso"]


def test_expected_levels_cover_all_values(conn):
    levels = {r[0] for r in conn.execute(
        "SELECT DISTINCT expected_level FROM scenario_expectation WHERE indicator_code IS NULL")}
    assert levels == {0, 1, 2, 3, None}
    rows = conn.execute("SELECT COUNT(*) FROM scenario_expectation WHERE indicator_code IS NULL").fetchone()[0]
    assert rows == 70


def test_null_reason_answers_present(conn):
    notes = {r[0] for r in conn.execute(
        "SELECT note FROM scenario_expectation WHERE indicator_code IS NOT NULL AND expected_value IS NULL")}
    assert any("prefiere_no_responder" in (n or "") for n in notes)
    assert any("no_sabe" in (n or "") for n in notes)


def test_question_codes_are_valid_indicators(conn):
    bad = conn.execute(
        "SELECT DISTINCT question_code FROM message WHERE question_code IS NOT NULL"
        " AND question_code NOT IN (SELECT code FROM indicator)"
    ).fetchall()
    assert bad == []
    assert conn.execute("SELECT COUNT(*) FROM message WHERE question_code IS NOT NULL").fetchone()[0] > 100


def test_expectation_indicators_match_asked_questions(conn):
    for c in conn.execute("SELECT id FROM conversation WHERE status='completada'"):
        asked = {r[0] for r in conn.execute(
            "SELECT question_code FROM message WHERE conversation_id=? AND question_code IS NOT NULL", (c["id"],))}
        exp = {r[0] for r in conn.execute(
            "SELECT indicator_code FROM scenario_expectation WHERE conversation_id=? AND indicator_code IS NOT NULL",
            (c["id"],))}
        assert asked == exp


def test_first_turn_identifies_assistant_and_confirms_speaker(conn):
    for c in conn.execute("SELECT id, status, speaker_confirmed FROM conversation WHERE status != 'fallo_tecnico'"):
        first = conn.execute("SELECT text FROM message WHERE conversation_id=? AND turn=1", (c["id"],)).fetchone()[0]
        assert "asistente automático" in first.lower()
    done = conn.execute("SELECT COUNT(*) FROM conversation WHERE status='completada' AND speaker_confirmed=0").fetchone()[0]
    assert done == 0


def test_turns_unique_and_alternate(conn):
    for c in conn.execute("SELECT id FROM conversation"):
        msgs = conn.execute(
            "SELECT turn, role FROM message WHERE conversation_id=? ORDER BY turn", (c["id"],)
        ).fetchall()
        if not msgs:
            continue
        assert [m["turn"] for m in msgs] == list(range(1, len(msgs) + 1))
        roles = [m["role"] for m in msgs]
        assert roles[0] == "asistente"
        assert all(a != b for a, b in zip(roles, roles[1:]))


def test_fake_phone_pattern(conn):
    pat = re.compile(r"^\+56 9 0000 00\d\d$")
    phones = [r[0] for r in conn.execute("SELECT phone FROM person_identity")]
    phones += [r[0] for r in conn.execute("SELECT phone FROM trusted_contact")]
    assert phones and all(pat.match(p) for p in phones)


def test_deterministic():
    def dump(c):
        return [tuple(r) for r in c.execute(
            "SELECT conversation_id, turn, role, text FROM message ORDER BY id").fetchall()] + [
            tuple(r) for r in c.execute(
                "SELECT conversation_id, indicator_code, expected_value, expected_level, note"
                " FROM scenario_expectation ORDER BY id").fetchall()]

    assert dump(build()) == dump(build())


def test_manifest_counts(conn):
    m = manifest(conn)
    assert m["person"] == 5 and m["conversation"] == 70 and m["message"] > 100
    assert m["scenario_expectation"] > 70 and m["person_medication"] == 6 and m["assessment"] == 0
