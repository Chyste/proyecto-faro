import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Modal, { Field, fieldCls } from '../ui/Modal';
import Toast from '../ui/Toast';
import Drawer from '../ui/Drawer';
import Transcripcion from './Transcripcion';
import { useApi } from '../../lib/useApi';
import {
  CURRENT_USER, getPersona, postAsignar, postDecision, postFrecuencia, proximaTexto,
  type Accion, type Frecuencia,
} from '../../lib/panelApi';

export type ActionKind = 'asignar' | 'transcripcion' | 'derivar' | 'contacto' | 'llamadaHumana' | 'frecuencia' | 'cerrar' | 'pausar';

interface Ctx {
  open: (kind: ActionKind, personaId: number) => void;
  toast: (msg: string) => void;
  reviewed: ReadonlySet<number>;
  markReviewed: (personaId: number) => void;
}
const ActionsCtx = createContext<Ctx | null>(null);
export function useActions() {
  const c = useContext(ActionsCtx);
  if (!c) throw new Error('useActions must be used inside ActionsProvider');
  return c;
}

const PROTOCOLO = 'Situación de riesgo · Activación simulada del protocolo: no se envía nada real; solo queda el registro de la decisión.';

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ kind: ActionKind; id: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<ReadonlySet<number>>(new Set());
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const markReviewed = useCallback((id: number) => setReviewed((r) => (r.has(id) ? r : new Set(r).add(id))), []);
  const value = useMemo(() => ({ open: (kind: ActionKind, id: number) => setCurrent({ kind, id }), toast, reviewed, markReviewed }), [toast, reviewed, markReviewed]);
  const close = () => setCurrent(null);

  return (
    <ActionsCtx.Provider value={value}>
      {children}
      {current && <ActionModal key={`${current.kind}-${current.id}`} kind={current.kind} personaId={current.id} onClose={close} toast={toast} />}
      <Toast message={msg} />
    </ActionsCtx.Provider>
  );
}

const DESTINOS = ['CESFAM', 'Visita domiciliaria', 'Junta de vecinos', 'Servicio social municipal'];
const CIERRES = ['Resuelto', 'Falsa alarma', 'Sin acción necesaria'];
const FRECUENCIAS: Frecuencia[] = ['diaria', 'cada 2 días', 'semanal'];

function ActionModal({ kind, personaId, onClose, toast }: { kind: ActionKind; personaId: number; onClose: () => void; toast: (m: string) => void }) {
  const { open, reviewed, markReviewed } = useActions();
  const api = useApi(() => getPersona(personaId), [personaId], { personaId });
  const persona = api.data;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [nota, setNota] = useState('');
  const [justif, setJustif] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const vista = useCallback(() => markReviewed(personaId), [markReviewed, personaId]);

  if (!persona) {
    return (
      <Modal title="Cargando…" onClose={onClose}>
        <p className="text-[13px] text-muted">{api.error ? `No se pudo conectar con FARO (API en :8000). ${api.error}` : 'Cargando datos de la persona…'}</p>
      </Modal>
    );
  }
  const nivel = persona.nivel_max_alerta === 3 || persona.nivel === 3 ? 3 : persona.nivel;
  const nombre = persona.nombre;
  /** Runs the API write; the SSE/local event refreshes every open view. */
  const send = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      toast(msg);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const decide = (accion: Accion, extra: { destino?: string; nota?: string; resultado?: string }, msg: string) =>
    send(() => postDecision({ persona_id: personaId, accion, transcripcion_revisada: reviewed.has(personaId), ...extra }), msg);
  const alertaN3 = nivel === 3 && <p className="anim-ring-l3 rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] font-medium text-l3-fg">{PROTOCOLO}</p>;
  const error = err && <p role="alert" className="rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] text-l3-fg">{err}</p>;

  if (kind === 'transcripcion') {
    const go = (k: ActionKind) => () => open(k, personaId);
    const btn = 'rounded-full border border-ink bg-canvas px-4 py-2 text-[13px] font-semibold text-ink';
    return (
      <Drawer
        title={`Revisar transcripción · ${nombre}`}
        subtitle="Llamada automática de seguimiento (IA de voz). El operador revisa y decide."
        onClose={onClose}
        footer={
          <>
            <button type="button" className={btn} onClick={go('llamadaHumana')}>Solicitar llamada humana</button>
            <button type="button" className={btn} onClick={go('contacto')}>Avisar a contacto</button>
            <button type="button" className={btn} onClick={go('derivar')}>Derivar</button>
            <button type="button" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white" onClick={go('cerrar')}>Cerrar con decisión</button>
          </>
        }
      >
        {alertaN3}
        <Transcripcion personaId={personaId} onVista={vista} />
      </Drawer>
    );
  }

  if (kind === 'asignar') {
    return (
      <Modal
        title={`Asignarme el caso de ${nombre}`}
        onClose={onClose}
        primaryLabel="Asignarme"
        primaryDisabled={busy}
        onPrimary={() => send(() => postAsignar(personaId), 'Caso asignado')}
      >
        <p className="text-[14px] leading-[21px] text-body">
          Quedarás como responsable de {nombre}. Se registrará quién lo asignó ({CURRENT_USER}, usuaria de demostración), cuándo y con qué nota.
        </p>
        {error}
      </Modal>
    );
  }

  if (kind === 'derivar') {
    return (
      <Modal
        title={`Derivar a ${nombre}`}
        onClose={onClose}
        primaryLabel="Derivar"
        primaryDisabled={busy || !a || !b.trim() || !c || !nota.trim()}
        onPrimary={() => decide('derivar', { destino: a, nota: `Motivo: ${b.trim()}. Urgencia: ${c}. ${nota.trim()}` }, 'Derivación registrada')}
      >
        {alertaN3}
        <Field label="Destino">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir destino</option>
            {DESTINOS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Motivo">
          <input className={fieldCls} value={b} onChange={(e) => setB(e.target.value)} placeholder="Por qué se deriva" />
        </Field>
        <Field label="Urgencia">
          <select className={fieldCls} value={c} onChange={(e) => setC(e.target.value)}>
            <option value="">Elegir</option>
            <option>Hoy</option>
            <option>Esta semana</option>
          </select>
        </Field>
        <Field label="Nota (obligatoria)">
          <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
        {error}
      </Modal>
    );
  }

  if (kind === 'contacto') {
    const cc = persona.contacto_confianza;
    const contacto = cc && cc.autorizado ? `${cc.nombre} (${cc.relacion})` : undefined;
    const mensaje = `Hola, le escribe el equipo FARO. Queremos saber cómo está ${nombre}; le pedimos comunicarse con la persona hoy. No compartimos información de salud.`;
    return (
      <Modal
        title={`Avisar a contacto de confianza de ${nombre}`}
        onClose={onClose}
        primaryLabel="Enviar aviso (simulado)"
        primaryDisabled={busy || !contacto}
        onPrimary={() => decide('avisar_contacto', { destino: contacto, nota: `Avisó a su contacto de confianza (${contacto}) con el mensaje mínimo. Envío simulado.` }, 'Aviso simulado registrado')}
      >
        {alertaN3}
        {contacto ? (
          <>
            <p className="text-[13px] text-body">Contacto autorizado: <b>{contacto}</b></p>
            <Field label="Mensaje mínimo que se enviaría">
              <p className="rounded-[10px] bg-surface-soft p-3 text-[13px] leading-[19px] text-body">{mensaje}</p>
            </Field>
            <p className="text-[12px] text-muted">Envío simulado: no sale ningún mensaje real.</p>
          </>
        ) : (
          <p className="text-[13px] text-body">No hay contacto de confianza autorizado para esta persona; no se puede enviar el aviso.</p>
        )}
        {error}
      </Modal>
    );
  }

  if (kind === 'llamadaHumana') {
    return (
      <Modal
        title={`Solicitar llamada humana para ${nombre}`}
        onClose={onClose}
        primaryLabel="Solicitar llamada"
        primaryDisabled={busy || !a || !nota.trim()}
        onPrimary={() => decide('solicitar_llamada_humana', { nota: `Plazo: ${a}. ${nota.trim()}` }, 'Tarea de llamada creada para el equipo')}
      >
        <p className="text-[13px] leading-[19px] text-body">Se crea una tarea para que una persona del equipo llame. No llamas tú ahora.</p>
        <Field label="Plazo">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir plazo</option>
            <option>Hoy</option>
            <option>Mañana</option>
            <option>Esta semana</option>
          </select>
        </Field>
        <Field label="Qué debe conversar el equipo (obligatorio)">
          <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
        {error}
      </Modal>
    );
  }

  if (kind === 'frecuencia') {
    const actual = persona.frecuencia;
    return (
      <Modal
        title={`Ajustar frecuencia de llamadas automáticas · ${nombre}`}
        onClose={onClose}
        primaryLabel="Guardar frecuencia"
        primaryDisabled={busy || !a || a === actual}
        onPrimary={() => send(() => postFrecuencia(personaId, a as Frecuencia), 'Frecuencia actualizada')}
      >
        <p className="text-[13px] text-body">Frecuencia actual: <b>{actual}</b> · Próxima llamada automática: {proximaTexto(persona.proxima_llamada, persona.pausada)}</p>
        <Field label="Nueva frecuencia">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir</option>
            {FRECUENCIAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        {error}
      </Modal>
    );
  }

  if (kind === 'cerrar') {
    const n3 = nivel === 3;
    const revisada = reviewed.has(personaId);
    const hayDeriv = persona.decisiones.some((x) => x.accion === 'derivar');
    const necesitaJustif = n3 && !hayDeriv;
    const bloqueado = n3 && (!revisada || (necesitaJustif && !justif.trim()));
    return (
      <Modal
        title={`Cerrar caso de ${nombre} con decisión`}
        onClose={onClose}
        primaryLabel="Cerrar con decisión"
        primaryDisabled={busy || !a || !nota.trim() || bloqueado}
        onPrimary={() =>
          decide('cerrar', { resultado: a, nota: `${nota.trim()}${necesitaJustif ? ` Justificación sin derivación: ${justif.trim()}` : ''}` }, 'Caso cerrado con decisión')
        }
      >
        {alertaN3}
        {n3 && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-l3-fg/30 px-3 py-2 text-[13px] leading-[19px] text-body">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={revisada} disabled readOnly /> Revisé la transcripción de la llamada automática
            </label>
            {!revisada && (
              <button type="button" onClick={() => open('transcripcion', personaId)} className="self-start rounded-full border border-ink px-3 py-1.5 text-[12px] font-semibold text-ink">
                Revisar transcripción
              </button>
            )}
            <p className="text-[12px] text-muted">
              {hayDeriv ? 'Ya hay una derivación registrada para este caso.' : 'Sin derivación registrada: escribe una justificación explícita o deriva antes de cerrar.'}
            </p>
          </div>
        )}
        <p className="text-[12px] text-muted">El nivel calculado se mantiene visible; la decisión queda registrada aparte.</p>
        <Field label="Decisión">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir decisión</option>
            {CIERRES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label={a === 'Falsa alarma' ? 'Motivo de la falsa alarma (obligatorio)' : 'Nota (obligatoria)'}>
          <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
        {necesitaJustif && (
          <Field label="Justificación de cerrar sin derivar (obligatoria)">
            <textarea className={fieldCls} rows={2} value={justif} onChange={(e) => setJustif(e.target.value)} />
          </Field>
        )}
        {error}
      </Modal>
    );
  }

  // pausar
  return (
    <Modal
      title={`Pausar seguimiento de ${nombre}`}
      onClose={onClose}
      primaryLabel="Pausar seguimiento"
      primaryDisabled={busy || !nota.trim()}
      onPrimary={() => decide('pausar', { nota: nota.trim() }, 'Seguimiento pausado')}
    >
      <p className="text-[14px] leading-[21px] text-body">Las llamadas automáticas quedan en pausa hasta que alguien retome el seguimiento. Se registra quién lo pausó, cuándo y por qué.</p>
      <Field label="Motivo (obligatorio)">
        <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
      </Field>
      {error}
    </Modal>
  );
}
