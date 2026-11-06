"""Operator panel API (bandeja, ficha, alertas, llamadas, decisiones) on a seeded temp DB. Never touches Fish/Jev."""
import pytest
from fastapi.testclient import TestClient

from src.api.app import create_app
from src.db.connection import connect
from src.db.demo import populate


@pytest.fixture
def client(tmp_path):
    path = tmp_path / "panel.db"
    c = connect(path)
    populate(c)
    c.close()
    with TestClient(create_app(db_path=path, offline=True)) as tc:
        yield tc


def pid(client, name):
    return next(r["id"] for r in client.get("/api/bandeja").json()["personas"] if r["nombre"] == name)


def test_bandeja_rows_and_counters(client):
    b = client.get("/api/bandeja").json()
    assert len(b["personas"]) == 5
    c = b["contadores"]
    assert sum(c[k] for k in ("0", "1", "2", "3", "sin_evaluacion")) == 5
    row = b["personas"][0]
    for k in ("id", "nombre", "nivel", "motivo", "ultima_llamada", "responsable", "alertas_abiertas",
              "nivel_max_alerta", "estado_revision", "proxima_llamada", "frecuencia", "pausada"):
        assert k in row
    assert row["responsable"] == "Camila Rojas" or row["responsable"] is None
    assert row["proxima_llamada"].endswith("T10:00:00")
    assert row["ultima_llamada"]["estado"] in ("completada", "parcial", "sin_respuesta", "rechazada", "fallo_tecnico")


def test_persona_detail_gates_health(client):
    i = pid(client, "Rosa")
    d = client.get(f"/api/personas/{i}").json()
    assert d["perfil"]["nombre"] == "Rosa" and "medicamentos" not in d["perfil"]
    assert set(d["contacto_confianza"]) >= {"nombre", "relacion"} and "phone" not in str(d["contacto_confianza"])
    assert len(d["linea_tiempo"]) == 14
    assert {x["dimension"] for x in d["dimensiones"]} == {"aislamiento", "funcional", "medicacion", "emocional_cognitiva", "seguridad"}
    assert d["llamadas_recientes"] and "decisiones" in d and "nivel" in d
    full = client.get(f"/api/personas/{i}?incluir_salud=1").json()
    assert full["perfil"]["medicamentos"] and full["perfil"]["medicamentos"][0]["name"]
    assert client.get("/api/personas/999").status_code == 404


def test_alertas_list_and_detail(client):
    abiertas = client.get("/api/alertas?estado=abierta").json()
    assert abiertas and all(a["estado"] == "abierta" for a in abiertas)
    det = client.get(f"/api/alertas/{abiertas[0]['id']}").json()
    assert det["persona"]["id"] == abiertas[0]["persona_id"]
    assert "evidencia" in det and "conversacion_id" in det
    assert client.get("/api/alertas/99999").status_code == 404


def test_llamadas_and_transcript(client):
    i = pid(client, "Teresa")
    lst = client.get(f"/api/llamadas?persona_id={i}").json()
    assert len(lst) >= 10
    det = client.get(f"/api/llamadas/{lst[0]['id']}").json()
    assert det["turnos"] and {"rol", "texto", "observaciones"} <= set(det["turnos"][0])
    assert "evaluacion" in det and det["persona"]["id"] == i
    assert client.get("/api/llamadas/99999").status_code == 404


def _alert_n3(client):
    return next((a for a in client.get("/api/alertas?estado=abierta").json() if a["nivel"] == 3), None)


def _make_n3(client):
    sid = client.post("/api/sesiones", json={"persona_id": pid(client, "Teresa"), "canal": "voz"}).json()["sesion_id"]
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, soy yo"})
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "Sí, bueno"})
    client.post(f"/api/sesiones/{sid}/respuesta", json={"texto": "me caí y me golpeé la cadera, necesito ayuda"})
    return next(a for a in client.get("/api/alertas?estado=abierta").json()
                if a["nivel"] == 3 and a["persona_id"] == pid(client, "Teresa"))


def test_decision_derivar_marks_en_revision(client):
    al = _make_n3(client)
    r = client.post("/api/decisiones", json={"alerta_id": al["id"], "persona_id": al["persona_id"], "accion": "derivar",
                                              "destino": "CESFAM", "nota": "Derivada hoy", "transcripcion_revisada": True})
    assert r.status_code == 200, r.text
    assert client.get(f"/api/alertas/{al['id']}").json()["estado"] == "en_revision"
    dec = client.get(f"/api/personas/{al['persona_id']}").json()["decisiones"]
    assert dec[0]["accion"] == "derivar" and dec[0]["autor"] == "Camila Rojas" and dec[0]["destino"] == "CESFAM"


def test_level3_close_requires_review_and_justification(client):
    al = _make_n3(client)
    base = {"alerta_id": al["id"], "persona_id": al["persona_id"], "accion": "cerrar", "resultado": "Resuelto"}
    assert client.post("/api/decisiones", json={**base, "nota": "ok", "transcripcion_revisada": False}).status_code == 422
    assert client.post("/api/decisiones", json={**base, "nota": "  ", "transcripcion_revisada": True}).status_code == 422
    r = client.post("/api/decisiones", json={**base, "nota": "Hablé con el equipo", "transcripcion_revisada": True})
    assert r.status_code == 200
    assert client.get(f"/api/alertas/{al['id']}").json()["estado"] == "cerrada"


def test_level3_close_ok_with_prior_derivation(client):
    al = _make_n3(client)
    client.post("/api/decisiones", json={"alerta_id": al["id"], "persona_id": al["persona_id"], "accion": "derivar",
                                          "destino": "CESFAM", "nota": "x", "transcripcion_revisada": True})
    r = client.post("/api/decisiones", json={"alerta_id": al["id"], "persona_id": al["persona_id"], "accion": "cerrar",
                                              "resultado": "Resuelto", "nota": "", "transcripcion_revisada": True})
    assert r.status_code == 200


def test_other_actions_and_validation(client):
    i = pid(client, "Carlos")
    for acc in ("avisar_contacto", "solicitar_llamada_humana"):
        assert client.post("/api/decisiones", json={"persona_id": i, "accion": acc, "nota": "n",
                                                    "transcripcion_revisada": False}).status_code == 200
    assert client.post("/api/decisiones", json={"persona_id": i, "accion": "volar", "nota": "n",
                                                "transcripcion_revisada": False}).status_code == 422
    assert client.post("/api/decisiones", json={"persona_id": 999, "accion": "derivar", "nota": "n",
                                                "transcripcion_revisada": False}).status_code == 404


def test_asignar_and_frecuencia(client):
    i = pid(client, "Elena")
    assert client.post(f"/api/personas/{i}/asignar").status_code == 200
    f = client.post(f"/api/personas/{i}/frecuencia", json={"frecuencia": "semanal"})
    assert f.status_code == 200
    row = next(r for r in client.get("/api/bandeja").json()["personas"] if r["id"] == i)
    assert row["frecuencia"] == "semanal" and row["responsable"] == "Camila Rojas"
    assert client.post(f"/api/personas/{i}/frecuencia", json={"frecuencia": "cada minuto"}).status_code == 422
    assert client.get(f"/api/personas/{i}").json()["decisiones"][0]["accion"] in ("ajustar_frecuencia", "asignar")


def test_live_session_updates_bandeja(client):
    al = _make_n3(client)
    row = next(r for r in client.get("/api/bandeja").json()["personas"] if r["id"] == al["persona_id"])
    assert row["nivel"] == 3 and row["nivel_max_alerta"] == 3 and row["alertas_abiertas"] >= 1


def test_demo_reset_restores_seed(client):
    _make_n3(client)
    before = client.get("/api/llamadas?persona_id=%d" % pid(client, "Teresa")).json()
    r = client.post("/api/demo/reset")
    assert r.status_code == 200
    after = client.get("/api/llamadas?persona_id=%d" % pid(client, "Teresa")).json()
    assert len(after) == len(before) - 1
    assert sum(client.get("/api/bandeja").json()["contadores"].values()) == 5


def test_derivation_visible_everywhere_and_status_update(client):
    al = _make_n3(client)
    pid_ = al["persona_id"]
    r = client.post("/api/decisiones", json={"alerta_id": al["id"], "persona_id": pid_, "accion": "derivar", "destino": "CESFAM",
                                              "nota": "Derivada por caída", "transcripcion_revisada": True})
    assert r.status_code == 200
    ficha = client.get(f"/api/personas/{pid_}").json()
    d = ficha["decisiones"][0]
    assert d["accion"] == "derivar" and d["destino"] == "CESFAM" and d["estado_derivacion"] == "enviada"
    assert ficha["derivacion"]["destino"] == "CESFAM" and ficha["derivacion"]["estado"] == "enviada"
    assert client.get(f"/api/alertas/{al['id']}").json()["estado"] == "en_revision"
    assert client.get(f"/api/alertas/{al['id']}").json()["decisiones"][0]["destino"] == "CESFAM"
    row = next(x for x in client.get("/api/bandeja").json()["personas"] if x["id"] == pid_)
    assert row["derivacion"]["destino"] == "CESFAM" and row["estado_revision"] == "derivado" and row["nivel"] == 3
    up = client.post("/api/decisiones", json={"persona_id": pid_, "accion": "actualizar_derivacion", "ref_id": d["id"],
                                               "resultado": "recibida", "transcripcion_revisada": False})
    assert up.status_code == 200
    assert client.get(f"/api/personas/{pid_}").json()["derivacion"]["estado"] == "recibida"
    bad = client.post("/api/decisiones", json={"persona_id": pid_, "accion": "actualizar_derivacion", "ref_id": d["id"],
                                                "resultado": "perdida", "transcripcion_revisada": False})
    assert bad.status_code == 422
    assert client.post("/api/decisiones", json={"persona_id": pid_, "accion": "actualizar_derivacion", "ref_id": 99999,
                                                "resultado": "atendida", "transcripcion_revisada": False}).status_code == 404


def test_decisiones_feed(client):
    i = pid(client, "Carlos")
    client.post("/api/decisiones", json={"persona_id": i, "accion": "avisar_contacto", "nota": "n", "transcripcion_revisada": False})
    feed = client.get("/api/decisiones").json()
    assert feed[0]["persona"] == "Carlos" and feed[0]["accion"] == "avisar_contacto"
    assert client.get(f"/api/decisiones?persona_id={i}").json()[0]["persona_id"] == i
