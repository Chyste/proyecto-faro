# Feature: db-contract-alignment

**Objective:** Align the SQLite DB with the MVP contract (`docs/MVP_PARAMETROS_Y_SIMULACION.md`) so pipeline and dashboard share one source of truth.
**Why:** Implemented catalog (score_0_2, 17 indicators, Rosa/Luis/Carmen/Jorge/Elena) diverges from the contract (categorical fields, Rosa/Carlos/Elena/Miguel/Teresa); no way to represent "sin evaluación".
**Scope:** `src/db/` schema, catalog, synthetic seed, tests; `docs/BASE_DE_DATOS.md` divergence notes. Out of scope: extraction, rules engine, dashboard.
**TDD:** strict, `uv run pytest`. **Delivery:** commit directly to main (user preference).

## Tasks
- [x] T1 Schema: categorical value types + allowed values, null reasons, `fallo_tecnico`, scripted urgent event, person profile fields, `person_medication`, `assessment` table, `scenario_expectation`, revised current-level view — route: delegated (writer trigger)
- [x] T2 Catalog: 16 contract fields across 5 dimensions — delegated
- [x] T3 Synthetic seed: 5 contract scenarios × 14 days + expected annotations — delegated
- [x] T4 Update BASE_DE_DATOS.md; commit + push

## Acceptance
- Catalog codes/values match contract §4 exactly; conversation statuses match §4 metadata.
- Current level is NULL ("sin evaluación") when no assessment and no open alert.
- Each scenario reproduces its contract story; expected levels annotated per conversation cover levels 0,1,2,3 and sin evaluar.
- `uv run pytest -q` green.

## Progress / Evidence
- RED: 39 failed, 8 passed after rewriting tests (writer).
- GREEN: `uv run pytest -q` -> 47 passed (parent re-run after fix).
- Rebuild: 16 indicators, 70 conversations, 1573 messages, 754 expectation rows.
- Parent fix: Rosa days 13-14 expected level corrected 1/0 -> 2/2 to follow the 3-of-5 persistence rule (writer had annotated by narrative).
- Expected levels: 0, 1, 2, 3 and NULL (sin evaluar) all present.

## Next step
Rules engine (levels 0-3 from observations, 3-of-5 window, urgent route first) + urgent keyword detector + extraction.
