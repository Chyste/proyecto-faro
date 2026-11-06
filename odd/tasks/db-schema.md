# Feature: db-schema

**Objective:** SQLite operational database for FARO MVP: analyze check-in chats, extract indicators, raise level 0-3 alerts.
**Why:** Core of capa C demo; aligns with docs/ETAPA_3_DISENO.md §10 (MVP subset).
**Scope:** `src/db/` (schema.sql, connection/init, catalog seed, synthetic seed), tests. Out of scope: LLM extraction, CUSUM engine, UI.
**Constraints:** synthetic data only; identity separated from analytics; level 3 detectable without LLM (source='regla').
**TDD:** strict, runner `uv run pytest` (source: user global CLAUDE.md "Strict TDD Mode: enabled").
**Delivery:** single-pr, branch `feat/db-schema`. Forecast ~400-600 lines (mostly SQL + seed data).

## Tasks
- [x] T1 Schema + init_db + catalog seed (5 dimensions, indicators with urgent flags) — route: delegated (writer trigger: 2+ non-trivial files)
- [x] T2 Synthetic seed: 5 persons, staff, consents, ~14 days of conversations/messages per person (1 gradual deterioration, 1 urgent event, 1 no-response streak) — route: delegated
- [x] T3 Commit on feature branch

## Acceptance
- `init_db` creates all tables idempotently; FK + CHECK constraints enforced.
- Catalog: 5 dimensions; every indicator maps to a dimension; seguridad indicators flagged urgent.
- Seed produces 5 persons; `person_current_level` view works; messages linked to conversations; no real personal data.
- Tests pass with `uv run pytest`.

## Progress / Evidence
- RED: first pytest run failed at collection (ModuleNotFoundError src.db.catalog).
- GREEN: `uv run pytest -q` -> 23 passed (writer + parent spot check).
- CLI: `uv run python -m src.db --db data/processed/faro.db --reset` -> 5 persons, 70 conversations, 598 messages, 17 indicators; pipeline tables empty by design.
- Parent spot check: Carmen day 12 fall messages and Rosa late-days missed meds present.
- Commit: 5ce5ccf (feat/db-schema).
- Review: assessed medium (slice_budget_reached); user declined this candidate. Off-path: writer self-verification + parent spot check (pytest 23 passed).

## Next step
Pipeline: urgent rules (level 3, no LLM) -> LLM extraction -> observations -> CUSUM -> alerts.
