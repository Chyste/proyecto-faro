# Feature: rules-engine

**Objective:** Compute attention levels 0-3 per conversation from observations (contract §5), with urgent route first, and a step-by-step simulation CLI.
**Scope:** `src/checkin/` (urgent detector, replay loader, rules engine, pipeline, simulation CLI), tests. Out of scope: LLM extraction (replay mode uses annotated values), CUSUM, dashboard.
**TDD:** strict, `uv run pytest`. **Delivery:** commit directly to main.

## Tasks
- [x] T1 Urgent keyword detector (no LLM) -> source='regla' observations + level-3 alert — delegated
- [x] T2 Replay loader: scenario_expectation -> observations (source='reproduccion') — delegated
- [x] T3 Rules engine: per-dimension levels, 3-of-5 window, overall level, NULL = sin evaluar; writes assessment + alerts + alert_evidence — delegated
- [x] T4 Simulation CLI printing tables per step + accuracy vs expectations — delegated
- [x] T5 Commit + push

## Acceptance
- Engine level matches expected_level on all 70 conversations (or each mismatch explained).
- Teresa day 11 urgent alert created by detector before any extraction.
- Failed/no-response calls produce no health observations and a situacion_contacto alert.

## Progress / Evidence
- RED: collection error ModuleNotFoundError src.checkin.urgent (writer).
- GREEN: `uv run pytest -q` -> 90 passed (parent re-run).
- `uv run python -m src.checkin --reset` -> 70/70 levels match expectations; diagonal confusion matrix.
- Teresa day 11: urgent route fires before replay (R3_AYUDA_INMEDIATA, R3_CAIDA_LESION, source='regla').
- Writer decision: strong signals carry over within the 5-day window; mild ones only count toward 3-of-5 (documented in rules.py).
- Known follow-ups: bandeja keeps lower open alerts after escalation (human closes); lesion quote picks fall sentence; live call should stop the script on an urgent hit.

## Next step
LLM extraction (live mode) compared against scenario_expectation; dashboard.
