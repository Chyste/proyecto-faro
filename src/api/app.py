"""FARO live-demo API (FastAPI). Run: uv run uvicorn src.api.app:app --port 8000 --reload

Sessions live in memory; the DB is written exactly like the interactive CLI (on finish and immediately on urgent).
Endpoints are `async` on purpose: sqlite and the session dict are only touched from the event-loop thread.
"""
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.checkin.dialogue import AYUDA, PENDING_STATES, URGENT_EVENT, DialogueSession, JevTurnClassifier, KeywordFakeClassifier
from src.checkin.dialogue_tree import TREE
from src.checkin.extractor_jev import JevError, get_client
from src.checkin.pipeline import _calls_until
from src.checkin.urgent import detect_urgent_messages, normalize
from src.checkin.rules import DIM_OF, DIMENSIONS, Call, Obs, evaluate
from src.db.catalog import INDICATORS, seed_catalog
from src.db.connection import connect, init_db
from src.db.synthetic import seed_synthetic

DIM_NAME = {"aislamiento": "Aislamiento social", "funcional": "Deterioro funcional",
            "medicacion": "Medicamentos y tratamientos", "emocional_cognitiva": "Salud emocional y cognitiva",
            "seguridad": "Seguridad y emergencias"}


class NuevaSesion(BaseModel):
    persona_id: int
    canal: str = "texto"  # "voz" | "texto"
    modo: str = "arbol"  # "arbol" (the tree drives the questions) | "ingesta" (an external voice AI drives them)


class Turno(BaseModel):
    rol: str  # "asistente" | "persona"
    texto: str


class Respuesta(BaseModel):
    texto: str


class FallbackClassifier:
    """Jev first; on Jev error answer with the offline keywords and remember it (reported in the event)."""

    def __init__(self, jev):
        self.jev, self.kw = jev, KeywordFakeClassifier()
        self.model_name, self.fallback_error = jev.model_name, None

    def classify(self, node, conversation, answer_text):
        cls = self.jev.classify(node, conversation, answer_text)
        if (cls.draft.detail or "").startswith("jev_error"):
            self.fallback_error = cls.draft.detail
            return self.kw.classify(node, conversation, answer_text)
        self.fallback_error = None
        return cls


@dataclass
class Live:
    id: str
    ds: DialogueSession
    modo: str
    classifier: object
    history: list = field(default_factory=list)
    subs: list = field(default_factory=list)
    finished: bool = False
    seen_alerts: set = field(default_factory=set)
    ingesta: bool = False
    node: object = None

    def emit(self, event: str, data: dict) -> None:
        self.history.append((event, data))
        for q in self.subs:
            q.put_nowait((event, data))


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _val(d) -> object:
    if d.state != "informado":
        return None
    if d.value_text is not None:
        return json.loads(d.value_text) if d.value_text.startswith("[") else d.value_text
    return None if d.value_num is None else bool(d.value_num)


def create_app(db_path: str | Path | None = None, offline: bool | None = None) -> FastAPI:
    db_path = Path(db_path or os.environ.get("FARO_DB", "data/processed/faro.db"))
    force_offline = offline if offline is not None else os.environ.get("FARO_OFFLINE") == "1"
    app = FastAPI(title="FARO en vivo", version="1.0")
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                       allow_methods=["*"], allow_headers=["*"])
    st: dict = {"conn": None, "jev": None, "jev_error": None, "sessions": {}, "n": 0}

    def conn():
        if st["conn"] is None:
            c = connect(db_path)
            init_db(c)
            seed_catalog(c)
            if c.execute("SELECT COUNT(*) FROM person").fetchone()[0] == 0:
                seed_synthetic(c)
            st["conn"] = c
        return st["conn"]

    def jev_client():
        if st["jev"] is None and st["jev_error"] is None:
            try:
                st["jev"] = get_client()
            except JevError as e:
                st["jev_error"] = str(e)
        return st["jev"]

    def mode(offline_req: bool) -> str:
        return "offline" if (force_offline or offline_req or jev_client() is None) else "jev"

    def get(sid: str) -> Live:
        s = st["sessions"].get(sid)
        if s is None:
            raise HTTPException(404, "sesión no encontrada")
        return s

    # ---- state builders
    def observaciones(s: Live) -> list[dict]:
        ds = s.ds
        out = []
        for code, d in ds.drafts.items():
            src = ds._sources.get(code, "ia")
            out.append({"indicador": code, "dimension": DIM_OF.get(code), "valor": _val(d), "estado": d.state,
                        "confianza": d.confidence, "cita": d.evidence_quote,
                        "fuente": "regla" if src == "regla" else ("jev" if s.modo == "jev" else "offline")})
        return out

    def nivel(s: Live) -> tuple[int | None, dict, str | None]:
        ds = s.ds
        if ds.conversation_id is not None:
            a = conn().execute("SELECT * FROM assessment WHERE conversation_id=?", (ds.conversation_id,)).fetchone()
            if a:
                reasons = json.loads(a["reasons"])
                return a["level"], json.loads(a["dimension_levels"]), (reasons[0]["explanation"] if reasons else None)
        try:  # live estimate: history + this (unpersisted) call
            fake = {"person_id": ds.person["id"], "started_at": ds.started_at, "id": -1}
            calls = [c for c in _calls_until(conn(), fake) if c.conversation_id != -1]
            obs = tuple(Obs(i, c, _val(d), d.state) for i, (c, d) in enumerate(ds.drafts.items()))
            calls.append(Call(-1, datetime.fromisoformat(ds.started_at).date(), True, obs))
            r = evaluate(calls, open_urgent=ds.urgent)
            return r.level, r.dimension_levels, (r.reasons[0]["explanation"] if r.reasons else None)
        except Exception:  # noqa: BLE001 - live estimate must never break the call
            return None, {d: None for d in DIMENSIONS}, None

    def alertas(s: Live) -> list[dict]:
        ds = s.ds
        if ds.conversation_id is None:
            return []
        rows = conn().execute(
            "SELECT * FROM alert WHERE person_id=? AND (created_at=? OR id IN (SELECT ae.alert_id FROM alert_evidence ae"
            " JOIN observation o ON o.id=ae.observation_id WHERE o.conversation_id=?)) ORDER BY id",
            (ds.person["id"], ds.started_at, ds.conversation_id)).fetchall()
        return [{"id": r["id"], "level": r["level"], "origin": r["origin"], "rule_code": r["rule_code"],
                 "explanation": r["explanation"], "status": r["status"]} for r in rows]

    def stats(s: Live) -> dict:
        tl = s.ds.turn_log
        conf = [t["confidence"] for t in tl if t["confidence"] is not None]
        lat = [t["latency_ms"] for t in tl]
        drafts = s.ds.drafts.values()
        return {"turnos": len(tl), "latencia_media_ms": round(sum(lat) / len(lat)) if lat else 0,
                "confianza_media": round(sum(conf) / len(conf), 2) if conf else None,
                "campos_reconocidos": sum(d.state == "informado" for d in drafts),
                "campos_pendientes": sum(d.state in PENDING_STATES for d in drafts)}

    def state_payload(s: Live) -> dict:
        lvl, dims, motivo = nivel(s)
        return {"nivel_actual": lvl, "niveles_por_dimension": dims, "motivo": motivo,
                "observaciones": observaciones(s), "alertas": alertas(s)}

    def publish_state(s: Live) -> None:
        p = state_payload(s)
        s.emit("nivel", {"nivel_actual": p["nivel_actual"], "niveles_por_dimension": p["niveles_por_dimension"],
                         "motivo": p["motivo"], "observaciones": p["observaciones"], "stats": stats(s)})
        for a in p["alertas"]:
            if a["id"] not in s.seen_alerts:
                s.seen_alerts.add(a["id"])
                s.emit("alerta", a)

    def say(s: Live, lines: list[str]) -> None:
        for t in lines:
            s.emit("turno_asistente", {"texto": t})

    def finish_events(s: Live) -> None:
        if s.ds.done and not s.finished:
            s.finished = True
            publish_state(s)
            s.emit("fin", {"estado": s.ds.status, "urgente": s.ds.urgent, "stats": stats(s)})

    # ---- endpoints
    @app.get("/api/salud")
    async def salud():
        return {"ok": True, "modo": mode(False)}

    @app.get("/api/personas")
    async def personas():
        rows = conn().execute("SELECT id, preferred_name, age, comuna_nombre FROM person ORDER BY id").fetchall()
        return [{"id": r["id"], "preferred_name": r["preferred_name"], "age": r["age"], "comuna": r["comuna_nombre"]}
                for r in rows]

    @app.post("/api/sesiones")
    async def crear(body: NuevaSesion, offline: int = 0):
        if body.canal not in ("voz", "texto"):
            raise HTTPException(422, "canal debe ser 'voz' o 'texto'")
        person = conn().execute("SELECT * FROM person WHERE id=?", (body.persona_id,)).fetchone()
        if person is None:
            raise HTTPException(404, "persona no encontrada")
        modo = mode(bool(offline))
        classifier = KeywordFakeClassifier() if modo == "offline" else FallbackClassifier(JevTurnClassifier(jev_client()))
        clock = lambda: datetime.now().astimezone()  # noqa: E731
        ds = DialogueSession(person, TREE, classifier, clock, conn=conn(), channel="voz" if body.canal == "voz" else "simulado")
        st["n"] += 1
        s = Live(f"s{st['n']}", ds, modo, classifier)
        st["sessions"][s.id] = s
        if body.modo == "ingesta":
            s.ingesta = True
            ds.started_at = clock().isoformat(timespec="seconds")
            s.emit("turno_asistente", {"texto": "(modo ingesta: otra IA conduce la conversación)", "modo": modo,
                                       "persona": person["preferred_name"], "sistema": True})
            return {"sesion_id": s.id, "decir": [], "estado": "activa", "modo": modo, "modo_sesion": "ingesta"}
        first = ds.start()
        s.emit("turno_asistente", {"texto": first, "modo": modo, "persona": person["preferred_name"]})
        return {"sesion_id": s.id, "decir": [first], "estado": "activa", "modo": modo}

    @app.post("/api/sesiones/{sid}/respuesta")
    async def respuesta(sid: str, body: Respuesta):
        s = get(sid)
        ds = s.ds
        if ds.done:
            raise HTTPException(409, "la llamada ya terminó")
        s.emit("turno_persona", {"texto": body.texto})
        n_before = len(ds.turn_log)
        res = ds.reply(body.texto)
        turno = None
        if len(ds.turn_log) > n_before:
            t = ds.turn_log[-1]
            d = ds.drafts.get(t["code"]) or res.classification.draft if res.classification else None
            fb = getattr(s.classifier, "fallback_error", None)
            turno = {"indicador": t["code"], "valor": _val(d) if d else None, "estado": t["state"],
                     "confianza": t["confidence"], "latencia_ms": t["latency_ms"],
                     "repregunta": t["state"] in PENDING_STATES and ds._retry, "cita": body.texto,
                     "fuente": "jev" if s.modo == "jev" and not fb else "offline",
                     "fallback_offline": bool(fb), "aviso": ("Jev no respondió; se usó clasificación sin conexión" if fb else None)}
            s.emit("clasificacion", turno)
        if res.urgent:
            ev = ds._urgent_event[1] if ds._urgent_event else body.texto
            s.emit("urgencia", {"cita": ev, "mensaje": "Activación simulada del protocolo — ruta por reglas, sin IA"})
            if not ds.done:
                ds.abandon()  # protocol message is the last thing said; persists + assessment
        say(s, res.utterances)
        publish_state(s)
        finish_events(s)
        p = state_payload(s)
        return {"decir": res.utterances, "terminada": ds.done, "urgente": ds.urgent, "turno": turno,
                "observaciones": p["observaciones"], "nivel_actual": p["nivel_actual"],
                "niveles_por_dimension": p["niveles_por_dimension"], "alertas": p["alertas"]}

    def match_node(text: str):
        words = set(normalize(text).split())
        best, score = None, 0.0
        for n in TREE.nodes:
            if not n.indicator_code:
                continue
            for pr in (n.prompt, n.alt_prompt):
                if not pr:
                    continue
                pw = set(normalize(pr).split())
                sc = len(words & pw) / max(len(pw), 1)
                if sc > score:
                    best, score = n, sc
        return best if score >= 0.5 else None

    @app.post("/api/sesiones/{sid}/turnos")
    async def turnos(sid: str, body: Turno):
        """Ingest mode: store an assistant/persona turn spoken by an external voice AI."""
        s = get(sid)
        ds = s.ds
        if not s.ingesta:
            raise HTTPException(409, "la sesión está en modo árbol; use /respuesta")
        if ds.done:
            raise HTTPException(409, "la llamada ya terminó")
        if body.rol == "asistente":
            node = match_node(body.texto)
            s.node = node or s.node
            ds._msgs.append({"role": "asistente", "question_code": node.indicator_code if node else None,
                             "text": body.texto})
            s.emit("turno_asistente", {"texto": body.texto, "indicador": node.indicator_code if node else None})
            return {"ok": True, "indicador": node.indicator_code if node else None, "urgente": False,
                    "terminada": False}
        if body.rol != "persona":
            raise HTTPException(422, "rol debe ser 'asistente' o 'persona'")
        ds._msgs.append({"role": "persona", "question_code": None, "text": body.texto})
        s.emit("turno_persona", {"texto": body.texto})
        node, turno, event = s.node, None, None
        if detect_urgent_messages(ds._persona_texts()):
            event = (URGENT_EVENT.get(node.indicator_code if node else None, AYUDA), body.texto)
        elif node is not None and node.kind in ("category", "bool", "list"):
            code = node.indicator_code
            cls = ds.classifier.classify(node, ds._msgs[:-1], body.texto)
            d = cls.draft
            ds.turn_log.append({"code": code, "state": d.state, "confidence": d.confidence,
                                "latency_ms": cls.latency_ms, "detail": d.detail, "retry": False})
            ds._raw_turn(code, body.texto, cls)
            ds.drafts[code], ds._sources[code] = d, "ia"
            fb = getattr(s.classifier, "fallback_error", None)
            turno = {"indicador": code, "valor": _val(d), "estado": d.state, "confianza": d.confidence,
                     "latencia_ms": cls.latency_ms, "repregunta": False, "cita": body.texto,
                     "fuente": "jev" if s.modo == "jev" and not fb else "offline", "fallback_offline": bool(fb),
                     "aviso": "Jev no respondió; se usó clasificación sin conexión" if fb else None}
            s.emit("clasificacion", turno)
            if d.state == "informado" and d.value_num == 1.0 and code in URGENT_EVENT:
                event = (URGENT_EVENT[code], body.texto)
            elif cls.flags:  # Jev Noul safety net
                ev = cls.flags[0][0]
                event = (ev if ev in ("necesita_ayuda_inmediata", "caida_con_lesion", "sintoma_agudo") else AYUDA, body.texto)
        decir = []
        if event:
            ds._urgent_event = event
            decir = ds._urgent().utterances
            s.emit("urgencia", {"cita": event[1], "mensaje": "Activación simulada del protocolo — ruta por reglas, sin IA"})
            ds.abandon()
            say(s, decir)
        publish_state(s)
        finish_events(s)
        p = state_payload(s)
        return {"ok": True, "decir": decir, "urgente": ds.urgent, "terminada": ds.done, "turno": turno,
                "nivel_actual": p["nivel_actual"], "alertas": p["alertas"]}

    @app.get("/api/sesiones/{sid}")
    async def snapshot(sid: str):
        s = get(sid)
        p = state_payload(s)
        return {"sesion_id": s.id, "persona": s.ds.person["preferred_name"], "modo": s.modo,
                "estado": "terminada" if s.ds.done else "activa", "urgente": s.ds.urgent,
                "transcripcion": [{"rol": "persona" if m["role"] == "persona" else "asistente", "texto": m["text"]}
                                  for m in s.ds._msgs],
                "stats": stats(s), **p}

    @app.post("/api/sesiones/{sid}/terminar")
    async def terminar(sid: str):
        s = get(sid)
        if not s.ds.done:
            s.ds.abandon()
        publish_state(s)
        finish_events(s)
        return await snapshot(sid)

    @app.get("/api/sesiones/{sid}/eventos")
    async def eventos(sid: str):
        s = get(sid)

        async def gen():
            q: asyncio.Queue = asyncio.Queue()
            for ev, data in list(s.history):  # snapshot: replay what already happened
                yield _sse(ev, data)
            if s.finished:
                return
            s.subs.append(q)
            try:
                while True:
                    try:
                        ev, data = await asyncio.wait_for(q.get(), timeout=15)
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
                        continue
                    yield _sse(ev, data)
                    if ev == "fin":
                        return
            finally:
                s.subs.remove(q)

        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    return app


app = create_app()
