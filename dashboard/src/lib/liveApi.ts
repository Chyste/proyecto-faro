// Typed client for the FARO live API (docs/API_EN_VIVO.md). Pure helpers; no React.
export const API_BASE: string = import.meta.env.VITE_FARO_API ?? 'http://localhost:8000';

export type Canal = 'voz' | 'texto';
export type ModoSesion = 'arbol' | 'ingesta';
export type Nivel = 0 | 1 | 2 | 3;

export interface PersonaLive { id: number; preferred_name: string; age: number | null; comuna: string | null }
export interface Observacion {
  indicador: string; dimension: string | null; valor: string | boolean | string[] | null;
  estado: string; confianza: number | null; cita: string | null; fuente: 'jev' | 'offline' | 'regla';
}
export interface Turno {
  indicador: string; valor: Observacion['valor']; estado: string; confianza: number | null;
  latencia_ms: number; repregunta: boolean; cita: string; fuente: string; fallback_offline?: boolean; aviso?: string | null;
}
export interface Alerta { id: number; level: number; origin: string; rule_code: string; explanation: string; status: string }
export interface Stats {
  turnos: number; latencia_media_ms: number; confianza_media: number | null;
  campos_reconocidos: number; campos_pendientes: number;
}
export interface NivelEvent {
  nivel_actual: Nivel | null; niveles_por_dimension: Record<string, number | null>; motivo: string | null;
  observaciones: Observacion[]; stats: Stats;
}
export interface RespuestaApi {
  decir: string[]; terminada: boolean; urgente: boolean; turno: Turno | null; observaciones: Observacion[];
  nivel_actual: Nivel | null; alertas: Alerta[];
}

export type LiveEvent =
  | { type: 'turno_asistente'; data: { texto: string; modo?: string; persona?: string; sistema?: boolean } }
  | { type: 'turno_persona'; data: { texto: string } }
  | { type: 'clasificacion'; data: Turno }
  | { type: 'nivel'; data: NivelEvent }
  | { type: 'urgencia'; data: { cita: string; mensaje: string } }
  | { type: 'alerta'; data: Alerta }
  | { type: 'fin'; data: { estado: string; urgente: boolean; stats: Stats } };

const EVENT_TYPES = ['turno_asistente', 'turno_persona', 'clasificacion', 'nivel', 'urgencia', 'alerta', 'fin'] as const;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export const getSalud = () => http<{ ok: boolean; modo: 'jev' | 'offline' }>('/api/salud');
export const getPersonasLive = () => http<PersonaLive[]>('/api/personas');
export const iniciarSesion = (persona_id: number, canal: Canal, modo: ModoSesion, offline: boolean) =>
  http<{ sesion_id: string; decir: string[]; estado: string; modo: 'jev' | 'offline' }>(
    `/api/sesiones${offline ? '?offline=1' : ''}`, { method: 'POST', body: JSON.stringify({ persona_id, canal, modo }) });
export const enviarRespuesta = (id: string, texto: string) =>
  http<RespuestaApi>(`/api/sesiones/${id}/respuesta`, { method: 'POST', body: JSON.stringify({ texto }) });
export const enviarTurno = (id: string, rol: 'asistente' | 'persona', texto: string) =>
  http<unknown>(`/api/sesiones/${id}/turnos`, { method: 'POST', body: JSON.stringify({ rol, texto }) });
export const terminarSesion = (id: string) => http<unknown>(`/api/sesiones/${id}/terminar`, { method: 'POST' });

/** Subscribe to the session SSE stream; returns an unsubscribe function. */
export function suscribirEventos(id: string, onEvent: (e: LiveEvent) => void, onError?: () => void): () => void {
  const es = new EventSource(`${API_BASE}/api/sesiones/${id}/eventos`);
  for (const type of EVENT_TYPES) {
    es.addEventListener(type, (m) => {
      const data = JSON.parse((m as MessageEvent<string>).data);
      onEvent({ type, data } as LiveEvent);
      if (type === 'fin') es.close();
    });
  }
  es.onerror = () => onError?.();
  return () => es.close();
}

export const DIMENSIONES: { code: string; nombre: string; indicadores: { code: string; label: string }[] }[] = [
  { code: 'aislamiento', nombre: 'Aislamiento social', indicadores: [
    { code: 'soledad_percibida', label: 'Soledad percibida' }, { code: 'contacto_social_24h', label: 'Contacto social (24 h)' },
    { code: 'menor_contacto_habitual', label: 'Menor contacto que lo habitual' }, { code: 'apoyo_disponible', label: 'Apoyo disponible' }] },
  { code: 'funcional', nombre: 'Deterioro funcional', indicadores: [
    { code: 'cambio_autonomia', label: 'Cambio en autonomía' }, { code: 'dificultad_puntual_reportada', label: 'Dificultad puntual' },
    { code: 'actividad_afectada', label: 'Actividades afectadas' }] },
  { code: 'medicacion', nombre: 'Medicamentos y tratamientos', indicadores: [
    { code: 'adherencia_reportada', label: 'Adherencia reportada' }, { code: 'barrera_tratamiento', label: 'Barreras al tratamiento' }] },
  { code: 'emocional_cognitiva', nombre: 'Salud emocional y cognitiva', indicadores: [
    { code: 'animo_reportado', label: 'Ánimo' }, { code: 'tristeza_reportada', label: 'Tristeza' },
    { code: 'confusion_nueva_reportada', label: 'Confusión nueva' }] },
  { code: 'seguridad', nombre: 'Seguridad y emergencias', indicadores: [
    { code: 'caida_reportada', label: 'Caída reportada' }, { code: 'lesion_reportada', label: 'Lesión reportada' },
    { code: 'sintoma_agudo_protocolo', label: 'Síntoma agudo' }, { code: 'necesita_ayuda_inmediata', label: 'Necesita ayuda inmediata' }] },
];

export const ESTADO_LABEL: Record<string, string> = {
  informado: 'informado', pendiente_confirmar: 'pendiente de confirmar', no_comprendido: 'no comprendido',
  no_sabe: 'no sabe', prefiere_no_responder: 'prefiere no responder',
};
export const FUENTE_LABEL: Record<string, string> = { jev: 'IA Jev', offline: 'IA (sin conexión)', regla: 'regla' };

export function formatValor(v: Observacion['valor']): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  return Array.isArray(v) ? (v.length ? v.join(', ') : 'ninguna') : v.replace(/_/g, ' ');
}
