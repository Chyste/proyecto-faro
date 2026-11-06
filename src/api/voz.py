"""Voice proxies for the live call (Fish Audio TTS/STT). The key stays server-side; it is read at request time
from the environment / .env (python-dotenv) so adding it while the API runs works, and a missing key degrades
gracefully (503 -> the browser falls back to speechSynthesis / Web Speech).

Env: FISH_API_KEY (required for voice), FISH_VOICE_ID (optional reference_id; without it Fish picks its default voice).
"""
from __future__ import annotations

import os

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field

FISH_BASE = "https://api.fish.audio"
TTS_MODEL = "drama-3"
STT_MODEL = "transcribe-1-pro"
DIRECTION = "[tono cálido, pausado y cercano] "
MAX_AUDIO = 10 * 1024 * 1024


class TtsBody(BaseModel):
    texto: str = Field(min_length=1, max_length=1000)


def _key() -> str | None:
    load_dotenv()
    return os.environ.get("FISH_API_KEY") or None


def build_router() -> APIRouter:
    r = APIRouter(prefix="/api/voz")

    def client(request: Request) -> httpx.Client:
        return httpx.Client(base_url=FISH_BASE, timeout=30, transport=getattr(request.app.state, "fish_transport", None))

    def need_key() -> str:
        k = _key()
        if not k:
            raise HTTPException(503, "Voz no configurada (falta FISH_API_KEY en el servidor)")
        return k

    @r.get("/estado")
    def estado():
        ok = _key() is not None
        return {"tts": ok, "stt": ok}

    @r.post("/tts")
    def tts(body: TtsBody, request: Request):
        key = need_key()
        payload = {"text": DIRECTION + body.texto.strip(), "format": "mp3"}
        if os.environ.get("FISH_VOICE_ID"):
            payload["reference_id"] = os.environ["FISH_VOICE_ID"]
        try:
            with client(request) as c:
                up = c.post("/v1/tts", json=payload, headers={"Authorization": f"Bearer {key}", "model": TTS_MODEL})
        except httpx.HTTPError:
            raise HTTPException(502, "No se pudo contactar el servicio de voz") from None
        if up.status_code != 200:
            raise HTTPException(502, f"El servicio de voz respondió {up.status_code}")
        return Response(up.content, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})

    @r.post("/stt")
    async def stt(request: Request, audio: UploadFile = File(...)):
        key = need_key()
        data = await audio.read()
        if not data or len(data) > MAX_AUDIO:
            raise HTTPException(422, "audio vacío o demasiado grande")
        files = {"audio": (audio.filename or "audio.webm", data, audio.content_type or "audio/webm")}
        form = {"language": "es", "diarize": "false", "tag_audio_events": "false"}
        try:
            async with httpx.AsyncClient(base_url=FISH_BASE, timeout=60,
                                         transport=getattr(request.app.state, "fish_transport", None)) as c:
                up = await c.post("/v1/asr", files=files, data=form,
                                  headers={"Authorization": f"Bearer {key}", "model": STT_MODEL})
        except httpx.HTTPError:
            raise HTTPException(502, "No se pudo contactar el servicio de voz") from None
        if up.status_code != 200:
            raise HTTPException(502, f"El servicio de voz respondió {up.status_code}")
        return {"texto": (up.json().get("text") or "").strip()}

    return r
