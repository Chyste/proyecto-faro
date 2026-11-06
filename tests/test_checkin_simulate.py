from src.checkin.simulate import render_table, run_simulation
from tests.checkin_helpers import build_db


def test_render_table_aligns_columns():
    out = render_table(["A", "Bee"], [["x", 1], ["yyy", 22]])
    lines = out.splitlines()
    assert len({len(l.rstrip()) for l in lines[:1]}) == 1 and "Bee" in lines[0] and "yyy" in out


def test_full_run_reports_accuracy_confusion_and_bandeja():
    text = run_simulation(build_db())
    assert "70/70" in text and "Matriz de confusión" in text and "Bandeja OAM" in text and "Teresa" in text


def test_single_day_trace_has_all_steps():
    text = run_simulation(build_db(), person="Teresa", day=11)
    for h in ("1) Conversación", "2) Ruta urgente", "3) Observaciones registradas", "4) Evaluación por dimensión",
              "5) Nivel general", "6) Alertas", "7) Esperado vs obtenido"):
        assert h in text
    assert "necesito ayuda ahora" in text.lower()
