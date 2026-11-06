"""Approved question tree for the adaptive check-in call (immutable data, no generated text).

Every assistant utterance is a pre-approved Spanish string defined here. Edges are keyed by *answer class*:
category -> its value; bool -> 'si'/'no'; list -> 'lista' (some item) / 'vacia'. Any other outcome
(unconfirmed, no_sabe, prefiere_no_responder, ...) follows ``default_next``.

Documented decisions:
* ``condition`` names a rule the engine evaluates before asking (the node is skipped when false):
  ``tiene_tratamiento`` (person.tiene_tratamiento != 'no'; otherwise adherencia is recorded as no_aplica
  without asking) and ``confusion_cadence`` (asked on odd/even alternating days, or whenever animo is 'mal').
* ``dificultad_puntual_reportada`` is asked only when ``cambio_autonomia`` stays unconfirmed (default edge);
  'empeora' goes to ``actividad_afectada`` instead.
* ``necesita_ayuda_inmediata`` closes every health script exactly once.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Node:
    id: str
    prompt: str
    kind: str  # category | bool | list | confirm | close
    indicator_code: str | None = None
    alt_prompt: str | None = None
    branches: tuple[tuple[str, str], ...] = ()
    default_next: str | None = None
    condition: str | None = None

    def next_for(self, answer_class: str | None) -> str | None:
        return dict(self.branches).get(answer_class, self.default_next) if answer_class else self.default_next


@dataclass(frozen=True)
class Tree:
    nodes: tuple[Node, ...]
    start: str = "intro"

    def node(self, node_id: str) -> Node:
        for n in self.nodes:
            if n.id == node_id:
                return n
        raise KeyError(node_id)

    def all_utterances(self) -> tuple[str, ...]:
        return tuple(t for n in self.nodes for t in (n.prompt, n.alt_prompt) if t)


def _q(code: str, kind: str, prompt: str, alt: str, branches=(), nxt=None, cond=None) -> Node:
    return Node(code, prompt, kind, code, alt, tuple(branches), nxt, cond)


NODES: tuple[Node, ...] = (
    Node("intro", "Buenos días, {nombre}. Le habla el asistente automático del programa de acompañamiento. "
                  "¿Hablo con {nombre}?", "confirm",
         alt_prompt="Disculpe, ¿hablo con {nombre}?", default_next="permiso"),
    Node("permiso", "¿Le acomoda conversar un par de minutos?", "confirm",
         alt_prompt="Si le parece bien, serían solo un par de minutos. ¿Podemos conversar ahora?",
         default_next="soledad_percibida"),
    _q("soledad_percibida", "category", "En el último tiempo, ¿ha sentido soledad?",
       "Dicho de otra forma: ¿ha sentido soledad nunca, a veces o con frecuencia?",
       [("a_veces", "apoyo_disponible"), ("frecuente", "apoyo_disponible")], "contacto_social_24h"),
    _q("apoyo_disponible", "bool", "¿Tiene a alguien con quien conversar si lo necesita?",
       "¿Cuenta con alguna persona a quien pueda recurrir si necesita ayuda?", nxt="contacto_social_24h"),
    _q("contacto_social_24h", "bool", "¿Ha conversado hoy o ayer con algún familiar, vecino o amistad?",
       "¿Ha podido hablar con alguien en las últimas horas, por teléfono o en persona?",
       [("no", "menor_contacto_habitual")], "cambio_autonomia"),
    _q("menor_contacto_habitual", "bool", "¿Ha tenido menos contacto con otras personas que lo habitual para usted?",
       "¿Diría que ha conversado con menos gente de la que acostumbra?", nxt="cambio_autonomia"),
    _q("cambio_autonomia", "category",
       "¿Cómo le ha ido con sus actividades de todos los días, como caminar, asearse o cocinar: igual que siempre, "
       "mejor o con más dificultad?",
       "¿Le cuesta hoy más que antes hacer sus cosas de todos los días, o está igual o mejor?",
       [("empeora", "actividad_afectada"), ("sin_cambio", "adherencia_reportada"), ("mejora", "adherencia_reportada")],
       "dificultad_puntual_reportada"),
    _q("dificultad_puntual_reportada", "bool", "¿Hubo alguna actividad en la que haya tenido dificultad en estos días?",
       "¿Hay algo que haya querido hacer estos días y le haya costado?", nxt="adherencia_reportada"),
    _q("actividad_afectada", "list", "¿En cuáles de esas actividades le ha costado más?",
       "¿Puede contarme qué actividad le resulta más difícil, por ejemplo caminar, asearse o preparar comida?",
       nxt="adherencia_reportada"),
    _q("adherencia_reportada", "category", "¿Pudo tomar sus remedios como se los indicaron?",
       "¿Tomó hoy y ayer todos sus remedios, solo algunos o ninguno?",
       [("parcial", "barrera_tratamiento"), ("ninguna", "barrera_tratamiento")], "animo_reportado",
       "tiene_tratamiento"),
    _q("barrera_tratamiento", "list", "¿Qué le ha dificultado tomarlos: se le olvidan, no los ha podido conseguir o le caen mal?",
       "¿Me puede contar el motivo por el que no los tomó?", nxt="animo_reportado"),
    _q("animo_reportado", "category", "¿Cómo se ha sentido de ánimo estos días: bien, más o menos o mal?",
       "¿Diría que su ánimo ha estado bien, regular o mal?",
       [("regular", "tristeza_reportada"), ("mal", "tristeza_reportada")], "confusion_nueva_reportada"),
    _q("tristeza_reportada", "category", "¿Ha sentido tristeza: nunca, de vez en cuando o casi todo el tiempo?",
       "¿Con qué frecuencia ha sentido tristeza: nunca, a veces o casi siempre?", nxt="confusion_nueva_reportada"),
    _q("confusion_nueva_reportada", "bool", "¿Ha notado alguna confusión nueva, como no recordar dónde está o qué día es?",
       "¿Ha sentido algo distinto en su memoria o en su orientación en estos días?", nxt="caida_reportada",
       cond="confusion_cadence"),
    _q("caida_reportada", "bool", "¿Se ha caído en estos días?",
       "¿Ha tenido alguna caída desde la última vez que conversamos?",
       [("si", "lesion_reportada")], "necesita_ayuda_inmediata"),
    _q("lesion_reportada", "bool", "¿Se lastimó o le duele algo a raíz de esa caída?",
       "¿Quedó con algún golpe o dolor después de caerse?", nxt="necesita_ayuda_inmediata"),
    _q("necesita_ayuda_inmediata", "bool", "Antes de despedirnos, ¿necesita ayuda en este momento?",
       "¿Hay algo en lo que necesite ayuda ahora mismo?", nxt="cierre_normal"),
    Node("cierre_normal", "Muchas gracias por conversar conmigo, {nombre}. Volveremos a llamar mañana para saber cómo "
                          "sigue. Si en algún momento desea hablar con una persona del equipo, solo dígalo. "
                          "Que tenga un buen día.", "close"),
    Node("cierre_no_confirmado", "Disculpe la molestia. Que tenga un buen día.", "close"),
    Node("cierre_rechazo", "Entiendo, no hay problema. Muchas gracias por su tiempo. "
                           "Volveremos a llamar otro día; si prefiere hablar con una persona del equipo, solo dígalo. "
                           "Que tenga un buen día.", "close"),
    Node("cierre_humano", "Con mucho gusto. Pediré que una persona del equipo se comunique con usted. "
                          "Muchas gracias por su tiempo, {nombre}.", "close"),
    Node("protocolo_urgente", "Entiendo. Voy a avisar ahora mismo al equipo para que se comuniquen con usted. "
                              "Si está en peligro, llame al 131 (SAMU). ¿Hay alguien con usted?", "confirm"),
    Node("cierre_urgente", "Gracias. El equipo se comunicará con usted lo antes posible. "
                           "Si empeora o está en peligro, llame al 131 (SAMU). Cuídese mucho.", "close"),
)

TREE = Tree(NODES)
