# Feature: adaptive-dialogue

**Objective:** Check-in conversation adapts to answers: approved question tree, Jev classifies each answer turn-by-turn, follow-ups on signals, urgent hit stops the script and triggers the protocol. Interactive CLI for live demo.
**Why:** Fixed scripts keep asking after "me caí y no me puedo parar"; contract/ETAPA_3 require approved instructions (no generative LLM).
**Scope:** `src/checkin/dialogue.py` (tree + engine), `src/checkin/interactive.py` (CLI chat), persistence into conversation/message + existing pipeline, tests. Out of scope: dashboard, real telephony/voice.
**TDD:** strict, `uv run pytest`. **Delivery:** commit directly to main.

## Tasks
- [x] T1 Question tree data (approved Spanish questions, follow-up edges by answer class) — delegated
- [x] T2 Dialogue engine: next question from state; per-turn classifier interface (Jev + offline fake); urgent stop; clarification once on low confidence; max duration — delegated
- [x] T3 Interactive CLI `python -m src.checkin.interactive --person Rosa [--offline]`, saves conversation and runs pipeline at end (or immediately on urgent) — delegated
- [x] T4 Commit + push

## Progress / Evidence
- RED->GREEN (writer): new dialogue tests first; `uv run pytest -q` -> 148 passed (parent re-run).
- Offline Rosa: follow-ups apoyo_disponible and barrera_tratamiento fired; level 2.
- Offline Teresa: fall + injury stops the script with protocol message; level-3 alert R3_CAIDA_LESION created before close.
- Live Jev Rosa: 11 questions, confidences 0.81-1.00, 210-412 ms per turn.
- Known gap (parent): a fall mentioned out of turn ("me caí" while asked about autonomy) does not jump to the fall/injury follow-up; untested path: Jev-only urgent signal jump.
