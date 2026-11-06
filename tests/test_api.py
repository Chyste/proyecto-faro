"""Live-demo API: session loop, urgent route, SSE content type, ingest mode."""
import pytest
from fastapi.testclient import TestClient

from src.api.app import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(db_path=tmp_path / "t.db", offline=True)) as c:
        yield c


def pid(client, name):
    return next(p["id"] for p in client.get("/api/personas").json() if p["preferred_name"] == name)


def test_salud_and_personas(client):
    assert client.get("/api/salud").json() == {"ok": True, "modo": "offline"}
    names = [p["preferred_name"] for p in client.get("/api/personas").json()]
    assert "Rosa" in names and "Teresa" in names


def test_start_respuesta_loop_and_snapshot(client):
    r = client.post("/api/sesiones", json={"persona_id": pid(client, "Rosa"), "canal": "texto"}).json()
    sid = r["sesion_id"]
    assert r["decir"] and r["estado"] == "activa"
    out = client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, soy yo"}).json()
    assert out["decir"] and not out["terminada"]
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, bueno"})
    out = client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "a veces me siento sola"}).json()
    assert out["turno"]["indicador"] == "soledad_percibida"
    assert out["turno"]["estado"] == "informado" and out["turno"]["valor"] == "a_veces"
    snap = client.get(f"/api/sesiones/{sid}").json()
    assert snap["stats"]["turnos"] >= 1 and snap["stats"]["campos_reconocidos"] >= 1
    assert any(t["rol"] == "persona" for t in snap["transcripcion"])
    assert snap["nivel_actual"] in (0, 1, 2, 3, None)


def test_urgent_text_level3(client):
    sid = client.post("/api/sesiones", json={"persona_id": pid(client, "Teresa"), "canal": "voz"}).json()["sesion_id"]
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, soy yo"})
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, bueno"})
    out = client.post(f"/api/sesiones/{sid}/respuesta",
                      json={"texto": "me caí y me golpeé la cadera, necesito ayuda"}).json()
    assert out["urgente"] is True and out["terminada"] is True
    assert out["nivel_actual"] == 3
    assert any(a["level"] == 3 for a in out["alertas"])


def test_sse_content_type_and_events(client):
    sid = client.post("/api/sesiones", json={"persona_id": pid(client, "Rosa"), "canal": "texto"}).json()["sesion_id"]
    client.post(f"/api/sesiones/{sid}/terminar")  # closed session: stream sends snapshot + fin and ends
    with client.stream("GET", f"/api/sesiones/{sid}/eventos") as r:
        assert r.headers["content-type"].startswith("text/event-stream")
        body = "".join(r.iter_text())
    assert "event: turno_asistente" in body and "event: fin" in body


def test_ingest_mode_urgent(client):
    r = client.post("/api/sesiones", json={"persona_id": pid(client, "Teresa"), "modo": "ingesta"}).json()
    sid = r["sesion_id"]
    assert r["decir"] == []
    client.post(f"/api/sesiones/{sid}/turnos", json={"rol": "asistente", "texto": "¿Se ha caído en estos días?"})
    out = client.post(f"/api/sesiones/{sid}/turnos",
                      json={"rol": "persona", "texto": "me caí y me golpeé la cadera, necesito ayuda"}).json()
    assert out["urgente"] is True and out["nivel_actual"] == 3
    client.post(f"/api/sesiones/{sid}/terminar")
    with client.stream("GET", f"/api/sesiones/{sid}/eventos") as s:
        body = "".join(s.iter_text())
    assert "event: urgencia" in body and "event: alerta" in body
