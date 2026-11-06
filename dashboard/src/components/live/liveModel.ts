// Pure helpers for the live call screen: human-readable value phrases, formatting, dimension metadata.
import { DIMENSIONES, type Observacion } from '../../lib/liveApi';

const BOOL: Record<string, [string, string]> = {
  apoyo_disponible: ['Tiene con quién conversar', 'Sin apoyo disponible'],
  contacto_social_24h: ['Habló con alguien hoy o ayer', 'Sin contacto en 24 h'],
  menor_contacto_habitual: ['Menos contacto que lo habitual', 'Contacto habitual'],
  dificultad_puntual_reportada: ['Tuvo una dificultad puntual', 'Sin dificultades puntuales'],
  confusion_nueva_reportada: ['Notó confusión nueva', 'Sin confusión nueva'],
  caida_reportada: ['Reporta una caída', 'Sin caídas'],
  lesion_reportada: ['Reporta una lesión', 'Sin lesión'],
  sintoma_agudo_protocolo: ['Reporta un síntoma agudo', 'Sin síntomas agudos'],
  necesita_ayuda_inmediata: ['Pide ayuda ahora', 'No necesita ayuda ahora'],
};
const CAT: Record<string, Record<string, string>> = {
  soledad_percibida: { no: 'No se siente sola', a_veces: 'Se siente sola a veces', frecuente: 'Se siente sola con frecuencia' },
  cambio_autonomia: { sin_cambio: 'Autonomía sin cambios', mejora: 'Autonomía mejor que antes', empeora: 'Más dificultad en lo cotidiano' },
  adherencia_reportada: { completa: 'Tomó todos sus remedios', parcial: 'Tomó solo algunos remedios', ninguna: 'No tomó sus remedios', no_aplica: 'Sin tratamiento' },
  animo_reportado: { bien: 'Ánimo bueno', regular: 'Ánimo regular', mal: 'Ánimo bajo' },
  tristeza_reportada: { no: 'Sin tristeza', ocasional: 'Tristeza ocasional', persistente: 'Tristeza casi permanente' },
};
const LIST_LABEL: Record<string, string> = {
  desplazarse: 'caminar', asearse: 'asearse', vestirse: 'vestirse', alimentarse: 'alimentarse', comprar: 'hacer compras',
  preparar_alimentos: 'cocinar', otra: 'otra', olvido: 'olvido', acceso: 'acceso a remedios', molestia_reportada: 'molestias',
};
const LIST_PREFIX: Record<string, [string, string]> = {
  actividad_afectada: ['Le cuesta: ', 'Ninguna actividad afectada'],
  barrera_tratamiento: ['Barrera: ', 'Sin barreras'],
};
const ESTADO_PHRASE: Record<string, string> = {
  no_sabe: 'No sabe o no recuerda', prefiere_no_responder: 'Prefiere no responder',
  no_comprendido: 'Respuesta no comprendida', pendiente_confirmar: 'Por confirmar',
};

/** Observation -> short Spanish phrase ("Se siente sola a veces"). */
export function valuePhrase(o: Pick<Observacion, 'indicador' | 'valor' | 'estado'>): string {
  if (o.estado !== 'informado') return ESTADO_PHRASE[o.estado] ?? o.estado;
  const v = o.valor;
  if (typeof v === 'boolean') return BOOL[o.indicador]?.[v ? 0 : 1] ?? (v ? 'Sí' : 'No');
  if (Array.isArray(v)) {
    const [pre, empty] = LIST_PREFIX[o.indicador] ?? ['', 'Ninguna'];
    return v.length ? pre + v.map((x) => LIST_LABEL[x] ?? x.replace(/_/g, ' ')).join(', ') : empty;
  }
  if (typeof v === 'string') return CAT[o.indicador]?.[v] ?? v.replace(/_/g, ' ');
  return '—';
}

export const ESTADO_CHIP: Record<string, { label: string; tone: 'ok' | 'warn' | 'muted' }> = {
  informado: { label: 'Informado', tone: 'ok' },
  pendiente_confirmar: { label: 'Pendiente de confirmar', tone: 'warn' },
  no_sabe: { label: 'No sabe', tone: 'muted' },
  prefiere_no_responder: { label: 'Prefiere no responder', tone: 'muted' },
  no_comprendido: { label: 'No comprendido', tone: 'warn' },
};

export const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  DIMENSIONES.flatMap((d) => d.indicadores.map((i) => [i.code, i.label])));
export const TOTAL_FIELDS = DIMENSIONES.reduce((n, d) => n + d.indicadores.length, 0);

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const seconds = (ms: number) => `${(ms / 1000).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const levelTone = (l: number | null | undefined) => (l === null || l === undefined ? 'na' : `l${l}`);
