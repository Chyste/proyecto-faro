"""Operator panel API: everything the dashboard shows comes from SQLite through these read/decision endpoints.

Operators never place or register calls (calls are automatic): they review transcripts and DECIDE.
All handlers are `async` on purpose (single shared sqlite connection, touched only from the event loop).
"""
from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

DIM_NAME = {"aislamiento": "Aislamiento social", "funcional": "Deterioro funcional",
            "medicacion": "Medicamentos y tratamientos", "emocional_cognitiva": "Salud emocional y cognitiva",
            "seguridad": "Seguridad y emergencias"}
FRECUENCIAS = {"diaria": 1, "cada 2 días": 2, "semanal": 7}
ACC_DB = {"derivar": "derivacion", "avisar_contacto": "aviso_contacto",
          "solicitar_llamada_humana": "solicitar_llamada_humana", "ajustar_frecuencia": "ajustar_frecuencia",
          "cerrar": "cierre", "pausar": "pausa", "asignar": "asignacion",
          "actualizar_derivacion": "actualizar_derivacion"}
DB_ACC = {v: k for k, v in ACC_DB.items()} | {"derivacion_cesfam": "derivar"}
OPERADOR_ID = 1  # demo user: Camila Rojas


class Bus:
    """Global fan-out of panel events to SSE subscribers (event-loop thread only)."""

    def __init__(self) -> None:
        self.subs: list[asyncio.Queue] = []

    def emit(self, event: str, data: dict) -> None:
        for q in list(self.subs):
            q.put_nowait((event, data))


class Decision(BaseModel):
    alerta_id: int | None = None
    persona_id: int
    accion: str
    destino: str | None = None
    nota: str = ""
    resultado: str | None = None
    proxima_revision: str | None = None
    transcripcion_revisada: bool = False
    ref_id: int | None = None  # actualizar_derivacion: id of the derivation decision


class Frecuencia(BaseModel):
    frecuencia: str


def _val(r):
    if r["state"] != "informado":
        return None
    if r["value_text"] is not None:
        return json.loads(r["value_text"]) if r["value_text"].startswith("[") else r["value_text"]
    return None if r["value_num"] is None else bool(r["value_num"])


def _obs(r) -> dict:
    return {"indicador": r["indicator_code"], "dimension": r["dimension_code"], "valor": _val(r), "estado": r["state"],
            "cita": r["evidence_quote"], "confianza": r["confidence"],
            "fuente": {"regla": "regla", "ia": "ia"}.get(r["source"], "reproduccion"),
            "observado_en": r["observed_at"], "conversacion_id": r["conversation_id"]}


OBS_SQL = ("SELECT o.*, i.dimension_code FROM observation o JOIN indicator i ON i.code=o.indicator_code ")


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def build_router(get_conn, bus: Bus, reset_demo) -> APIRouter:
    r = APIRouter(prefix="/api")

    # ---- helpers
    def person_or_404(pid: int):
        p = get_conn().execute("SELECT * FROM person WHERE id=?", (pid,)).fetchone()
        if p is None:
            raise HTTPException(404, "persona no encontrada")
        return p

    def last_assessment(pid: int):
        return get_conn().execute("SELECT * FROM assessment WHERE person_id=? ORDER BY evaluated_at DESC, id DESC LIMIT 1",
                                  (pid,)).fetchone()

    def reasons_of(a) -> list[dict]:
        return json.loads(a["reasons"]) if a else []

    def frecuencia_de(pid: int) -> str:
        row = get_conn().execute("SELECT frequency FROM contact_plan WHERE person_id=?", (pid,)).fetchone()
        return row[0] if row else "diaria"

    def estado_revision(pid: int) -> str:
        c = get_conn()
        sts = [x[0] for x in c.execute("SELECT status FROM alert WHERE person_id=?", (pid,))]
        abiertas = [x for x in sts if x != "cerrada"]
        if abiertas and c.execute("SELECT 1 FROM intervention WHERE person_id=? AND action IN ('derivacion','derivacion_cesfam')"
                                  " AND alert_id IN (SELECT id FROM alert WHERE person_id=? AND status!='cerrada')",
                                  (pid, pid)).fetchone():
            return "derivado"
        if "abierta" in sts:
            return "pendiente"
        if "en_revision" in sts:
            return "en_revision"
        return "revisado" if sts else "sin_pendientes"

    def hoy() -> date:
        row = get_conn().execute("SELECT MAX(started_at) FROM conversation").fetchone()[0]
        return date.fromisoformat(row[:10]) if row else date.today()

    def fila(p, pcl) -> dict:
        c = get_conn()
        a = last_assessment(p["id"])
        rs = reasons_of(a)
        conv = c.execute("SELECT id, started_at, status FROM conversation WHERE person_id=? ORDER BY started_at DESC, id DESC LIMIT 1",
                         (p["id"],)).fetchone()
        al = c.execute("SELECT COUNT(*), MAX(level) FROM alert WHERE person_id=? AND status!='cerrada'", (p["id"],)).fetchone()
        staff = c.execute("SELECT name FROM staff_user WHERE id=?", (p["assigned_to"],)).fetchone()
        frec = frecuencia_de(p["id"])
        pausada = p["status"] == "pausada"
        prox = None
        if not pausada:
            base = date.fromisoformat(conv["started_at"][:10]) if conv else hoy()
            prox = f"{base + timedelta(days=FRECUENCIAS[frec])}T10:00:00"
        return {"id": p["id"], "nombre": p["preferred_name"], "edad": p["age"], "comuna": p["comuna_nombre"], "vive_sola": p["vive_sola"],
                "nivel": pcl["level"], "motivo": rs[0]["explanation"] if rs else None,
                "ultima_llamada": {"id": conv["id"], "fecha": conv["started_at"], "estado": conv["status"]} if conv else None,
                "responsable": staff[0] if staff else None, "alertas_abiertas": al[0], "nivel_max_alerta": al[1],
                "estado_revision": estado_revision(p["id"]), "proxima_llamada": prox, "frecuencia": frec, "pausada": pausada,
                "derivacion": derivacion_vigente(p["id"])}

    # ---- bandeja
    @r.get("/bandeja")
    async def bandeja():
        c = get_conn()
        pcl = {x["person_id"]: x for x in c.execute("SELECT * FROM person_current_level")}
        rows = [fila(p, pcl[p["id"]]) for p in c.execute("SELECT * FROM person ORDER BY id").fetchall()]
        cont = {"0": 0, "1": 0, "2": 0, "3": 0, "sin_evaluacion": 0}
        for x in rows:
            cont["sin_evaluacion" if x["nivel"] is None else str(x["nivel"])] += 1
        return {"personas": rows, "contadores": cont, "hoy": hoy().isoformat()}

    # ---- persona
    @r.get("/personas/{pid}")
    async def persona(pid: int, incluir_salud: int = 0):
        c = get_conn()
        p = person_or_404(pid)
        pcl = c.execute("SELECT * FROM person_current_level WHERE person_id=?", (pid,)).fetchone()
        base = fila(p, pcl)
        a = last_assessment(pid)
        perfil = {"nombre": p["preferred_name"], "edad": p["age"], "comuna": p["comuna_nombre"], "area": p["area"],
                  "vive_sola": p["vive_sola"], "autonomia_base": p["autonomia_base"], "red_apoyo_base": p["red_apoyo_base"],
                  "tiene_tratamiento": p["tiene_tratamiento"], "horario_preferido": p["horario_preferido"],
                  "intereses": json.loads(p["intereses"]) if p["intereses"] else [], "prioridad": p["priority"],
                  "estado": p["status"], "discapacidad": p["discapacidad_wg"]}
        if incluir_salud:
            perfil["medicamentos"] = [{"name": m["name"], "source": m["source"], "verified_at": m["verified_at"]}
                                      for m in c.execute("SELECT * FROM person_medication WHERE person_id=?", (pid,))]
        tc = c.execute("SELECT name, relation, notify_allowed FROM trusted_contact WHERE person_id=? ORDER BY id LIMIT 1",
                       (pid,)).fetchone()
        cons = c.execute("SELECT * FROM consent_record WHERE person_id=? ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
        dims_lv = json.loads(a["dimension_levels"]) if a else {}
        dims = []
        for code, name in DIM_NAME.items():
            inds = []
            for ind in c.execute("SELECT code FROM indicator WHERE dimension_code=? ORDER BY code", (code,)):
                o = c.execute(OBS_SQL + "WHERE o.person_id=? AND o.indicator_code=? AND o.state!='no_preguntado'"
                              " ORDER BY o.observed_at DESC, o.id DESC LIMIT 1", (pid, ind[0])).fetchone()
                if o:
                    inds.append(_obs(o))
            dims.append({"dimension": code, "nombre": name, "nivel": dims_lv.get(code), "indicadores": inds})
        fin = hoy()
        tl = []
        for k in range(13, -1, -1):
            d = (fin - timedelta(days=k)).isoformat()
            row = c.execute("SELECT a.level, cv.status FROM conversation cv LEFT JOIN assessment a ON a.conversation_id=cv.id"
                            " WHERE cv.person_id=? AND substr(cv.started_at,1,10)=? ORDER BY cv.started_at DESC, cv.id DESC LIMIT 1",
                            (pid, d)).fetchone()
            tl.append({"fecha": d, "nivel": row[0] if row else None, "estado_llamada": row[1] if row else None})
        calls = c.execute("SELECT cv.id, cv.started_at, cv.status, cv.channel, a.level FROM conversation cv"
                          " LEFT JOIN assessment a ON a.conversation_id=cv.id WHERE cv.person_id=?"
                          " ORDER BY cv.started_at DESC, cv.id DESC LIMIT 10", (pid,)).fetchall()
        return {**base, "perfil": perfil,
                "contacto_confianza": {"nombre": tc["name"], "relacion": tc["relation"], "autorizado": bool(tc["notify_allowed"])} if tc else None,
                "consentimiento": {"checkin": bool(cons["scope_checkin"]), "datos_sensibles": bool(cons["scope_sensitive"]),
                                   "terceros": bool(cons["scope_third_party"]), "otorgado": cons["granted_at"],
                                   "revocado": cons["revoked_at"]} if cons else None,
                "razones": [{"regla": x["rule_code"], "dimension": x.get("dimension_code"), "explicacion": x["explanation"]}
                            for x in reasons_of(a)],
                "dimensiones": dims, "linea_tiempo": tl,
                "llamadas_recientes": [{"id": x["id"], "fecha": x["started_at"], "estado": x["status"], "canal": x["channel"],
                                        "nivel": x["level"]} for x in calls],
                "decisiones": decisiones_de(persona_id=pid)}

    def decisiones_de(persona_id: int | None = None, alerta_id: int | None = None) -> list[dict]:
        sql = ("SELECT i.*, u.name AS autor FROM intervention i JOIN staff_user u ON u.id=i.user_id WHERE "
               + ("i.person_id=?" if persona_id is not None else "i.alert_id=?") + " ORDER BY i.id DESC")
        rows = get_conn().execute(sql, (persona_id if persona_id is not None else alerta_id,)).fetchall()
        out = []
        for x in rows:
            d = {"id": x["id"], "fecha": x["created_at"], "accion": DB_ACC.get(x["action"], x["action"]), "autor": x["autor"],
                 "destino": x["destination"], "nota": x["notes"], "resultado": x["outcome"], "alerta_id": x["alert_id"],
                 "proxima_revision": x["next_followup_at"], "transcripcion_revisada": bool(x["transcript_reviewed"]),
                 "ref_id": x["ref_id"]}
            if x["action"] in ("derivacion", "derivacion_cesfam"):
                d["estado_derivacion"] = estado_derivacion(x["id"])
            out.append(d)
        return out

    def estado_derivacion(iid: int) -> str:
        row = get_conn().execute("SELECT outcome FROM intervention WHERE ref_id=? AND action='actualizar_derivacion'"
                                 " ORDER BY id DESC LIMIT 1", (iid,)).fetchone()
        return row[0] if row else "enviada"

    def derivacion_vigente(pid: int) -> dict | None:
        x = get_conn().execute("SELECT * FROM intervention WHERE person_id=? AND action IN ('derivacion','derivacion_cesfam')"
                               " ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
        if x is None:
            return None
        return {"id": x["id"], "destino": x["destination"], "fecha": x["created_at"], "estado": estado_derivacion(x["id"])}

    # ---- alertas
    def alerta_row(x) -> dict:
        staff = get_conn().execute("SELECT name FROM staff_user WHERE id=?", (x["assigned_to"],)).fetchone()
        return {"id": x["id"], "persona_id": x["person_id"], "persona": x["preferred_name"], "edad": x["age"],
                "comuna": x["comuna_nombre"], "nivel": x["level"], "origen": x["origin"], "regla": x["rule_code"],
                "explicacion": x["explanation"], "estado": x["status"], "creada": x["created_at"],
                "responsable": staff[0] if staff else None}

    ALERT_SQL = ("SELECT a.*, p.preferred_name, p.age, p.comuna_nombre FROM alert a JOIN person p ON p.id=a.person_id ")

    @r.get("/alertas")
    async def alertas(estado: str | None = None, persona_id: int | None = None):
        sql, args = ALERT_SQL + "WHERE 1=1", []
        if estado and estado != "todas":
            sql += " AND a.status=?"
            args.append(estado)
        if persona_id is not None:
            sql += " AND a.person_id=?"
            args.append(persona_id)
        sql += " ORDER BY a.level DESC, a.created_at DESC, a.id DESC"
        return [alerta_row(x) for x in get_conn().execute(sql, args)]

    @r.get("/alertas/{aid}")
    async def alerta(aid: int):
        c = get_conn()
        x = c.execute(ALERT_SQL + "WHERE a.id=?", (aid,)).fetchone()
        if x is None:
            raise HTTPException(404, "alerta no encontrada")
        ev = [_obs(o) for o in c.execute(
            OBS_SQL + "JOIN alert_evidence ae ON ae.observation_id=o.id WHERE ae.alert_id=? ORDER BY o.observed_at, o.id", (aid,))]
        conv = max((e["conversacion_id"] for e in ev if e["conversacion_id"]), default=None)
        if conv is None:
            row = c.execute("SELECT id FROM conversation WHERE person_id=? AND started_at<=? ORDER BY started_at DESC, id DESC LIMIT 1",
                            (x["person_id"], x["created_at"])).fetchone() or c.execute(
                "SELECT id FROM conversation WHERE person_id=? ORDER BY started_at DESC, id DESC LIMIT 1", (x["person_id"],)).fetchone()
            conv = row[0] if row else None
        return {**alerta_row(x), "persona": {"id": x["person_id"], "nombre": x["preferred_name"], "edad": x["age"],
                                             "comuna": x["comuna_nombre"]},
                "evidencia": ev, "conversacion_id": conv, "decisiones": decisiones_de(alerta_id=aid)}

    # ---- llamadas
    @r.get("/llamadas")
    async def llamadas(persona_id: int | None = Query(None)):
        sql = ("SELECT cv.id, cv.person_id, p.preferred_name, cv.started_at, cv.status, cv.channel, a.level,"
               " (SELECT COUNT(*) FROM message m WHERE m.conversation_id=cv.id) AS n FROM conversation cv"
               " JOIN person p ON p.id=cv.person_id LEFT JOIN assessment a ON a.conversation_id=cv.id")
        args: list = []
        if persona_id is not None:
            sql += " WHERE cv.person_id=?"
            args.append(persona_id)
        sql += " ORDER BY cv.started_at DESC, cv.id DESC"
        return [{"id": x["id"], "persona_id": x["person_id"], "persona": x["preferred_name"], "fecha": x["started_at"],
                 "estado": x["status"], "canal": x["channel"], "nivel": x["level"], "mensajes": x["n"]}
                for x in get_conn().execute(sql, args)]

    @r.get("/llamadas/{cid}")
    async def llamada(cid: int):
        c = get_conn()
        cv = c.execute("SELECT cv.*, p.preferred_name, p.age FROM conversation cv JOIN person p ON p.id=cv.person_id WHERE cv.id=?",
                       (cid,)).fetchone()
        if cv is None:
            raise HTTPException(404, "llamada no encontrada")
        msgs = c.execute("SELECT * FROM message WHERE conversation_id=? ORDER BY turn", (cid,)).fetchall()
        obs = [(o, _obs(o)) for o in c.execute(OBS_SQL + "WHERE o.conversation_id=? ORDER BY o.id", (cid,))]
        turnos = [{"turno": m["turn"], "rol": m["role"], "texto": m["text"], "question_code": m["question_code"],
                   "observaciones": []} for m in msgs]
        for raw, o in obs:
            quote = (raw["evidence_quote"] or "").lower()
            idx = next((i for i, t in enumerate(turnos) if quote and t["rol"] == "persona" and quote in t["texto"].lower()), None)
            if idx is None:
                idx = next((i + 1 for i, t in enumerate(turnos) if t["question_code"] == raw["indicator_code"]
                            and i + 1 < len(turnos) and turnos[i + 1]["rol"] == "persona"), None)
            if idx is not None:
                turnos[idx]["observaciones"].append(o)
        a = c.execute("SELECT * FROM assessment WHERE conversation_id=?", (cid,)).fetchone()
        return {"id": cid, "persona": {"id": cv["person_id"], "nombre": cv["preferred_name"], "edad": cv["age"]},
                "fecha": cv["started_at"], "estado": cv["status"], "canal": cv["channel"],
                "evento_urgente": {"tipo": cv["urgent_event_type"], "cita": cv["urgent_event_quote"]} if cv["urgent_event_type"] else None,
                "turnos": turnos, "observaciones": [o for _, o in obs],
                "evaluacion": {"nivel": a["level"], "niveles_por_dimension": json.loads(a["dimension_levels"]),
                               "razones": json.loads(a["reasons"])} if a else None}

    # ---- decisiones
    def now() -> str:
        return datetime.now().astimezone().isoformat(timespec="seconds")

    def log(pid: int, accion: str, alerta_id=None, nota="", destino=None, resultado=None, prox=None, revisada=False,
            ref_id=None) -> int:
        cur = get_conn().execute(
            "INSERT INTO intervention (alert_id, person_id, user_id, action, notes, outcome, next_followup_at, created_at,"
            " destination, transcript_reviewed, ref_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (alerta_id, pid, OPERADOR_ID, ACC_DB[accion], nota.strip() or None, resultado, prox, now(), destino, int(revisada),
             ref_id))
        return cur.lastrowid

    def tras_decision(pid: int, aid: int | None, accion: str) -> None:
        get_conn().commit()
        bus.emit("decision_registrada", {"persona_id": pid, "alerta_id": aid, "accion": accion})
        bus.emit("persona_actualizada", {"persona_id": pid})

    @r.get("/decisiones")
    async def decisiones(persona_id: int | None = None):
        """Every human decision, newest first (Seguimiento feed)."""
        rows = get_conn().execute("SELECT i.person_id, p.preferred_name FROM intervention i JOIN person p ON p.id=i.person_id"
                                  + (" WHERE i.person_id=?" if persona_id is not None else "") + " GROUP BY i.person_id",
                                  (persona_id,) if persona_id is not None else ()).fetchall()
        out = [{**d, "persona_id": x["person_id"], "persona": x["preferred_name"]}
               for x in rows for d in decisiones_de(persona_id=x["person_id"])]
        return sorted(out, key=lambda d: (d["fecha"], d["id"]), reverse=True)

    @r.post("/decisiones")
    async def decision(b: Decision):
        c = get_conn()
        person_or_404(b.persona_id)
        if b.accion not in ACC_DB or b.accion == "asignar":
            raise HTTPException(422, f"acción no válida: {b.accion}")
        al = None
        if b.alerta_id is not None:
            al = c.execute("SELECT * FROM alert WHERE id=? AND person_id=?", (b.alerta_id, b.persona_id)).fetchone()
            if al is None:
                raise HTTPException(404, "alerta no encontrada para esa persona")
        nota = b.nota.strip()
        if b.accion in ("derivar", "solicitar_llamada_humana", "pausar") and not nota:
            raise HTTPException(422, "la nota es obligatoria")
        if b.accion == "derivar" and not b.destino:
            raise HTTPException(422, "falta el destino de la derivación")
        if b.accion == "actualizar_derivacion":
            ref = c.execute("SELECT * FROM intervention WHERE id=? AND person_id=? AND action IN ('derivacion','derivacion_cesfam')",
                            (b.ref_id, b.persona_id)).fetchone()
            if ref is None:
                raise HTTPException(404, "derivación no encontrada para esa persona")
            if b.resultado not in ("enviada", "recibida", "atendida"):
                raise HTTPException(422, "estado de derivación debe ser enviada, recibida o atendida")
            iid = log(b.persona_id, b.accion, ref["alert_id"], nota or f"Derivación a {ref['destination']}: {b.resultado}.",
                      ref["destination"], b.resultado, ref_id=b.ref_id)
            tras_decision(b.persona_id, ref["alert_id"], b.accion)
            return {"ok": True, "id": iid}
        if b.accion == "ajustar_frecuencia":
            return await frecuencia(b.persona_id, Frecuencia(frecuencia=b.destino or ""), nota)
        targets = [al] if al else c.execute("SELECT * FROM alert WHERE person_id=? AND status!='cerrada'", (b.persona_id,)).fetchall()
        if b.accion == "cerrar":
            if not (b.resultado or "").strip():
                raise HTTPException(422, "falta el resultado del cierre")
            n3 = [t for t in targets if t["level"] == 3 and t["status"] != "cerrada"]
            if n3:
                if not b.transcripcion_revisada:
                    raise HTTPException(422, "para cerrar un caso urgente hay que revisar la transcripción")
                since = min(datetime.fromisoformat(t["created_at"]) for t in n3)
                deriv = any(datetime.fromisoformat(x["created_at"]) >= since or x["alert_id"] in {t["id"] for t in n3}
                            for x in c.execute("SELECT * FROM intervention WHERE person_id=? AND action IN ('derivacion','derivacion_cesfam')",
                                               (b.persona_id,)))
                if not deriv and not nota:
                    raise HTTPException(422, "cerrar un caso urgente requiere una derivación registrada o una justificación")
        link = b.alerta_id if b.alerta_id is not None else (
            max(targets, key=lambda t: (t["level"], t["id"]))["id"] if targets else None)
        iid = log(b.persona_id, b.accion, link, nota, b.destino, b.resultado, b.proxima_revision, b.transcripcion_revisada)
        if b.accion == "cerrar":
            for t in targets:
                c.execute("UPDATE alert SET status='cerrada' WHERE id=?", (t["id"],))
        elif b.accion in ("derivar", "avisar_contacto", "solicitar_llamada_humana"):
            for t in targets:
                c.execute("UPDATE alert SET status='en_revision' WHERE id=? AND status='abierta'", (t["id"],))
        elif b.accion == "pausar":
            c.execute("UPDATE person SET status='pausada' WHERE id=?", (b.persona_id,))
        tras_decision(b.persona_id, link, b.accion)
        return {"ok": True, "id": iid}

    @r.post("/personas/{pid}/asignar")
    async def asignar(pid: int):
        person_or_404(pid)
        c = get_conn()
        c.execute("UPDATE person SET assigned_to=? WHERE id=?", (OPERADOR_ID, pid))
        c.execute("UPDATE alert SET assigned_to=? WHERE person_id=? AND status!='cerrada'", (OPERADOR_ID, pid))
        iid = log(pid, "asignar", nota="Se asignó el caso.")
        tras_decision(pid, None, "asignar")
        return {"ok": True, "id": iid}

    @r.post("/personas/{pid}/frecuencia")
    async def frecuencia(pid: int, b: Frecuencia, nota: str = ""):
        person_or_404(pid)
        if b.frecuencia not in FRECUENCIAS:
            raise HTTPException(422, f"frecuencia debe ser una de {', '.join(FRECUENCIAS)}")
        antes = frecuencia_de(pid)
        get_conn().execute("INSERT INTO contact_plan (person_id, frequency, updated_at) VALUES (?,?,?)"
                           " ON CONFLICT(person_id) DO UPDATE SET frequency=excluded.frequency, updated_at=excluded.updated_at",
                           (pid, b.frecuencia, now()))
        iid = log(pid, "ajustar_frecuencia", nota=f"Frecuencia de llamadas automáticas: {antes} -> {b.frecuencia}. {nota}".strip(),
                  destino=b.frecuencia)
        tras_decision(pid, None, "ajustar_frecuencia")
        return {"ok": True, "id": iid, "frecuencia": b.frecuencia}

    # ---- demo + eventos
    @r.post("/demo/reset")
    async def demo_reset():
        n = reset_demo()
        bus.emit("demo_reiniciada", {})
        return {"ok": True, "conversaciones": n}

    @r.get("/eventos")
    async def eventos():
        async def gen():
            q: asyncio.Queue = asyncio.Queue()
            bus.subs.append(q)
            try:
                yield ": conectado\n\n"
                while True:
                    try:
                        ev, data = await asyncio.wait_for(q.get(), timeout=15)
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
                        continue
                    yield _sse(ev, data)
            finally:
                bus.subs.remove(q)

        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    return r
