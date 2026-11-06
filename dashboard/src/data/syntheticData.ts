// ─────────────────────────────────────────────────────────────
// Generated directly from data/synthetic/ (FARO MVP Synthetic Dataset)
// 5 personas ficticias × 14 días = 70 intentos de check-in telefónico
// ─────────────────────────────────────────────────────────────

import type {
  Persona,
  Alerta,
  DatosComunal,
  DatosEvolucionMensual,
  DatosDominio,
} from './types';

export const syntheticPersonas: Persona[] = [
  {
    "id": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "region": "Metropolitana de Santiago",
    "comuna": "San Joaquín",
    "telefono": "+56 9 0000 0001",
    "fechaRegistro": "2026-10-22",
    "fechaUltimoControl": "2026-11-05",
    "nivel": "prioritario",
    "senales": [
      {
        "dominio": "aislamiento",
        "descripcion": "Soledad percibida: Sí, me siento muy sola estos días.",
        "fecha": "2026-11-02",
        "severidad": "alta"
      },
      {
        "dominio": "aislamiento",
        "descripcion": "Contacto social 24h: No, ayer no conversé con nadie.",
        "fecha": "2026-11-02",
        "severidad": "media"
      },
      {
        "dominio": "aislamiento",
        "descripcion": "Soledad percibida: A veces me da pena estar sola.",
        "fecha": "2026-11-03",
        "severidad": "media"
      },
      {
        "dominio": "medicacion",
        "descripcion": "Adherencia reportada: Pude tomar solo algunos; me faltan los que no he podido retirar.",
        "fecha": "2026-11-03",
        "severidad": "media"
      },
      {
        "dominio": "aislamiento",
        "descripcion": "Soledad percibida: De repente sí, a ratos me siento sola.",
        "fecha": "2026-11-04",
        "severidad": "media"
      }
    ],
    "historialControles": [
      {
        "id": "c-1",
        "fecha": "2026-10-23",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-2",
        "fecha": "2026-10-24",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-3",
        "fecha": "2026-10-25",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-4",
        "fecha": "2026-10-26",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Prefiere no responder sobre su ánimo; no se interpreta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-5",
        "fecha": "2026-10-27",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-6",
        "fecha": "2026-10-28",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-7",
        "fecha": "2026-10-29",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Primera semana estable.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-8",
        "fecha": "2026-10-30",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Solo aislamiento: menor contacto y soledad a veces.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "A veces me da pena estar sola.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "No, ayer no conversé con nadie.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "Sí, estos días me llaman menos.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-9",
        "fecha": "2026-10-31",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Señales en aislamiento y tratamiento: dos dimensiones.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "De repente sí, a ratos me siento sola.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "No, no ha venido nadie.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "Sí, hablo bastante menos que antes.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-10",
        "fecha": "2026-11-01",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Señales en aislamiento y tratamiento: dos dimensiones.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "A veces me da pena estar sola.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "No, no he hablado con nadie.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "Sí, estos días me llaman menos.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-11",
        "fecha": "2026-11-02",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Empeora: soledad frecuente y sin tratamiento por falta de acceso.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "Sí, me siento muy sola estos días.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "No, ayer no conversé con nadie.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "Sí, hablo bastante menos que antes.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-12",
        "fecha": "2026-11-03",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Aún hay señales. La acción del equipo se registra en vivo durante la demo.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "A veces me da pena estar sola.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "Sí, estos días me llaman menos.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-13",
        "fecha": "2026-11-04",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Mejora tras la acción, pero la soledad persiste en 3 de las últimas 5 llamadas: sigue en nivel 2.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "De repente sí, a ratos me siento sola.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "No, mantengo el contacto de costumbre.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          }
        ]
      },
      {
        "id": "c-14",
        "fecha": "2026-11-05",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin señales hoy; la ventana de 5 días aún contiene aislamiento persistente: nivel 2 hasta que se limpie.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha tenido menos contacto con la gente que de costumbre?",
            "respuesta": "No, igual que siempre.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          }
        ]
      }
    ],
    "historialAcciones": [
      {
        "id": "act-101",
        "fecha": "2026-11-04",
        "tipo": "Derivación OAM Territorial",
        "descripcion": "Aviso a monitor comunitario por persistencia de soledad y barrera en retiro de fármacos crónicos (Losartán y Metformina).",
        "profesional": "Camila Rojas",
        "estado": "en_progreso"
      },
      {
        "id": "act-102",
        "fecha": "2026-11-05",
        "tipo": "Coordinación CESFAM",
        "descripcion": "Gestión con farmacia comunal para entrega domiciliaria de medicamentos.",
        "profesional": "Dr. Pablo Díaz",
        "estado": "completada"
      }
    ],
    "profesionalAsignado": "Camila Rojas (Monitor Oam)",
    "estadoRevision": "en_revision",
    "contactoEmergencia": "Marta Soto (hija) - +56 9 0000 0011",
    "observaciones": "Camina sola por el barrio, cocina y se asea sin ayuda. Hija Marta la llama a diario; una vecina la visita a veces.",
    "direccion": "Calle Ficticia 100, San Joaquín",
    "autonomia_base": "Camina sola por el barrio, cocina y se asea sin ayuda.",
    "red_apoyo_base": "Hija Marta la llama a diario; una vecina la visita a veces.",
    "intereses": [
      "jardín",
      "radio",
      "tejido"
    ],
    "medicamentos": [
      {
        "name": "Losartán 50 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      },
      {
        "name": "Metformina 850 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      }
    ],
    "scenario_id": "escenario_rosa"
  },
  {
    "id": "p-2",
    "nombre": "Carlos",
    "apellido": "Pérez",
    "edad": 74,
    "region": "Metropolitana de Santiago",
    "comuna": "San Joaquín",
    "telefono": "+56 9 0000 0002",
    "fechaRegistro": "2026-10-22",
    "fechaUltimoControl": "2026-11-05",
    "nivel": "estable",
    "senales": [],
    "historialControles": [
      {
        "id": "c-15",
        "fecha": "2026-10-23",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-16",
        "fecha": "2026-10-24",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-17",
        "fecha": "2026-10-25",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-18",
        "fecha": "2026-10-26",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-19",
        "fecha": "2026-10-27",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-20",
        "fecha": "2026-10-28",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-21",
        "fecha": "2026-10-29",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-22",
        "fecha": "2026-10-30",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-23",
        "fecha": "2026-10-31",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-24",
        "fecha": "2026-11-01",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-25",
        "fecha": "2026-11-02",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-26",
        "fecha": "2026-11-03",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-27",
        "fecha": "2026-11-04",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-28",
        "fecha": "2026-11-05",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Vive solo, se siente acompañado y mantiene actividades: vivir solo no penaliza.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      }
    ],
    "historialAcciones": [],
    "profesionalAsignado": "Camila Rojas (Monitor Oam)",
    "estadoRevision": "revisado",
    "contactoEmergencia": "Andrés Pérez (hijo) - +56 9 0000 0012",
    "observaciones": "Independiente: sale a comprar, cocina y camina a diario. Hijo Andrés lo visita los fines de semana; participa en un club de adulto mayor.",
    "direccion": "Calle Ficticia 101, San Joaquín",
    "autonomia_base": "Independiente: sale a comprar, cocina y camina a diario.",
    "red_apoyo_base": "Hijo Andrés lo visita los fines de semana; participa en un club de adulto mayor.",
    "intereses": [
      "fútbol",
      "ajedrez",
      "noticias"
    ],
    "medicamentos": [
      {
        "name": "Enalapril 10 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      }
    ],
    "scenario_id": "escenario_carlos"
  },
  {
    "id": "p-3",
    "nombre": "Elena",
    "apellido": "Lagos",
    "edad": 81,
    "region": "Metropolitana de Santiago",
    "comuna": "San Joaquín",
    "telefono": "+56 9 0000 0003",
    "fechaRegistro": "2026-10-22",
    "fechaUltimoControl": "2026-11-05",
    "nivel": "estable",
    "senales": [
      {
        "dominio": "emocional_cognitiva",
        "descripcion": "Animo reportado: Más o menos, con poco ánimo.",
        "fecha": "2026-10-28",
        "severidad": "media"
      }
    ],
    "historialControles": [
      {
        "id": "c-29",
        "fecha": "2026-10-23",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-30",
        "fecha": "2026-10-24",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-31",
        "fecha": "2026-10-25",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-32",
        "fecha": "2026-10-26",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-33",
        "fecha": "2026-10-27",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-34",
        "fecha": "2026-10-28",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Tristeza ocasional y ánimo regular ese día; apoyo y autonomía conservados.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-35",
        "fecha": "2026-10-29",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-36",
        "fecha": "2026-10-30",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-37",
        "fecha": "2026-10-31",
        "tipo": "telefonica",
        "duracion": 7,
        "resumen": "Llamada interrumpida; no comprendió la pregunta de ánimo. Información insuficiente para evaluar.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Cómo ha estado de ánimo hoy?",
            "respuesta": "Perdone, no le entendí bien la pregunta.",
            "dominio": "emocional_cognitiva"
          },
          {
            "pregunta": "¿Necesita ayuda inmediata en este momento?",
            "respuesta": "No, ahora no, gracias.",
            "dominio": "seguridad"
          }
        ]
      },
      {
        "id": "c-38",
        "fecha": "2026-11-01",
        "tipo": "telefonica",
        "duracion": 5,
        "resumen": "Prefiere no conversar hoy; no se inventan indicadores ni nivel.",
        "nivelResultante": "estable",
        "respuestas": []
      },
      {
        "id": "c-39",
        "fecha": "2026-11-02",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-40",
        "fecha": "2026-11-03",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-41",
        "fecha": "2026-11-04",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-42",
        "fecha": "2026-11-05",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Sin tratamiento: adherencia no aplica, no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      }
    ],
    "historialAcciones": [
      {
        "id": "act-301",
        "fecha": "2026-11-01",
        "tipo": "Reintento de Contacto",
        "descripcion": "Seguimiento presencial por monitor territorial tras llamadas con dificultades técnicas.",
        "profesional": "Camila Rojas",
        "estado": "completada"
      }
    ],
    "profesionalAsignado": "Camila Rojas (Monitor Oam)",
    "estadoRevision": "revisado",
    "contactoEmergencia": "Rodrigo Lagos (sobrino) - +56 9 0000 0013",
    "observaciones": "Se maneja sola en casa; usa bastón en la calle. Sobrino Rodrigo y su vecina Julia la acompañan seguido.",
    "direccion": "Calle Ficticia 102, San Joaquín",
    "autonomia_base": "Se maneja sola en casa; usa bastón en la calle.",
    "red_apoyo_base": "Sobrino Rodrigo y su vecina Julia la acompañan seguido.",
    "intereses": [
      "novelas",
      "cocina",
      "música"
    ],
    "medicamentos": [],
    "scenario_id": "escenario_elena"
  },
  {
    "id": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "region": "Metropolitana de Santiago",
    "comuna": "San Joaquín",
    "telefono": "+56 9 0000 0004",
    "fechaRegistro": "2026-10-22",
    "fechaUltimoControl": "2026-11-05",
    "nivel": "estable",
    "senales": [
      {
        "dominio": "emocional_cognitiva",
        "descripcion": "Confusion nueva reportada: Sí, ayer me confundí y no supe dónde había dejado las llaves.",
        "fecha": "2026-10-27",
        "severidad": "alta"
      },
      {
        "dominio": "emocional_cognitiva",
        "descripcion": "Confusion nueva reportada: Sí, ayer me confundí y no supe dónde había dejado las llaves.",
        "fecha": "2026-10-29",
        "severidad": "alta"
      },
      {
        "dominio": "emocional_cognitiva",
        "descripcion": "Confusion nueva reportada: Sí, sentí confusión y no entendía bien lo que pasaba.",
        "fecha": "2026-10-30",
        "severidad": "alta"
      }
    ],
    "historialControles": [
      {
        "id": "c-43",
        "fecha": "2026-10-23",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-44",
        "fecha": "2026-10-24",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-45",
        "fecha": "2026-10-25",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-46",
        "fecha": "2026-10-26",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-47",
        "fecha": "2026-10-27",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Señal aislada en una sola dimensión.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-48",
        "fecha": "2026-10-28",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Señal aislada en una sola dimensión.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-49",
        "fecha": "2026-10-29",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Señal aislada en una sola dimensión.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-50",
        "fecha": "2026-10-30",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Tercera confusión reportada en los últimos 5 días: persistencia, nivel 2.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-51",
        "fecha": "2026-10-31",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Persiste la señal en la ventana de 5 días.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-52",
        "fecha": "2026-11-01",
        "tipo": "telefonica",
        "duracion": 4,
        "resumen": "Fallo técnico: sin respuestas ni indicadores; la señal previa sigue conocida.",
        "nivelResultante": "estable",
        "respuestas": []
      },
      {
        "id": "c-53",
        "fecha": "2026-11-02",
        "tipo": "telefonica",
        "duracion": 4,
        "resumen": "Sin respuesta: se refleja en la bandeja operativa, no como indicador.",
        "nivelResultante": "estable",
        "respuestas": []
      },
      {
        "id": "c-54",
        "fecha": "2026-11-03",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "La señal previa sigue dentro de la ventana; hoy sin confusión.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-55",
        "fecha": "2026-11-04",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Nada ha cambiado, hago mis cosas como siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-56",
        "fecha": "2026-11-05",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      }
    ],
    "historialAcciones": [
      {
        "id": "act-401",
        "fecha": "2026-10-31",
        "tipo": "Interconsulta Preventiva",
        "descripcion": "Revisión médica por episodios de desorientación matinal reportados en tres llamadas consecutivas.",
        "profesional": "Dr. Pablo Díaz",
        "estado": "completada"
      }
    ],
    "profesionalAsignado": "Camila Rojas (Monitor Oam)",
    "estadoRevision": "revisado",
    "contactoEmergencia": "Ana Mora (esposa) - +56 9 0000 0014",
    "observaciones": "Autónomo; su esposa lo acompaña en los trámites. Vive con su esposa Ana; su hija lo llama los domingos.",
    "direccion": "Calle Ficticia 103, San Joaquín",
    "autonomia_base": "Autónomo; su esposa lo acompaña en los trámites.",
    "red_apoyo_base": "Vive con su esposa Ana; su hija lo llama los domingos.",
    "intereses": [
      "pesca",
      "radio",
      "dominó"
    ],
    "medicamentos": [
      {
        "name": "Atorvastatina 20 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      }
    ],
    "scenario_id": "escenario_miguel"
  },
  {
    "id": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "region": "Metropolitana de Santiago",
    "comuna": "San Joaquín",
    "telefono": "+56 9 0000 0005",
    "fechaRegistro": "2026-10-22",
    "fechaUltimoControl": "2026-11-05",
    "nivel": "urgente",
    "senales": [
      {
        "dominio": "seguridad",
        "descripcion": "Caida reportada: Sí, me caí en el pasillo y no me puedo parar.",
        "fecha": "2026-11-02",
        "severidad": "alta"
      },
      {
        "dominio": "seguridad",
        "descripcion": "Lesion reportada: Sí, me golpeé fuerte la cadera y me duele harto.",
        "fecha": "2026-11-02",
        "severidad": "alta"
      },
      {
        "dominio": "seguridad",
        "descripcion": "Necesita ayuda inmediata: Me caí, me lesioné y necesito ayuda ahora, por favor.",
        "fecha": "2026-11-02",
        "severidad": "alta"
      },
      {
        "dominio": "seguridad",
        "descripcion": "Lesion reportada: Sí, todavía me duele la cadera del golpe.",
        "fecha": "2026-11-03",
        "severidad": "alta"
      },
      {
        "dominio": "seguridad",
        "descripcion": "Lesion reportada: Sí, todavía me duele la cadera del golpe.",
        "fecha": "2026-11-04",
        "severidad": "alta"
      }
    ],
    "historialControles": [
      {
        "id": "c-57",
        "fecha": "2026-10-23",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-58",
        "fecha": "2026-10-24",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-59",
        "fecha": "2026-10-25",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Responde que no sabe sobre su autonomía; no cuenta como señal.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Ay, no sé, no sabría decirle.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-60",
        "fecha": "2026-10-26",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-61",
        "fecha": "2026-10-27",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Estable: sin señales y con apoyo disponible.",
        "nivelResultante": "estable",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "No, me las arreglo igual que siempre.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-62",
        "fecha": "2026-10-28",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Empeoramiento de autonomía expresamente reportado.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Estoy peor, ya no me valgo como antes.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-63",
        "fecha": "2026-10-29",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Empeoramiento de autonomía expresamente reportado.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Sí, noto que cada día me cuesta más.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-64",
        "fecha": "2026-10-30",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Empeoramiento de autonomía expresamente reportado.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Sí, me cuesta más que antes hacer mis cosas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-65",
        "fecha": "2026-10-31",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Empeoramiento de autonomía expresamente reportado.",
        "nivelResultante": "prioritario",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Estoy peor, ya no me valgo como antes.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-66",
        "fecha": "2026-11-01",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Dificultad puntual sin cambio confirmado.",
        "nivelResultante": "preventivo",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Igual que antes, sin problemas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-67",
        "fecha": "2026-11-02",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Caída con lesión y petición de ayuda inmediata: nivel 3 desde el guion.",
        "nivelResultante": "urgente",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, hablé con mi familia por teléfono.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Sí, me cuesta más que antes hacer mis cosas.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-68",
        "fecha": "2026-11-03",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
        "nivelResultante": "urgente",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, gracias a Dios, tengo con quien conversar.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, vino la vecina a tomar once ayer.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, mi familia está pendiente.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Mejor que la semana pasada.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-69",
        "fecha": "2026-11-04",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
        "nivelResultante": "urgente",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, con mi gente cerca estoy en paz.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, conversé con unos amigos en la tarde.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, tengo a mis vecinos y a mi familia.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Un poquito mejor, ya me muevo más.",
            "dominio": "funcional"
          }
        ]
      },
      {
        "id": "c-70",
        "fecha": "2026-11-05",
        "tipo": "telefonica",
        "duracion": 10,
        "resumen": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
        "nivelResultante": "urgente",
        "respuestas": [
          {
            "pregunta": "¿Se ha sentido sola o solo desde ayer?",
            "respuesta": "No, para nada, tengo compañía.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Conversó con alguien desde ayer?",
            "respuesta": "Sí, me llamó mi hijo anoche.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "Si necesitara ayuda, ¿tiene alguien a quien recurrir?",
            "respuesta": "Sí, si pasa algo llamo a mi hijo.",
            "dominio": "aislamiento"
          },
          {
            "pregunta": "¿Ha notado algún cambio en cómo se las arregla sola o solo en el día a día?",
            "respuesta": "Mejor que la semana pasada.",
            "dominio": "funcional"
          }
        ]
      }
    ],
    "historialAcciones": [
      {
        "id": "act-501",
        "fecha": "2026-11-02",
        "tipo": "Activación Protocolo Urgente",
        "descripcion": "Reporte de caída con dolor intenso en cadera y solicitud expresa de ayuda inmediata.",
        "profesional": "Camila Rojas",
        "estado": "en_progreso"
      },
      {
        "id": "act-502",
        "fecha": "2026-11-03",
        "tipo": "Coordinación Familiar y Territorial",
        "descripcion": "Contacto con Paola Vera (nieta) y visita de apoyo kinésico en curso. Pendiente resolución de alta médica.",
        "profesional": "Dr. Pablo Díaz",
        "estado": "en_progreso"
      }
    ],
    "profesionalAsignado": "Camila Rojas (Monitor Oam)",
    "estadoRevision": "pendiente",
    "contactoEmergencia": "Paola Vera (nieta) - +56 9 0000 0015",
    "observaciones": "Se desplaza con apoyo de bastón; prepara sus comidas. Nieta Paola la visita dos veces por semana; hija Carolina la llama.",
    "direccion": "Calle Ficticia 104, San Joaquín",
    "autonomia_base": "Se desplaza con apoyo de bastón; prepara sus comidas.",
    "red_apoyo_base": "Nieta Paola la visita dos veces por semana; hija Carolina la llama.",
    "intereses": [
      "telenovelas",
      "bordado",
      "rezar el rosario"
    ],
    "medicamentos": [
      {
        "name": "Amlodipino 5 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      },
      {
        "name": "Paracetamol 500 mg",
        "source": "declarado en la ficha",
        "verified_at": "2026-10-22"
      }
    ],
    "scenario_id": "escenario_teresa"
  }
];

export const syntheticAlertas: Alerta[] = [
  {
    "id": "alt-14",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Sin señales hoy; la ventana de 5 días aún contiene aislamiento persistente: nivel 2 hasta que se limpie.",
    "dominio": "aislamiento",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-11-05",
    "estadoRevision": "en_revision",
    "explicacion": "Sin señales hoy; la ventana de 5 días aún contiene aislamiento persistente: nivel 2 hasta que se limpie.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-70",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "dominio": "seguridad",
    "nivel": "urgente",
    "fechaUltimoControl": "2026-11-05",
    "estadoRevision": "pendiente",
    "explicacion": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "accionSugerida": "Derivación urgente a monitor territorial y equipo de enlace CESFAM. Contactar red de apoyo familiar."
  },
  {
    "id": "alt-13",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Mejora tras la acción, pero la soledad persiste en 3 de las últimas 5 llamadas: sigue en nivel 2.",
    "dominio": "aislamiento",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-11-04",
    "estadoRevision": "en_revision",
    "explicacion": "Mejora tras la acción, pero la soledad persiste en 3 de las últimas 5 llamadas: sigue en nivel 2.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-69",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "dominio": "seguridad",
    "nivel": "urgente",
    "fechaUltimoControl": "2026-11-04",
    "estadoRevision": "pendiente",
    "explicacion": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "accionSugerida": "Derivación urgente a monitor territorial y equipo de enlace CESFAM. Contactar red de apoyo familiar."
  },
  {
    "id": "alt-54",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "La señal previa sigue dentro de la ventana; hoy sin confusión.",
    "dominio": "emocional_cognitiva",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-11-03",
    "estadoRevision": "revisado",
    "explicacion": "La señal previa sigue dentro de la ventana; hoy sin confusión.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-12",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Aún hay señales. La acción del equipo se registra en vivo durante la demo.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-11-03",
    "estadoRevision": "en_revision",
    "explicacion": "Aún hay señales. La acción del equipo se registra en vivo durante la demo.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-68",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "dominio": "seguridad",
    "nivel": "urgente",
    "fechaUltimoControl": "2026-11-03",
    "estadoRevision": "pendiente",
    "explicacion": "Se recupera con apoyo familiar, pero el nivel urgente sigue hasta la resolución humana.",
    "accionSugerida": "Derivación urgente a monitor territorial y equipo de enlace CESFAM. Contactar red de apoyo familiar."
  },
  {
    "id": "alt-11",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Empeora: soledad frecuente y sin tratamiento por falta de acceso.",
    "dominio": "aislamiento",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-11-02",
    "estadoRevision": "en_revision",
    "explicacion": "Empeora: soledad frecuente y sin tratamiento por falta de acceso.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-67",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Caída con lesión y petición de ayuda inmediata: nivel 3 desde el guion.",
    "dominio": "seguridad",
    "nivel": "urgente",
    "fechaUltimoControl": "2026-11-02",
    "estadoRevision": "pendiente",
    "explicacion": "Caída con lesión y petición de ayuda inmediata: nivel 3 desde el guion.",
    "accionSugerida": "Derivación urgente a monitor territorial y equipo de enlace CESFAM. Contactar red de apoyo familiar."
  },
  {
    "id": "alt-10",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Señales en aislamiento y tratamiento: dos dimensiones.",
    "dominio": "aislamiento",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-11-01",
    "estadoRevision": "en_revision",
    "explicacion": "Señales en aislamiento y tratamiento: dos dimensiones.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-66",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Dificultad puntual sin cambio confirmado.",
    "dominio": "medicacion",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-11-01",
    "estadoRevision": "revisado",
    "explicacion": "Dificultad puntual sin cambio confirmado.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-51",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "Persiste la señal en la ventana de 5 días.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-31",
    "estadoRevision": "en_revision",
    "explicacion": "Persiste la señal en la ventana de 5 días.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-9",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Señales en aislamiento y tratamiento: dos dimensiones.",
    "dominio": "aislamiento",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-31",
    "estadoRevision": "en_revision",
    "explicacion": "Señales en aislamiento y tratamiento: dos dimensiones.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-65",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Empeoramiento de autonomía expresamente reportado.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-31",
    "estadoRevision": "en_revision",
    "explicacion": "Empeoramiento de autonomía expresamente reportado.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-50",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "Tercera confusión reportada en los últimos 5 días: persistencia, nivel 2.",
    "dominio": "emocional_cognitiva",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-30",
    "estadoRevision": "en_revision",
    "explicacion": "Tercera confusión reportada en los últimos 5 días: persistencia, nivel 2.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-8",
    "personaId": "p-1",
    "nombre": "Rosa",
    "apellido": "Soto",
    "edad": 79,
    "comuna": "San Joaquín",
    "senalDetectada": "Solo aislamiento: menor contacto y soledad a veces.",
    "dominio": "aislamiento",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-10-30",
    "estadoRevision": "revisado",
    "explicacion": "Solo aislamiento: menor contacto y soledad a veces.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-64",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Empeoramiento de autonomía expresamente reportado.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-30",
    "estadoRevision": "en_revision",
    "explicacion": "Empeoramiento de autonomía expresamente reportado.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-49",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "Señal aislada en una sola dimensión.",
    "dominio": "medicacion",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-10-29",
    "estadoRevision": "revisado",
    "explicacion": "Señal aislada en una sola dimensión.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-63",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Empeoramiento de autonomía expresamente reportado.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-29",
    "estadoRevision": "en_revision",
    "explicacion": "Empeoramiento de autonomía expresamente reportado.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-48",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "Señal aislada en una sola dimensión.",
    "dominio": "medicacion",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-10-28",
    "estadoRevision": "revisado",
    "explicacion": "Señal aislada en una sola dimensión.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-34",
    "personaId": "p-3",
    "nombre": "Elena",
    "apellido": "Lagos",
    "edad": 81,
    "comuna": "San Joaquín",
    "senalDetectada": "Tristeza ocasional y ánimo regular ese día; apoyo y autonomía conservados.",
    "dominio": "emocional_cognitiva",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-10-28",
    "estadoRevision": "revisado",
    "explicacion": "Tristeza ocasional y ánimo regular ese día; apoyo y autonomía conservados.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  },
  {
    "id": "alt-62",
    "personaId": "p-5",
    "nombre": "Teresa",
    "apellido": "Vera",
    "edad": 83,
    "comuna": "San Joaquín",
    "senalDetectada": "Empeoramiento de autonomía expresamente reportado.",
    "dominio": "medicacion",
    "nivel": "prioritario",
    "fechaUltimoControl": "2026-10-28",
    "estadoRevision": "en_revision",
    "explicacion": "Empeoramiento de autonomía expresamente reportado.",
    "accionSugerida": "Revisión en ronda de las próximas 24 hrs. Coordinar apoyo territorial específico."
  },
  {
    "id": "alt-47",
    "personaId": "p-4",
    "nombre": "Miguel",
    "apellido": "Mora",
    "edad": 77,
    "comuna": "San Joaquín",
    "senalDetectada": "Señal aislada en una sola dimensión.",
    "dominio": "medicacion",
    "nivel": "preventivo",
    "fechaUltimoControl": "2026-10-27",
    "estadoRevision": "revisado",
    "explicacion": "Señal aislada en una sola dimensión.",
    "accionSugerida": "Seguimiento preventivo en próximo check-in diario."
  }
];

export const syntheticDatosComunales: DatosComunal[] = [
  {
    "comuna": "San Joaquín",
    "region": "Metropolitana de Santiago",
    "totalPersonas": 5,
    "alertas": 4,
    "controlesRealizados": 70,
    "porcentajeControles": 94,
    "distribucionNiveles": {
      "estable": 3,
      "preventivo": 0,
      "prioritario": 1,
      "urgente": 1
    }
  },
  {
    "comuna": "La Granja",
    "region": "Metropolitana de Santiago",
    "totalPersonas": 4,
    "alertas": 1,
    "controlesRealizados": 52,
    "porcentajeControles": 92,
    "distribucionNiveles": {
      "estable": 3,
      "preventivo": 1,
      "prioritario": 0,
      "urgente": 0
    }
  },
  {
    "comuna": "San Miguel",
    "region": "Metropolitana de Santiago",
    "totalPersonas": 3,
    "alertas": 1,
    "controlesRealizados": 41,
    "porcentajeControles": 96,
    "distribucionNiveles": {
      "estable": 2,
      "preventivo": 0,
      "prioritario": 1,
      "urgente": 0
    }
  },
  {
    "comuna": "Puente Alto",
    "region": "Metropolitana de Santiago",
    "totalPersonas": 6,
    "alertas": 2,
    "controlesRealizados": 78,
    "porcentajeControles": 91,
    "distribucionNiveles": {
      "estable": 4,
      "preventivo": 1,
      "prioritario": 1,
      "urgente": 0
    }
  },
  {
    "comuna": "La Florida",
    "region": "Metropolitana de Santiago",
    "totalPersonas": 5,
    "alertas": 1,
    "controlesRealizados": 67,
    "porcentajeControles": 95,
    "distribucionNiveles": {
      "estable": 4,
      "preventivo": 0,
      "prioritario": 1,
      "urgente": 0
    }
  }
];

export const syntheticEvolucionMensual: DatosEvolucionMensual[] = [
  {
    "mes": "23 Oct",
    "controles": 5,
    "alertas": 0,
    "nuevosRegistros": 5
  },
  {
    "mes": "24 Oct",
    "controles": 5,
    "alertas": 0,
    "nuevosRegistros": 0
  },
  {
    "mes": "25 Oct",
    "controles": 5,
    "alertas": 0,
    "nuevosRegistros": 0
  },
  {
    "mes": "26 Oct",
    "controles": 5,
    "alertas": 0,
    "nuevosRegistros": 0
  },
  {
    "mes": "27 Oct",
    "controles": 5,
    "alertas": 1,
    "nuevosRegistros": 0
  },
  {
    "mes": "28 Oct",
    "controles": 5,
    "alertas": 3,
    "nuevosRegistros": 0
  },
  {
    "mes": "29 Oct",
    "controles": 5,
    "alertas": 2,
    "nuevosRegistros": 0
  },
  {
    "mes": "30 Oct",
    "controles": 5,
    "alertas": 3,
    "nuevosRegistros": 0
  },
  {
    "mes": "31 Oct",
    "controles": 5,
    "alertas": 3,
    "nuevosRegistros": 0
  },
  {
    "mes": "01 Nov",
    "controles": 5,
    "alertas": 2,
    "nuevosRegistros": 0
  },
  {
    "mes": "02 Nov",
    "controles": 5,
    "alertas": 2,
    "nuevosRegistros": 0
  },
  {
    "mes": "03 Nov",
    "controles": 5,
    "alertas": 3,
    "nuevosRegistros": 0
  },
  {
    "mes": "04 Nov",
    "controles": 5,
    "alertas": 2,
    "nuevosRegistros": 0
  },
  {
    "mes": "05 Nov",
    "controles": 5,
    "alertas": 2,
    "nuevosRegistros": 0
  }
];

export const syntheticDatosDominio: DatosDominio[] = [
  {
    "dominio": "aislamiento",
    "label": "Aislamiento social",
    "total": 10,
    "alta": 4,
    "media": 4,
    "baja": 2
  },
  {
    "dominio": "funcional",
    "label": "Deterioro funcional",
    "total": 6,
    "alta": 2,
    "media": 3,
    "baja": 1
  },
  {
    "dominio": "medicacion",
    "label": "Medicamentos y tratamientos",
    "total": 3,
    "alta": 2,
    "media": 1,
    "baja": 0
  },
  {
    "dominio": "emocional_cognitiva",
    "label": "Salud emocional y cognitiva",
    "total": 4,
    "alta": 2,
    "media": 2,
    "baja": 0
  },
  {
    "dominio": "seguridad",
    "label": "Seguridad y emergencias",
    "total": 5,
    "alta": 4,
    "media": 1,
    "baja": 0
  }
];

export function getPersonas(): Persona[] {
  return syntheticPersonas;
}

export function getAlertas(): Alerta[] {
  return syntheticAlertas;
}

export function getDatosComunales(): DatosComunal[] {
  return syntheticDatosComunales;
}

export function getEvolucionMensual(): DatosEvolucionMensual[] {
  return syntheticEvolucionMensual;
}

export function getDatosDominio(): DatosDominio[] {
  return syntheticDatosDominio;
}
