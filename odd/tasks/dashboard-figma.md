# Feature: dashboard-figma

**Objective:** Implement "Hoy" and "Ficha de persona" screens from Figma file e7b2mDFcshCl46RjHyYkqh (frames 4:34, 5:34) in `dashboard/` (React), fed by real engine output via a static JSON export.
**Scope:** `src/export_dashboard.py` (+test), `dashboard/src/data/faroData.json`, new tokens/components/pages; route `/` and `/personas/:id`. Out of scope: alert screen, live API.
**Deadline:** prototype freeze 14:45. **Delivery:** commit directly to main.

## Tasks
- [x] T1 Export script engine -> JSON (TDD) — delegated
- [x] T2 Tokens + level badge + Hoy page — delegated
- [x] T3 Ficha page — delegated
- [x] T4 Build passes; commit + push

## Progress / Evidence
- Writer: Hoy + Ficha rewritten from Figma frames 4:34/5:34 using teammate data (syntheticData.ts); `npm run build` passed; dev server served 200.
- Parent fix: severity->level mapping capped at 2 (red reserved for urgent route); build re-run passed.
- Not visually compared in a browser (Playwright browser not installed). Known gaps: no next-contact time/rule ids in dashboard data; Derivar/Cerrar buttons inert.
