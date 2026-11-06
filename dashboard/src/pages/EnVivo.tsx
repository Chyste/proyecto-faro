import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ConversationPanel, { type Msg } from '../components/live/ConversationPanel';
import DimensionTiles from '../components/live/DimensionTiles';
import LevelHero, { type LevelChange } from '../components/live/LevelHero';
import PersonaHeader from '../components/live/PersonaHeader';
import StatsStrip from '../components/live/StatsStrip';
import UnderstandingFeed from '../components/live/UnderstandingFeed';
import UrgentBanner from '../components/live/UrgentBanner';
import FichaEnVivo from '../components/live/FichaEnVivo';
import {
  enviarRespuesta, getPersonasLive, getSalud, iniciarSesion, suscribirEventos, terminarSesion,
  type LiveEvent, type Nivel, type Observacion, type PersonaLive, type Stats,
} from '../lib/liveApi';
import { getPersona, type ObsApi, type PersonaDetalleApi } from '../lib/panelApi';
import { useApi } from '../lib/useApi';
import { getVozEstado, type VozEstado } from '../lib/voz';
import { Llamada, type EstadoLlamada } from '../lib/llamada';
import './envivo.css';

const EMPTY_STATS: Stats = { turnos: 0, latencia_media_ms: 0, confianza_media: null, campos_reconocidos: 0, campos_pendientes: 0 };

export default function EnVivo() {
  const [personas, setPersonas] = useState<PersonaLive[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [apiError, setApiError] = useState(false);
  const [sesion, setSesion] = useState<string | null>(null);
  const [terminada, setTerminada] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [obs, setObs] = useState<Record<string, Observacion>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [niveles, setNiveles] = useState<Record<string, number | null>>({});
  const [cambios, setCambios] = useState<LevelChange[]>([]);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [nivelPulse, setNivelPulse] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [urgencia, setUrgencia] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [vozEstado, setVozEstado] = useState<VozEstado>({ tts: false, stt: false });
  const [fase, setFase] = useState<EstadoLlamada>('inactiva');
  const [parcial, setParcial] = useState('');
  const [sigueAhi, setSigueAhi] = useState(false);
  const [sinRespuesta, setSinRespuesta] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<'ia' | 'ficha'>('ia');
  const [baseline, setBaseline] = useState<Record<string, ObsApi> | null>(null);
  const vozEstadoRef = useRef(vozEstado);
  const sesionRef = useRef<string | null>(null);
  const idRef = useRef(0);
  const llamada = useRef<Llamada | null>(null);
  if (llamada.current === null) {
    llamada.current = new Llamada({
      onEstado: setFase, onParcial: setParcial, onSigueAhi: setSigueAhi, onSinRespuesta: setSinRespuesta,
      onAviso: (m) => setAviso(m),
      enviar: async (t) => { const sid = sesionRef.current; if (sid) await enviarRespuesta(sid, t); },
    }, { ttsFish: () => vozEstadoRef.current.tts, sttFish: () => vozEstadoRef.current.stt });
  }
  const getNiveles = useCallback(() => ({ mic: llamada.current?.nivelMic() ?? 0, ia: llamada.current?.nivelIa() ?? 0 }), []);
  const obsRef = useRef<Record<string, Observacion>>({});
  const nivelRef = useRef<Nivel | null>(null);
  const t0 = useRef(0);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    getSalud().catch(() => setApiError(true));
    void getVozEstado().then(setVozEstado);
    getPersonasLive().then((p) => { setPersonas(p); setPersonaId(p[0]?.id ?? null); }).catch(() => setApiError(true));
    return () => { unsub.current?.(); llamada.current?.colgar(); };
  }, []);

  useEffect(() => { vozEstadoRef.current = vozEstado; }, [vozEstado]);
  const activa = sesion !== null && !terminada;
  useEffect(() => {
    if (!activa) return;
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [activa]);

  useEffect(() => {
    if (!Object.keys(flash).length) return;
    const t = setTimeout(() => setFlash({}), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  const onEvent = useCallback((e: LiveEvent) => {
    switch (e.type) {
      case 'turno_asistente':
        if (!e.data.sistema) llamada.current?.decir(e.data.texto);
        setMsgs((m) => [...m, { id: ++idRef.current, rol: 'asistente', texto: e.data.texto, acuse: e.data.acuse }]);
        break;
      case 'turno_persona':
        setMsgs((m) => [...m, { id: ++idRef.current, rol: 'persona', texto: e.data.texto }]);
        break;
      case 'clasificacion': {
        const d = e.data;
        if (d.aviso) setAviso(d.aviso);
        if (d.fuera_de_tema) {
          const tag = d.repregunta ? 'Fuera de tema · se repregunta' : 'Fuera de tema · seguimos adelante';
          setMsgs((m) => {
            const i = m.map((x) => x.rol).lastIndexOf('persona');
            return i < 0 ? m : m.map((x, k) => (k === i ? { ...x, fueraDeTema: tag } : x));
          });
        }
        break;
      }
      case 'nivel': {
        const d = e.data;
        if (d.nivel_actual !== nivelRef.current) {
          nivelRef.current = d.nivel_actual;
          setNivelPulse((n) => n + 1);
          if (d.nivel_actual !== null) {
            const lvl = d.nivel_actual, t = Math.floor((Date.now() - t0.current) / 1000);
            setCambios((c) => [...c, { nivel: lvl, t }]);
          }
        }
        setNivel(d.nivel_actual); setMotivo(d.motivo); setStats(d.stats); setNiveles(d.niveles_por_dimension);
        const next: Record<string, Observacion> = {}, changed: string[] = [];
        for (const o of d.observaciones) {
          next[o.indicador] = o;
          if (JSON.stringify(obsRef.current[o.indicador]) !== JSON.stringify(o)) changed.push(o.indicador);
        }
        obsRef.current = next;
        setObs(next);
        if (changed.length) {
          setOrder((prev) => [...changed.reverse(), ...prev.filter((c) => !changed.includes(c))]);
          setFlash((f) => ({ ...f, ...Object.fromEntries(changed.map((c) => [c, Date.now()])) }));
        }
        break;
      }
      case 'urgencia': setUrgencia(e.data.cita); llamada.current?.cerrarTrasHablar(); break;
      case 'fin': setTerminada(true); setStats(e.data.stats); llamada.current?.cerrarTrasHablar(); break;
    }
  }, []);

  async function iniciar() {
    if (personaId === null) return;
    const call = llamada.current as Llamada;
    void call.iniciar(); // sync part runs inside the click (audio unlock); tone + mic permission overlap the session setup
    setMuted(false);
    unsub.current?.();
    try {
      const f = await getPersona(personaId);
      setBaseline(Object.fromEntries(f.dimensiones.flatMap((d) => d.indicadores).map((o) => [o.indicador, o])));
    } catch { setBaseline(null); }
    setMsgs([]); setObs({}); setOrder([]); setNivel(null); setNiveles({}); setCambios([]); setMotivo(null);
    setStats(EMPTY_STATS); setUrgencia(null); setTerminada(false); setAviso(null); setSegundos(0);
    obsRef.current = {}; nivelRef.current = null; t0.current = Date.now();
    try {
      const r = await iniciarSesion(personaId, 'texto', 'arbol', false);
      sesionRef.current = r.sesion_id;
      setApiError(false); setSesion(r.sesion_id);
      unsub.current = suscribirEventos(r.sesion_id, onEvent);
    } catch { setApiError(true); call.colgar(); }
  }

  async function enviarTexto(t: string) {
    const sid = sesionRef.current;
    if (!sid || !t.trim()) return;
    setEnviando(true);
    try { await enviarRespuesta(sid, t.trim()); } catch { setAviso('No se pudo enviar la respuesta'); } finally { setEnviando(false); }
  }
  async function enviar() {
    if (!sesion || !texto.trim() || enviando) return;
    const t = texto.trim();
    setTexto('');
    await enviarTexto(t);
  }

  const persona = useMemo(() => personas.find((p) => p.id === personaId), [personas, personaId]);
  const ficha = useApi(() => (personaId === null ? Promise.resolve(null) : getPersona(personaId)), [personaId], { personaId: personaId ?? undefined });
  const fichaData: PersonaDetalleApi | null = ficha.data;

  function colgar() {
    llamada.current?.colgar();
    setTerminada(true);
    if (sesion) void terminarSesion(sesion).catch(() => undefined);
  }
  function alternarMute() { const m = !muted; setMuted(m); llamada.current?.silenciar(m); }
  function repetir() { llamada.current?.repetir(msgs.findLast((m) => m.rol === 'asistente')?.texto ?? ''); }

  return (
    <div className="ev-page">
      <div className="ev-top">
        <div>
          <h1>Llamada en vivo</h1>
          <p>Datos de demostración (sintéticos) · llamada automática simulada</p>
        </div>
        <select aria-label="Persona" value={personaId ?? ''} disabled={activa} onChange={(e) => setPersonaId(Number(e.target.value))}>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.preferred_name} · {p.age ?? '—'} años · {p.comuna ?? ''}</option>)}
        </select>
        <span className="ev-voz ev-muted">{vozEstado.tts ? 'Voz: Fish Audio' : 'Voz: navegador'} · {vozEstado.stt ? 'dictado: Fish' : 'dictado: navegador'}</span>
      </div>

      {apiError && <div role="alert" className="ev-notice">No se pudo conectar con la API en vivo. Inicie: uv run uvicorn src.api.app:app --port 8000</div>}
      {aviso && <div className="ev-notice">{aviso}</div>}
      {urgencia && <UrgentBanner cita={urgencia} />}

      <PersonaHeader persona={persona} activa={activa} terminada={terminada} segundos={segundos} />

      <div className="ev-grid">
        <ConversationPanel msgs={msgs} nombre={persona?.preferred_name ?? ''} estado={fase} segundos={segundos}
          texto={texto} onTexto={setTexto} onEnviar={() => void enviar()} enviando={enviando}
          puedeIniciar={personaId !== null && !apiError} onIniciar={() => void iniciar()} onColgar={colgar}
          muted={muted} onMute={alternarMute} getNiveles={getNiveles}
          parcial={parcial} sigueAhi={sigueAhi} sinRespuesta={sinRespuesta} onRepetir={repetir} />
        <div className="ev-right">
          <LevelHero nivel={nivel} motivo={motivo} cambios={cambios} pulse={nivelPulse} />
          <DimensionTiles obs={obs} niveles={niveles} flash={flash} order={order} />
          <StatsStrip stats={stats} obs={obs} />
          <div role="tablist" className="ev-tabs">
            <button role="tab" aria-selected={tab === 'ia'} onClick={() => setTab('ia')}>Lo que entiende la IA</button>
            <button role="tab" aria-selected={tab === 'ficha'} onClick={() => setTab('ficha')}>Ficha en vivo</button>
          </div>
          {tab === 'ia' ? <UnderstandingFeed obs={obs} order={order} flash={flash} />
            : <FichaEnVivo persona={fichaData} baseline={baseline} obs={obs} niveles={niveles} order={order} terminada={terminada} />}
        </div>
      </div>
    </div>
  );
}
