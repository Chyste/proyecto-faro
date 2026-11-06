import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Modal, { Field, fieldCls } from '../ui/Modal';
import Toast from '../ui/Toast';
import { getPersonas } from '../../data/syntheticData';
import { nivelDe } from '../../lib/faro';
import { CURRENT_USER, newAccion, useFaro } from '../../state/FaroStore';

export type ActionKind = 'asignar' | 'llamada' | 'derivar' | 'cerrar' | 'pausar';

interface Ctx {
  open: (kind: ActionKind, personaId: string) => void;
  toast: (msg: string) => void;
}
const ActionsCtx = createContext<Ctx | null>(null);
export function useActions() {
  const c = useContext(ActionsCtx);
  if (!c) throw new Error('useActions must be used inside ActionsProvider');
  return c;
}

const PROTOCOLO = 'Activación simulada del protocolo: no se realizan llamadas reales; solo queda el registro de la acción.';

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ kind: ActionKind; id: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ open: (kind: ActionKind, id: string) => setCurrent({ kind, id }), toast }), [toast]);
  const close = () => setCurrent(null);

  return (
    <ActionsCtx.Provider value={value}>
      {children}
      {current && <ActionModal key={`${current.kind}-${current.id}`} kind={current.kind} personaId={current.id} onClose={close} toast={toast} />}
      <Toast message={msg} />
    </ActionsCtx.Provider>
  );
}

const RESULTADOS_LLAMADA = ['Contestó', 'No contestó', 'Número equivocado', 'Pidió llamar más tarde'];
const DESTINOS = ['CESFAM — Dr. Pablo Díaz', 'Visita domiciliaria', 'Junta de vecinos', 'Contacto de confianza (solo si autorizado)'];
const CIERRES = ['Resuelto', 'Falsa alarma', 'Sin acción necesaria'];

function ActionModal({ kind, personaId, onClose, toast }: { kind: ActionKind; personaId: string; onClose: () => void; toast: (m: string) => void }) {
  const { state, dispatch } = useFaro();
  const persona = getPersonas().find((p) => p.id === personaId);
  const ps = state.byId[personaId];
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState('');
  const [check, setCheck] = useState(false);
  const [confirmContacto, setConfirmContacto] = useState(false);

  if (!persona || !ps) return null;
  const nivel = nivelDe(persona);
  const hayContacto = ps.acciones.some((x) => x.tipo === 'llamada' && x.resultado === 'Contestó');
  const nombre = persona.nombre;
  const done = (accionTipo: Parameters<typeof newAccion>[0], notaTxt: string, extra: Parameters<typeof newAccion>[2], patch: Parameters<typeof dispatch>[0] extends infer T ? (T extends { patch?: infer P } ? P : never) : never, msg: string) => {
    dispatch({ type: 'log', id: personaId, accion: newAccion(accionTipo, notaTxt, extra), patch });
    toast(msg);
    onClose();
  };

  if (kind === 'asignar') {
    return (
      <Modal
        title={`Asignarme el caso de ${nombre}`}
        onClose={onClose}
        primaryLabel="Asignarme"
        onPrimary={() => done('asignacion', `Caso asignado a ${CURRENT_USER}.`, undefined, { responsable: CURRENT_USER }, 'Caso asignado')}
      >
        <p className="text-[14px] leading-[21px] text-body">
          Quedarás como responsable de {nombre}. Se registrará quién lo asignó ({CURRENT_USER}, usuaria de demostración), cuándo y con qué nota.
        </p>
      </Modal>
    );
  }

  if (kind === 'llamada') {
    return (
      <Modal
        title={`Registrar llamada con ${nombre}`}
        onClose={onClose}
        primaryLabel="Guardar llamada"
        primaryDisabled={!a || !b || !nota.trim()}
        onPrimary={() =>
          done(
            'llamada',
            nota.trim() + (check ? ' · Se resolvió la señal.' : ''),
            { resultado: `${a}`, destino: b },
            { proximaFecha: fecha || null, estadoRevision: ps.estadoRevision === 'pendiente' ? 'en_revision' : ps.estadoRevision },
            'Llamada registrada',
          )
        }
      >
        <Field label="Resultado de la llamada">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir resultado</option>
            {RESULTADOS_LLAMADA.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Con quién hablaste">
          <select className={fieldCls} value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Elegir</option>
            <option>La persona</option>
            <option>Contacto de confianza</option>
          </select>
        </Field>
        <Field label="Nota (obligatoria)">
          <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué se conversó y qué se acordó" />
        </Field>
        <Field label="Próxima fecha de contacto">
          <input type="datetime-local" className={fieldCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-[14px] text-body">
          <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} /> Se resolvió la señal
        </label>
        <p className="text-[12px] text-muted">Se guardará con tu nombre ({CURRENT_USER}), la fecha y hora actuales y la nota.</p>
      </Modal>
    );
  }

  if (kind === 'derivar') {
    const urgente = c === 'Hoy' || nivel === 3;
    return (
      <Modal
        title={`Derivar a ${nombre}`}
        onClose={onClose}
        primaryLabel="Derivar"
        primaryDisabled={!a || !b.trim() || !c || !nota.trim()}
        onPrimary={() =>
          done('derivacion', `Motivo: ${b.trim()}. Urgencia: ${c}. ${nota.trim()}`, { destino: a }, { estadoRevision: 'derivado' }, 'Derivación registrada')
        }
      >
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
        {urgente && <p className="rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] text-l3-fg">{PROTOCOLO}</p>}
      </Modal>
    );
  }

  if (kind === 'cerrar') {
    const bloqueado = nivel === 3 && !hayContacto && !confirmContacto;
    return (
      <Modal
        title={`Cerrar caso de ${nombre} con resultado`}
        onClose={onClose}
        primaryLabel="Cerrar con resultado"
        primaryDisabled={!a || !nota.trim() || bloqueado}
        onPrimary={() =>
          done(
            'cierre',
            nota.trim(),
            { resultado: a },
            { estadoRevision: 'revisado', cierre: { resultado: a, fecha: new Date().toISOString(), autor: CURRENT_USER, nota: nota.trim() } },
            'Caso cerrado con resultado',
          )
        }
      >
        {nivel === 3 && (
          <div className="rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] leading-[19px] text-l3-fg">
            <p>Situación urgente: cerrar el caso requiere haber contactado a la persona.</p>
            {!hayContacto && (
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={confirmContacto} onChange={(e) => setConfirmContacto(e.target.checked)} />
                Confirmo que ya contacté a {nombre}
              </label>
            )}
          </div>
        )}
        <p className="text-[12px] text-muted">El nivel calculado se mantiene visible; el cierre queda registrado aparte.</p>
        <Field label="Resultado">
          <select className={fieldCls} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Elegir resultado</option>
            {CIERRES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label={a === 'Falsa alarma' ? 'Motivo de la falsa alarma (obligatorio)' : 'Nota (obligatoria)'}>
          <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
      </Modal>
    );
  }

  // pausar
  return (
    <Modal
      title={`Pausar seguimiento de ${nombre}`}
      onClose={onClose}
      primaryLabel="Pausar seguimiento"
      primaryDisabled={!nota.trim()}
      onPrimary={() => done('pausa', nota.trim(), undefined, { pausado: true }, 'Seguimiento pausado')}
    >
      <p className="text-[14px] leading-[21px] text-body">Las llamadas automáticas quedan en pausa hasta que alguien retome el seguimiento. Se registra quién lo pausó, cuándo y por qué.</p>
      <Field label="Motivo (obligatorio)">
        <textarea className={fieldCls} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
      </Field>
    </Modal>
  );
}
