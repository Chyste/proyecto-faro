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
import { ColaVoz, Grabadora, escucharNavegador, getVozEstado, reconocimientoNavegador, sttFish, type VozEstado } from '../lib/voz';
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
  const [vozOn, setVozOn] = useState(() => { try { return localStorage.getItem('faro-voz') !== '0'; } catch { return true; } });
  const [vozEstado, setVozEstado] = useState<VozEstado>({ tts: false, stt: false });
  const [hablando, setHablando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [tab, setTab] = useState<'ia' | 'ficha'>('ia');
  const [baseline, setBaseline] = useState<Record<string, ObsApi> | null>(null);
  const grabadora = useRef(new Grabadora());
  const navegador = useRef<ReturnType<typeof escucharNavegador>>(null);
  const vozOnRef = useRef(vozOn);
  const vozEstadoRef = useRef(vozEstado);
  const sesionRef = useRef<string | null>(null);
  const idRef = useRef(0);
  const cola = useRef<ColaVoz | null>(null);
  if (cola.current === null) {
    cola.current = new ColaVoz(() => vozEstadoRef.current.tts, setHablando, (m) => setAviso(m));
  }
  const obsRef = useRef<Record<string, Observacion>>({});
  const nivelRef = useRef<Nivel | null>(null);
  const t0 = useRef(0);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    getSalud().catch(() => setApiError(true));
    void getVozEstado().then(setVozEstado);
    getPersonasLive().then((p) => { setPersonas(p); setPersonaId(p[0]?.id ?? null); }).catch(() => setApiError(true));
    return () => { unsub.current?.(); cola.current?.detener(); };
  }, []);

  useEffect(() => { vozOnRef.current = vozOn; if (!vozOn) cola.current?.detener(); try { localStorage.setItem('faro-voz', vozOn ? '1' : '0'); } catch { /* prefs only */ } }, [vozOn]);
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
        if (vozOnRef.current && !e.data.sistema) cola.current?.decir(e.data.texto);
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
      case 'urgencia': setUrgencia(e.data.cita); break;
      case 'fin': setTerminada(true); setStats(e.data.stats); break;
    }
  }, []);

  async function iniciar() {
    if (personaId === null) return;
    unsub.current?.(); cola.current?.detener();
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
    } catch { setApiError(true); }
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

  const escuchando = activa && !enviando && !hablando && msgs.at(-1)?.rol === 'asistente' && !urgencia;
  const persona = useMemo(() => personas.find((p) => p.id === personaId), [personas, personaId]);
  const ficha = useApi(() => (personaId === null ? Promise.resolve(null) : getPersona(personaId)), [personaId], { personaId: personaId ?? undefined });
  const fichaData: PersonaDetalleApi | null = ficha.data;

  /** Push-to-talk: Fish STT when available, else the browser's Web Speech, else the user types. */
  async function hablar() {
    if (!activa || enviando || hablando) return;
    if (grabando) {
      setGrabando(false);
      if (navegador.current) {
        const n = navegador.current; navegador.current = null; n.parar();
        const t = (await n.texto).trim(); if (t) await enviarTexto(t); else setAviso('No se entendió el audio; escriba la respuesta');
        return;
      }
      setTranscribiendo(true);
      try {
        const blob = await grabadora.current.detener();
        const t = (await sttFish(blob)).trim();
        if (t) await enviarTexto(t); else setAviso('No se entendió el audio; intente de nuevo o escriba');
      } catch { setAviso('No se pudo transcribir el audio; escriba la respuesta'); } finally { setTranscribiendo(false); }
      return;
    }
    cola.current?.detener();
    if (vozEstado.stt && Grabadora.disponible()) {
      try { await grabadora.current.iniciar(); setGrabando(true); } catch { setAviso('No hay permiso para usar el micrófono; escriba la respuesta'); }
    } else if (reconocimientoNavegador()) {
      navegador.current = escucharNavegador(); setGrabando(true);
    } else setAviso('Este navegador no permite dictado; escriba la respuesta');
  }

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
        <label className="ev-voz" title={vozEstado.tts ? 'Voz de Fish Audio' : 'Sin Fish Audio: se usa la voz del navegador'}>
          <input type="checkbox" checked={vozOn} onChange={(e) => setVozOn(e.target.checked)} /> Voz activada
          <small className="ev-muted">{vozEstado.tts ? '(Fish Audio)' : '(voz del navegador)'}</small>
        </label>
        <button onClick={iniciar} disabled={personaId === null || activa} className="ev-btn-dark">Iniciar llamada</button>
      </div>

      {apiError && <div role="alert" className="ev-notice">No se pudo conectar con la API en vivo. Inicie: uv run uvicorn src.api.app:app --port 8000</div>}
      {aviso && <div className="ev-notice">{aviso}</div>}
      {urgencia && <UrgentBanner cita={urgencia} />}

      <PersonaHeader persona={persona} activa={activa} terminada={terminada} segundos={segundos} />

      <div className="ev-grid">
        <ConversationPanel msgs={msgs} nombre={persona?.preferred_name ?? ''} activa={activa} terminada={terminada}
          escuchando={escuchando} texto={texto} onTexto={setTexto} onEnviar={() => void enviar()} enviando={enviando}
          onTerminar={() => sesion && void terminarSesion(sesion)}
          hablando={hablando} grabando={grabando} transcribiendo={transcribiendo} onHablar={() => void hablar()}
          hablarOk={vozEstado.stt || !!reconocimientoNavegador()} />
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
