import type { NivelSeguimiento, Persona } from '../data/types';

export type Level = 0 | 1 | 2 | 3;

export const NIVEL_TO_LEVEL: Record<NivelSeguimiento, Level> = {
  estable: 0,
  preventivo: 1,
  prioritario: 2,
  urgente: 3,
};

// Signal severity never reaches level 3: red is reserved for the urgent route (rules, not severity).
export const SEVERIDAD_TO_LEVEL = { baja: 1, media: 1, alta: 2 } as const;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const parse = (iso: string) => new Date(`${iso}T12:00:00`);

export function fechaCorta(iso: string): string {
  const d = parse(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function fechaLarga(iso: string): string {
  const d = parse(iso);
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`;
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

/** "Camila Rojas (Monitor Oam)" -> "Camila" */
export function primerNombre(profesional: string): string {
  return profesional.replace(/\(.*\)/, '').trim().split(' ')[0] || '—';
}

export function nivelDe(p: Persona): Level {
  return NIVEL_TO_LEVEL[p.nivel];
}

/** Latest control date across all personas = "today" of the demo. */
export function fechaHoy(personas: Persona[]): string {
  return personas.reduce((max, p) => (p.fechaUltimoControl > max ? p.fechaUltimoControl : max), '');
}
