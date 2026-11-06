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


def _person_texts(conn, name, day):
    return [
        r["text"]
        for r in conn.execute(
            "SELECT m.text FROM message m JOIN conversation c ON c.id=m.conversation_id"
            " WHERE c.person_id=? AND m.role='persona' AND date(c.started_at)=date('2026-10-23', ?)"
            " ORDER BY m.turn",
            (_pid(conn, name), f"+{day - 1} days"),
        )
    ]


def test_counts(conn):
    assert conn.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM conversation").fetchone()[0] == 70
    per = conn.execute("SELECT COUNT(*) n FROM conversation GROUP BY person_id").fetchall()
    assert all(r["n"] == 14 for r in per)
    assert conn.execute("SELECT COUNT(*) FROM staff_user").fetchone()[0] == 2
    assert conn.execute("SELECT COUNT(*) FROM consent_record").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM trusted_contact").fetchone()[0] == 5


def test_no_pipeline_outputs(conn):
    for t in ("extraction", "observation", "alert", "cusum_state"):
        assert conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] == 0


def test_all_synthetic_and_assigned(conn):
    assert conn.execute("SELECT COUNT(*) FROM person WHERE is_synthetic=0 OR assigned_to IS NULL").fetchone()[0] == 0
    assert conn.execute("SELECT DISTINCT comuna_cut FROM person").fetchone()[0] == 13129


def test_elena_no_response_streak(conn):
    rows = conn.execute(
        "SELECT status, id FROM conversation WHERE person_id=? ORDER BY started_at", (_pid(conn, "Elena"),)
    ).fetchall()
    assert [r["status"] for r in rows[-4:]] == ["sin_respuesta"] * 4
    assert all(r["status"] != "sin_respuesta" for r in rows[:-4])
    for r in rows[-4:]:
        n = conn.execute(
            "SELECT COUNT(*) FROM message WHERE conversation_id=? AND role='persona'", (r["id"],)
        ).fetchone()[0]
        assert n == 0


def test_carmen_fall_on_day_12(conn):
    text = " ".join(_person_texts(conn, "Carmen", 12)).lower()
    assert "caí" in text or "caida" in text or "caída" in text


def test_rosa_late_days_mention_pills(conn):
    text = " ".join(" ".join(_person_texts(conn, "Rosa", d)) for d in range(12, 15)).lower()
    assert "pastillas" in text or "remedios" in text
    assert "se me acabaron las pastillas" in " ".join(
        " ".join(_person_texts(conn, "Rosa", d)) for d in range(9, 15)
    ).lower()


def test_jorge_bad_sleep_day_6(conn):
    text = " ".join(_person_texts(conn, "Jorge", 6)).lower()
    assert "dormí mal" in text or "no pude dormir" in text or "mal la noche" in text


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
        return c.execute("SELECT conversation_id, turn, role, text FROM message ORDER BY id").fetchall()

    a, b = build(), build()
    assert [tuple(r) for r in dump(a)] == [tuple(r) for r in dump(b)]


def test_manifest_counts(conn):
    m = manifest(conn)
    assert m["person"] == 5 and m["conversation"] == 70 and m["message"] > 100
