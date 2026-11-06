import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { getPersonas } from '../data/syntheticData';
import type { EstadoRevision, Persona } from '../data/types';

export const CURRENT_USER = 'Camila Rojas';
const STORAGE_KEY = 'faro-demo-store-v1';

export type TipoAccion = 'asignacion' | 'derivacion' | 'contacto' | 'llamada_humana' | 'frecuencia' | 'cierre' | 'pausa';
export type Frecuencia = 'diaria' | 'cada 2 días' | 'semanal';

export interface AccionLog {
  id: string;
  tipo: TipoAccion;
  fecha: string; // ISO datetime
  autor: string;
  nota: string;
  resultado?: string;
  destino?: string;
}

export interface PersonaState {
  responsable: string | null;
  estadoRevision: EstadoRevision;
  acciones: AccionLog[];
  proximaFecha: string | null;
  cierre: { resultado: string; fecha: string; autor: string; nota: string } | null;
  pausado: boolean;
  frecuencia: Frecuencia;
}

export interface FaroState {
  byId: Record<string, PersonaState>;
}

export type FaroAction =
  | { type: 'log'; id: string; accion: AccionLog; patch?: Partial<PersonaState> }
  | { type: 'reset' };

function seed(personas: Persona[]): FaroState {
  const byId: Record<string, PersonaState> = {};
  for (const p of personas) {
    byId[p.id] = {
      responsable: p.profesionalAsignado || null,
      estadoRevision: p.estadoRevision,
      acciones: [],
      proximaFecha: null,
      cierre: null,
      pausado: false,
      frecuencia: 'diaria',
    };
  }
  return { byId };
}

function reducer(state: FaroState, action: FaroAction): FaroState {
  switch (action.type) {
    case 'log': {
      const prev = state.byId[action.id];
      if (!prev) return state;
      return {
        byId: {
          ...state.byId,
          [action.id]: { ...prev, ...action.patch, acciones: [action.accion, ...prev.acciones] },
        },
      };
    }
    case 'reset':
      return seed(getPersonas());
    default:
      return state;
  }
}

function load(): FaroState {
  const base = seed(getPersonas());
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as FaroState;
    const byId = { ...base.byId };
    for (const id of Object.keys(byId)) if (saved.byId?.[id]) byId[id] = { ...byId[id], ...saved.byId[id] };
    return { byId };
  } catch {
    return base;
  }
}

const Ctx = createContext<{ state: FaroState; dispatch: Dispatch<FaroAction> } | null>(null);

export function FaroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: demo continues in memory */
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFaro() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFaro must be used inside FaroProvider');
  return c;
}

export function usePersonaState(id: string): PersonaState {
  const { state } = useFaro();
  return (
    state.byId[id] ?? { responsable: null, estadoRevision: 'pendiente', acciones: [], proximaFecha: null, cierre: null, pausado: false, frecuencia: 'diaria' }
  );
}

let counter = 0;
export function newAccion(tipo: TipoAccion, nota: string, extra: Partial<AccionLog> = {}): AccionLog {
  counter += 1;
  return { id: `a-${Date.now()}-${counter}`, tipo, fecha: new Date().toISOString(), autor: CURRENT_USER, nota, ...extra };
}

export const TIPO_LABEL: Record<string, string> = {
  asignacion: 'Asignación',
  derivacion: 'Derivación',
  contacto: 'Aviso a contacto de confianza',
  llamada_humana: 'Llamada humana solicitada',
  frecuencia: 'Frecuencia de llamadas ajustada',
  cierre: 'Cierre con decisión',
  pausa: 'Seguimiento pausado',
};

export const tipoLabel = (t: string) => TIPO_LABEL[t] ?? 'Decisión';

/** Human decisions read as "Decisión de Camila Rojas: Derivó a CESFAM…". */
export const decisionTexto = (a: AccionLog) => `Decisión de ${a.autor}: ${a.nota}`;

export function proximaLlamada(f: Frecuencia): string {
  return f === 'diaria' ? 'mañana 10:00' : f === 'cada 2 días' ? 'en 2 días, 10:00' : 'en 7 días, 10:00';
}

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
