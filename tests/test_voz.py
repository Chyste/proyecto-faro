"""Voice proxies: Fish Audio is always mocked; keys never leave the server."""
import httpx
import pytest
from fastapi.testclient import TestClient

from src.api.app import create_app


@pytest.fixture
def mk(tmp_path, monkeypatch):
    monkeypatch.setattr("src.api.voz.load_dotenv", lambda *a, **k: None)
    monkeypatch.delenv("FISH_API_KEY", raising=False)
    monkeypatch.delenv("FISH_VOICE_ID", raising=False)

    def make(handler=None):
        app = create_app(db_path=tmp_path / "v.db", offline=True)
        if handler:
            app.state.fish_transport = httpx.MockTransport(handler)
        return TestClient(app)
    return make


def test_estado_false_without_key(mk):
    assert mk().get("/api/voz/estado").json() == {"tts": False, "stt": False}


def test_tts_without_key_is_503(mk):
    r = mk().post("/api/voz/tts", json={"texto": "Hola"})
    assert r.status_code == 503


def test_tts_proxies_with_direction_and_headers(mk, monkeypatch):
    monkeypatch.setenv("FISH_API_KEY", "k-secret")
    monkeypatch.setenv("FISH_VOICE_ID", "voz1")
    seen = {}

    def handler(req):
        seen["h"], seen["j"] = req.headers, req.read()
        return httpx.Response(200, content=b"ID3audio", headers={"content-type": "audio/mpeg"})
    c = mk(handler)
    assert c.get("/api/voz/estado").json() == {"tts": True, "stt": True}
    r = c.post("/api/voz/tts", json={"texto": "Buenos días, Rosa"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("audio/mpeg") and r.content == b"ID3audio"
    assert seen["h"]["authorization"] == "Bearer k-secret" and seen["h"]["model"] == "drama-3"
    import json
    body = json.loads(seen["j"])
    assert body["text"].startswith("[tono cálido, pausado y cercano]") and "Buenos días, Rosa" in body["text"]
    assert body["format"] == "mp3" and body["reference_id"] == "voz1"
    assert "k-secret" not in r.text


def test_tts_upstream_error_maps_to_502(mk, monkeypatch):
    monkeypatch.setenv("FISH_API_KEY", "k")
    c = mk(lambda req: httpx.Response(402, json={"message": "no credit"}))
    r = c.post("/api/voz/tts", json={"texto": "Hola"})
    assert r.status_code == 502 and "k" != r.text


def test_stt_returns_text(mk, monkeypatch):
    monkeypatch.setenv("FISH_API_KEY", "k")
    seen = {}

    def handler(req):
        seen["h"], seen["body"] = req.headers, req.read()
        return httpx.Response(200, json={"text": " me siento bien ", "duration": 2.0})
    c = mk(handler)
    r = c.post("/api/voz/stt", files={"audio": ("a.webm", b"\x1aE\xdf\xa3fake", "audio/webm")})
    assert r.status_code == 200 and r.json() == {"texto": "me siento bien"}
    assert seen["h"]["model"] == "transcribe-1-pro" and b'name="language"' in seen["body"] and b"es" in seen["body"]


def test_stt_without_key_503(mk):
    assert mk().post("/api/voz/stt", files={"audio": ("a.webm", b"x", "audio/webm")}).status_code == 503
