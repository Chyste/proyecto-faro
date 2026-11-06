// ──────────────────────────────────────────────
// Types for helper AI Dashboard — Synthetic Only
// ──────────────────────────────────────────────

export type NivelSeguimiento = 'estable' | 'preventivo' | 'prioritario' | 'urgente';

export type DominioBienestar =
  | 'aislamiento_social'
  | 'movilidad_autonomia'
  | 'caidas'
  | 'medicamentos'
  | 'bienestar_emocional'
  | 'alimentacion';

export type EstadoRevision = 'pendiente' | 'en_revision' | 'revisado' | 'derivado';

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  edad: number;
  region: string;
  comuna: string;
  telefono: string;
  fechaRegistro: string;
  fechaUltimoControl: string;
  nivel: NivelSeguimiento;
  senales: Senal[];
  historialControles: Control[];
  historialAcciones: Accion[];
  profesionalAsignado: string;
  estadoRevision: EstadoRevision;
  contactoEmergencia: string;
  observaciones: string;
}

export interface Senal {
  dominio: DominioBienestar;
  descripcion: string;
  fecha: string;
  severidad: 'baja' | 'media' | 'alta';
}

export interface Control {
  id: string;
  fecha: string;
  tipo: 'telefonica' | 'presencial';
  duracion: number; // minutos
  resumen: string;
  respuestas: RespuestaControl[];
  nivelResultante: NivelSeguimiento;
}

export interface RespuestaControl {
  pregunta: string;
  respuesta: string;
  dominio: DominioBienestar;
}

export interface Accion {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  profesional: string;
  estado: 'completada' | 'pendiente' | 'en_progreso';
}

export interface Alerta {
  id: string;
  personaId: string;
  nombre: string;
  apellido: string;
  edad: number;
  comuna: string;
  senalDetectada: string;
  dominio: DominioBienestar;
  nivel: NivelSeguimiento;
  fechaUltimoControl: string;
  estadoRevision: EstadoRevision;
  explicacion: string;
  accionSugerida: string;
}

export interface DatosComunal {
  comuna: string;
  region: string;
  totalPersonas: number;
  alertas: number;
  controlesRealizados: number;
  porcentajeControles: number;
  distribucionNiveles: Record<NivelSeguimiento, number>;
}

export interface DatosEvolucionMensual {
  mes: string;
  controles: number;
  alertas: number;
  nuevosRegistros: number;
}

export interface DatosDominio {
  dominio: DominioBienestar;
  label: string;
  total: number;
  alta: number;
  media: number;
  baja: number;
}

export interface CasoSeguimiento {
  id: string;
  personaId: string;
  nombre: string;
  apellido: string;
  comuna: string;
  nivel: NivelSeguimiento;
  estado: EstadoRevision;
  profesional: string;
  fechaAsignacion: string;
  fechaSeguimiento: string;
  observaciones: string;
  acciones: Accion[];
}

