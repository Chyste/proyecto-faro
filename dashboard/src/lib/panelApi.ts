// Typed client for the FARO operator-panel API (src/api/panel.py). Every screen reads from here; nothing is mocked.
import { API_BASE } from './liveApi';

export type Nivel = 0 | 1 | 2 | 3;
export type EstadoRevision = 'pendiente' | 'en_revision' | 'revisado' | 'derivado' | 'sin_pendientes';
export type EstadoDerivacion = 'enviada' | 'recibida' | 'atendida';
export type Frecuencia = 'diaria' | 'cada 2 días' | 'semanal';
export type Accion = 'derivar' | 'avisar_contacto' | 'solicitar_llamada_humana' | 'ajustar_frecuencia' | 'cerrar' | 'pausar' | 'asignar' | 'actualizar_derivacion';

export interface BandejaRow {
  id: number; nombre: string; edad: number | null; comuna: string | null; vive_sola: string; nivel: Nivel | null; motivo: string | null;
  ultima_llamada: { id: number; fecha: string; estado: string } | null; responsable: string | null;
  alertas_abiertas: number; nivel_max_alerta: Nivel | null; estado_revision: EstadoRevision;
  proxima_llamada: string | null; frecuencia: Frecuencia; pausada: boolean;
  derivacion: { id: number; destino: string | null; fecha: string; estado: EstadoDerivacion } | null;
}
export interface Bandeja { personas: BandejaRow[]; contadores: Record<'0' | '1' | '2' | '3' | 'sin_evaluacion', number>; hoy: string }

export interface ObsApi {
  indicador: string; dimension: string | null; valor: string | boolean | string[] | null; estado: string;
  cita: string | null; confianza: number | null; fuente: string; observado_en: string; conversacion_id: number | null;
}
export interface DecisionApi {
  id: number; fecha: string; accion: string; autor: string; destino: string | null; nota: string | null;
  resultado: string | null; alerta_id: number | null; proxima_revision: string | null; transcripcion_revisada: boolean;
  ref_id: number | null; estado_derivacion?: EstadoDerivacion;
}
export interface PersonaDetalleApi extends BandejaRow {
  perfil: {
    nombre: string; edad: number | null; comuna: string | null; area: string; vive_sola: string; autonomia_base: string | null;
    red_apoyo_base: string | null; tiene_tratamiento: string; horario_preferido: string | null; intereses: string[];
    prioridad: string | null; estado: string; discapacidad: string;
    medicamentos?: { name: string; source: string | null; verified_at: string | null }[];
  };
  contacto_confianza: { nombre: string; relacion: string; autorizado: boolean } | null;
  consentimiento: { checkin: boolean; datos_sensibles: boolean; terceros: boolean; otorgado: string; revocado: string | null } | null;
  razones: { regla: string; dimension?: string; explicacion: string }[];
  dimensiones: { dimension: string; nombre: string; nivel: Nivel | null; indicadores: ObsApi[] }[];
  linea_tiempo: { fecha: string; nivel: Nivel | null; estado_llamada: string | null }[];
  llamadas_recientes: { id: number; fecha: string; estado: string; canal: string; nivel: Nivel | null }[];
  decisiones: DecisionApi[];
}
export interface AlertaItem {
  id: number; persona_id: number; persona: string; edad: number | null; comuna: string | null; nivel: Nivel; origen: string;
  regla: string; explicacion: string; estado: 'abierta' | 'en_revision' | 'cerrada'; creada: string; responsable: string | null;
}
export interface AlertaDetalleApi extends Omit<AlertaItem, 'persona'> {
  persona: { id: number; nombre: string; edad: number | null; comuna: string | null };
  evidencia: ObsApi[]; conversacion_id: number | null; decisiones: DecisionApi[];
}
export interface LlamadaItem {
  id: number; persona_id: number; persona: string; fecha: string; estado: string; canal: string; nivel: Nivel | null; mensajes: number;
}
export interface TurnoApi { turno: number; rol: 'asistente' | 'persona'; texto: string; question_code: string | null; observaciones: ObsApi[] }
export interface LlamadaDetalleApi {
  id: number; persona: { id: number; nombre: string; edad: number | null }; fecha: string; estado: string; canal: string;
  evento_urgente: { tipo: string; cita: string } | null; turnos: TurnoApi[]; observaciones: ObsApi[];
  evaluacion: { nivel: Nivel | null; niveles_por_dimension: Record<string, number | null>; razones: { rule_code: string; explanation: string }[] } | null;
}

export interface DecisionBody {
  alerta_id?: number | null; persona_id: number; accion: Accion; destino?: string | null; nota?: string;
  resultado?: string | null; proxima_revision?: string | null; transcripcion_revisada?: boolean; ref_id?: number | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con FARO (API en :8000)');
  }
  if (!r.ok) {
    let msg = `Error ${r.status}`;
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep generic */ }
    throw new ApiError(r.status, msg);
  }
  return r.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) => http<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const getBandeja = () => http<Bandeja>('/api/bandeja');
export const getPersona = (id: number | string, salud = false) => http<PersonaDetalleApi>(`/api/personas/${id}${salud ? '?incluir_salud=1' : ''}`);
export const getAlertas = (estado?: string, personaId?: number) => {
  const q = new URLSearchParams();
  if (estado) q.set('estado', estado);
  if (personaId !== undefined) q.set('persona_id', String(personaId));
  return http<AlertaItem[]>(`/api/alertas${q.size ? `?${q}` : ''}`);
};
export const getAlerta = (id: number | string) => http<AlertaDetalleApi>(`/api/alertas/${id}`);
export const getLlamadas = (personaId?: number) => http<LlamadaItem[]>(`/api/llamadas${personaId !== undefined ? `?persona_id=${personaId}` : ''}`);
export const getLlamada = (id: number) => http<LlamadaDetalleApi>(`/api/llamadas/${id}`);
/** After a successful write, wake local subscribers right away (the server SSE also broadcasts it). */
const tocar = (persona_id?: number) => <T,>(r: T): T => { handlers.forEach((fn) => fn('decision_registrada', { persona_id })); return r; };
export const getDecisiones = () => http<(DecisionApi & { persona_id: number; persona: string })[]>('/api/decisiones');
export const postDecision = (b: DecisionBody) => post<{ ok: boolean; id: number }>('/api/decisiones', b).then(tocar(b.persona_id));
export const postEstadoDerivacion = (personaId: number, derivacionId: number, estado: EstadoDerivacion) =>
  postDecision({ persona_id: personaId, accion: 'actualizar_derivacion', ref_id: derivacionId, resultado: estado });
export const postAsignar = (id: number) => post<{ ok: boolean }>(`/api/personas/${id}/asignar`).then(tocar(id));
export const postFrecuencia = (id: number, frecuencia: Frecuencia) => post<{ ok: boolean }>(`/api/personas/${id}/frecuencia`, { frecuencia }).then(tocar(id));
export const postResetDemo = () => post<{ ok: boolean; conversaciones: number }>('/api/demo/reset').then((r) => { handlers.forEach((fn) => fn('demo_reiniciada', {})); return r; });

// ---- global SSE: one shared EventSource for the whole app
export type PanelEvent = 'persona_actualizada' | 'alerta_creada' | 'decision_registrada' | 'demo_reiniciada';
const EVENTS: PanelEvent[] = ['persona_actualizada', 'alerta_creada', 'decision_registrada', 'demo_reiniciada'];
type Handler = (e: PanelEvent, data: { persona_id?: number }) => void;
const handlers = new Set<Handler>();
let source: EventSource | null = null;

export function suscribirPanel(h: Handler): () => void {
  handlers.add(h);
  if (!source && typeof EventSource !== 'undefined') {
    source = new EventSource(`${API_BASE}/api/eventos`);
    for (const ev of EVENTS) {
      source.addEventListener(ev, (m) => {
        let data: { persona_id?: number } = {};
        try { data = JSON.parse((m as MessageEvent<string>).data); } catch { /* empty */ }
        handlers.forEach((fn) => fn(ev, data));
      });
    }
  }
  return () => {
    handlers.delete(h);
    if (handlers.size === 0 && source) { source.close(); source = null; }
  };
}

// ---- display helpers
export const ESTADO_REVISION_LABEL: Record<EstadoRevision, string> = {
  pendiente: 'Pendiente', en_revision: 'En revisión', revisado: 'Revisado', derivado: 'Derivado', sin_pendientes: 'Sin pendientes',
};
export const ACCION_LABEL: Record<string, string> = {
  derivar: 'Derivación', avisar_contacto: 'Aviso a contacto de confianza', solicitar_llamada_humana: 'Llamada humana solicitada',
  ajustar_frecuencia: 'Frecuencia de llamadas ajustada', cerrar: 'Cierre con decisión', pausar: 'Seguimiento pausado', asignar: 'Asignación',
  actualizar_derivacion: 'Estado de derivación actualizado',
};
export const ESTADO_DERIVACION_LABEL: Record<EstadoDerivacion, string> = { enviada: 'Enviada', recibida: 'Recibida', atendida: 'Atendida' };
export function hoyHora(iso: string): string {
  const d = new Date(iso);
  const same = d.toDateString() === new Date().toDateString();
  return same ? `hoy ${iso.slice(11, 16)}` : fechaHora(iso);
}
export const accionLabel = (a: string) => ACCION_LABEL[a] ?? 'Decisión';
export const CURRENT_USER = 'Camila Rojas';
export const primerNombre = (n: string | null) => (n ? n.replace(/\(.*\)/, '').trim().split(' ')[0] : '—');

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dparse = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);
export const fechaCorta = (iso: string) => { const d = dparse(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
export const fechaLarga = (iso: string) => { const d = dparse(iso); const w = DIAS[d.getDay()]; return `${w[0].toUpperCase()}${w.slice(1)} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`; };
export const hora = (iso: string) => iso.slice(11, 16);
export const fechaHora = (iso: string) => `${fechaCorta(iso)} ${hora(iso)}`;
export const diasEntre = (a: string, b: string) => Math.round((dparse(b).getTime() - dparse(a).getTime()) / 86400000);
export function proximaTexto(iso: string | null, pausada: boolean): string {
  if (pausada) return 'en pausa';
  return iso ? `${fechaCorta(iso)}, ${hora(iso)}` : '—';
}
