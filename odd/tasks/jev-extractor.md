# Feature: jev-extractor

**Objective:** Live extraction of the 16 contract indicators from check-in conversations using TypeSafe Jev (System One decision model), compared against scenario_expectation.
**Why:** Replay mode proves the rules; this proves the AI step. Jev returns typed choices/probabilities with confidence (no free text), matching "la IA asiste, no decide".
**Scope:** `src/checkin/extractor_jev.py`, pipeline `mode='jev'` with fallback to replay, CLI `--mode jev`, evaluation report, tests (HTTP mocked) + one live smoke run. Key in `.env` (`TYPESAFE_API_KEY`, never printed/logged).
**TDD:** strict, `uv run pytest`. **Delivery:** commit directly to main.

## Tasks
- [x] T1 Jev client (HTTP, timeout, errors) + request builder from catalog (Choice/Noul, only asked fields) — delegated
- [x] T2 Response mapping: thresholds, confidence -> pendiente_confirmar, null-reason options, quote from persona message — delegated
- [x] T3 Pipeline mode jev + fallback + Jev urgent safety-net Noul (parallel to regex, never replaces it) — delegated
- [x] T4 Evaluation: per-field accuracy, level accuracy, false/missed reds; live run report — delegated
- [x] T5 Commit + push

## Progress / Evidence
- RED: new extractor/evaluate tests failed on import (writer); rules fix test failed before change (parent).
- GREEN: `uv run pytest -q` -> 124 passed.
- Live Jev full run (70 conv, 67 with Jev, 0 fallbacks): fields 660/666 correct, 6 to human review, 0 incorrect; levels 67/67; 0 false reds, 0 missed reds; 287,748 tokens; 341 ms avg.
- Parent fix: level 0 now requires informed answers in >=2 dimensions (teammate added partial call Elena day 9 expected sin evaluar).
- Key read from `.env` var `JEV` (also accepts TYPESAFE_API_KEY); `.env` added to repo .gitignore.
