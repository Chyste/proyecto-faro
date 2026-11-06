#!/usr/bin/env bash
# Rebuild data/processed/faro.db and process the 70 synthetic conversations so assessments and alerts exist.
# Usage: scripts/seed_demo.sh [--jev]   (default: replay mode, offline and fast; --jev uses TypeSafe/Jev, needs the JEV key in .env)
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="reproduccion"
[[ "${1:-}" == "--jev" ]] && MODE="jev"
DB="data/processed/faro.db"
uv run python -m src.db --db "$DB" --reset
uv run python -m src.checkin --db "$DB" --mode "$MODE" >/dev/null
sqlite3 "$DB" "SELECT 'conversaciones', COUNT(*) FROM conversation UNION ALL SELECT 'evaluaciones', COUNT(*) FROM assessment UNION ALL SELECT 'alertas', COUNT(*) FROM alert" 2>/dev/null || true
echo "Listo: $DB ($MODE)"
