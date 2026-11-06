import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, OctagonAlert, Send } from 'lucide-react';
import LevelBadge from '../components/ui/LevelBadge';
import {
  DIMENSIONES, ESTADO_LABEL, FUENTE_LABEL, enviarRespuesta, formatValor, getPersonasLive, getSalud, iniciarSesion,
  suscribirEventos, terminarSesion, type Alerta, type LiveEvent, type ModoSesion, type Nivel, type Observacion,
  type PersonaLive, type Stats,
} from '../lib/liveApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
type Msg = { id: number; rol: 'asistente' | 'persona'; texto: string };
const EMPTY_STATS: Stats = { turnos: 0, latencia_media_ms: 0, confianza_media: null, campos_reconocidos: 0, campos_pendientes: 0 };

export default function EnVivo() {
  const [personas, setPersonas] = useState<PersonaLive[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [modoSesion, setModoSesion] = useState<ModoSesion>('arbol');
  const [apiModo, setApiModo] = useState<'jev' | 'offline' | null>(null);
  const [apiError, setApiError] = useState(false);
  const [sesion, setSesion] = useState<string | null>(null);
  const [terminada, setTerminada] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [obs, setObs] = useState<Record<string, Observacion>>({});
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [nivelPulse, setNivelPulse] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [urgencia, setUrgencia] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    getSalud().then((s) => setApiModo(s.modo)).catch(() => setApiError(true));
    getPersonasLive().then((p) => { setPersonas(p); setPersonaId(p[0]?.id ?? null); }).catch(() => setApiError(true));
    return () => unsub.current?.();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, terminada]);

  const onEvent = useCallback((e: LiveEvent) => {
    switch (e.type) {
      case 'turno_asistente':
        if (e.data.modo) setApiModo(e.data.modo as 'jev' | 'offline');
        setMsgs((m) => [...m, { id: ++idRef.current, rol: 'asistente', texto: e.data.texto }]);
        break;
      case 'turno_persona':
        setMsgs((m) => [...m, { id: ++idRef.current, rol: 'persona', texto: e.data.texto }]);
        break;
      case 'clasificacion':
        if (e.data.aviso) setAviso(e.data.aviso);
        break;
      case 'nivel': {
        const d = e.data;
        setNivel((prev) => { if (prev !== d.nivel_actual) setNivelPulse((n) => n + 1); return d.nivel_actual; });
        setMotivo(d.motivo);
        setStats(d.stats);
        setObs((prev) => {
          const next: Record<string, Observacion> = {};
          const changed: Record<string, number> = {};
          for (const o of d.observaciones) {
            next[o.indicador] = o;
            if (JSON.stringify(prev[o.indicador]) !== JSON.stringify(o)) changed[o.indicador] = Date.now();
          }
          if (Object.keys(changed).length) setFlash((f) => ({ ...f, ...changed }));
          return next;
        });
        break;
      }
      case 'urgencia': setUrgencia(e.data.cita); break;
      case 'alerta': setAlertas((a) => (a.some((x) => x.id === e.data.id) ? a : [...a, e.data])); break;
      case 'fin': setTerminada(true); setStats(e.data.stats); break;
    }
  }, []);

  useEffect(() => {
    if (!Object.keys(flash).length) return;
    const t = setTimeout(() => setFlash({}), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  async function iniciar() {
    if (personaId === null) return;
    unsub.current?.();
    setMsgs([]); setObs({}); setNivel(null); setMotivo(null); setStats(EMPTY_STATS); setUrgencia(null);
    setAlertas([]); setTerminada(false); setAviso(null);
    try {
      const r = await iniciarSesion(personaId, 'texto', modoSesion, false);
      setSesion(r.sesion_id);
      unsub.current = suscribirEventos(r.sesion_id, onEvent);
    } catch { setApiError(true); }
  }

  async function enviar() {
    if (!sesion || !texto.trim() || enviando) return;
    const t = texto.trim();
    setTexto(''); setEnviando(true);
    try { await enviarRespuesta(sesion, t); } catch { setAviso('No se pudo enviar la respuesta'); } finally { setEnviando(false); }
  }

  const activa = sesion !== null && !terminada;
  const escuchando = activa && !enviando && msgs.at(-1)?.rol === 'asistente' && !urgencia;
  const persona = useMemo(() => personas.find((p) => p.id === personaId), [personas, personaId]);

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 p-6 font-sans text-ink">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-[26px] font-semibold tracking-tight">Llamada en vivo</h1>
          <p className="text-[13px] text-muted">Datos de demostración (sintéticos)</p>
        </div>
        <select aria-label="Persona" value={personaId ?? ''} onChange={(e) => setPersonaId(Number(e.target.value))}
          className="rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px]">
          {personas.map((p) => <option key={p.id} value={p.id}>{p.preferred_name} · {p.age ?? '—'} años · {p.comuna ?? ''}</option>)}
        </select>
        <select aria-label="Modo" value={modoSesion} onChange={(e) => setModoSesion(e.target.value as ModoSesion)}
          className="rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px]">
          <option value="arbol">Modo: árbol</option>
          <option value="ingesta">Modo: ingesta</option>
        </select>
        <button onClick={iniciar} disabled={personaId === null}
          className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-canvas disabled:opacity-40">Iniciar llamada</button>
        <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${apiModo === 'jev' ? 'bg-l0-bg text-l0-fg' : 'bg-surface-strong text-muted'}`}>
          {apiModo === 'jev' ? 'Jev' : apiModo === 'offline' ? 'Sin conexión' : '…'}
        </span>
      </header>

      {apiError && <div role="alert" className="rounded-[14px] bg-l1-bg p-3 text-[14px] text-l1-fg">No se pudo conectar con la API en vivo. Inicie: uv run uvicorn src.api.app:app --port 8000</div>}
      {aviso && <div className="rounded-[14px] bg-l1-bg p-3 text-[13px] text-l1-fg">{aviso}</div>}
      {urgencia && (
        <div role="alert" className="flex w-full items-start gap-3 rounded-[14px] bg-l3-fg p-4 text-canvas">
          <OctagonAlert className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="text-[16px] font-semibold">Activación simulada del protocolo — ruta por reglas, sin IA</p>
            <p className="mt-1 text-[14px] opacity-90">«{urgencia}»</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className={`${card} flex h-[640px] flex-col`}>
          <div className="border-b border-hairline-soft px-5 py-3 text-[14px] font-semibold">
            Conversación {persona && sesion ? `con ${persona.preferred_name}` : ''}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
            {msgs.length === 0 && <p className="text-[14px] text-muted">Inicie una llamada para ver la conversación en vivo.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.rol === 'persona' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug ${m.rol === 'persona' ? 'bg-ink text-canvas' : 'bg-surface-strong text-body'}`}>
                  {m.texto}
                </div>
              </div>
            ))}
            {escuchando && <p className="flex items-center gap-2 text-[13px] text-muted"><Mic className="size-4 animate-pulse" aria-hidden />Escuchando…</p>}
            {terminada && <p className="text-center text-[13px] text-muted">Llamada terminada</p>}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 border-t border-hairline-soft p-3" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!activa || modoSesion === 'ingesta'}
              placeholder={modoSesion === 'ingesta' ? 'Modo ingesta: otra IA conduce' : 'Escriba la respuesta de la persona…'}
              className="min-w-0 flex-1 rounded-[10px] border border-hairline px-3 py-2 text-[14px] disabled:bg-surface-soft" />
            <button type="submit" disabled={!activa || !texto.trim() || modoSesion === 'ingesta'}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-canvas disabled:opacity-40">
              <Send className="size-4" aria-hidden />Enviar</button>
            {activa && <button type="button" onClick={() => sesion && void terminarSesion(sesion)}
              className="rounded-full border border-hairline px-3 py-2 text-[13px]">Terminar</button>}
          </form>
        </section>

        <div className="flex flex-col gap-5">
          <section className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-muted">Nivel de atención actual</p>
            <div key={nivelPulse} className="mt-3 flex animate-[pulse_0.9s_ease-out_1] flex-col gap-2">
              <LevelBadge level={nivel ?? 'na'} className="origin-left scale-150 self-start" />
              <p className="mt-3 text-[14px] text-body">{motivo ?? 'Aún sin información suficiente.'}</p>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-3 text-[16px] font-semibold">Lo que reconoce la IA</h2>
            <div className="space-y-4">
              {DIMENSIONES.map((d) => (
                <div key={d.code}>
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{d.nombre}</p>
                  <ul className="space-y-1">
                    {d.indicadores.map((i) => {
                      const o = obs[i.code];
                      return (
                        <li key={i.code} className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[10px] px-2.5 py-1.5 text-[13px] transition-colors duration-700 ${flash[i.code] ? 'bg-l1-bg' : o ? 'bg-surface-soft' : ''}`}>
                          <span className={o ? 'font-medium' : 'text-muted'}>{i.label}</span>
                          {o ? (
                            <span className="flex flex-wrap items-center justify-end gap-2">
                              <b>{formatValor(o.valor)}</b>
                              <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[11px] text-body">{ESTADO_LABEL[o.estado] ?? o.estado}</span>
                              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-hairline-soft" title={`confianza ${o.confianza ?? '—'}`}>
                                <span className="block h-full bg-ink transition-all duration-500" style={{ width: `${Math.round((o.confianza ?? 0) * 100)}%` }} />
                              </span>
                            </span>
                          ) : <span className="text-right text-muted">pendiente</span>}
                          {o?.cita && <span className="col-span-2 truncate text-[12px] text-muted">«{o.cita}» · {FUENTE_LABEL[o.fuente] ?? o.fuente}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[['Turnos', stats.turnos], ['Latencia media', `${stats.latencia_media_ms} ms`],
              ['Confianza media', stats.confianza_media ?? '—'], ['Reconocidos', stats.campos_reconocidos],
              ['Pendientes', stats.campos_pendientes]].map(([k, v]) => (
              <div key={String(k)} className={`${card} px-4 py-3`}>
                <p className="text-[11px] text-muted">{k}</p><p className="text-[20px] font-semibold">{v}</p>
              </div>
            ))}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-2 text-[16px] font-semibold">Alertas creadas</h2>
            {alertas.length === 0 ? <p className="text-[14px] text-muted">Ninguna por ahora.</p> : (
              <ul className="space-y-2">
                {alertas.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-[14px]">
                    <LevelBadge level={Math.min(Math.max(a.level, 0), 3) as Nivel} />
                    <span className="text-body">{a.explanation}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
