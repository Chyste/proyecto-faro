import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ConversationPanel, { type Msg } from '../components/live/ConversationPanel';
import DimensionTiles from '../components/live/DimensionTiles';
import LevelHero, { type LevelChange } from '../components/live/LevelHero';
import PersonaHeader from '../components/live/PersonaHeader';
import StatsStrip from '../components/live/StatsStrip';
import UnderstandingFeed from '../components/live/UnderstandingFeed';
import UrgentBanner from '../components/live/UrgentBanner';
import {
  enviarRespuesta, getPersonasLive, getSalud, iniciarSesion, suscribirEventos, terminarSesion,
  type LiveEvent, type Nivel, type Observacion, type PersonaLive, type Stats,
} from '../lib/liveApi';
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
  const idRef = useRef(0);
  const obsRef = useRef<Record<string, Observacion>>({});
  const nivelRef = useRef<Nivel | null>(null);
  const t0 = useRef(0);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    getSalud().catch(() => setApiError(true));
    getPersonasLive().then((p) => { setPersonas(p); setPersonaId(p[0]?.id ?? null); }).catch(() => setApiError(true));
    return () => unsub.current?.();
  }, []);

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
    unsub.current?.();
    setMsgs([]); setObs({}); setOrder([]); setNivel(null); setNiveles({}); setCambios([]); setMotivo(null);
    setStats(EMPTY_STATS); setUrgencia(null); setTerminada(false); setAviso(null); setSegundos(0);
    obsRef.current = {}; nivelRef.current = null; t0.current = Date.now();
    try {
      const r = await iniciarSesion(personaId, 'texto', 'arbol', false);
      setApiError(false); setSesion(r.sesion_id);
      unsub.current = suscribirEventos(r.sesion_id, onEvent);
    } catch { setApiError(true); }
  }

  async function enviar() {
    if (!sesion || !texto.trim() || enviando) return;
    const t = texto.trim();
    setTexto(''); setEnviando(true);
    try { await enviarRespuesta(sesion, t); } catch { setAviso('No se pudo enviar la respuesta'); } finally { setEnviando(false); }
  }

  const escuchando = activa && !enviando && msgs.at(-1)?.rol === 'asistente' && !urgencia;
  const persona = useMemo(() => personas.find((p) => p.id === personaId), [personas, personaId]);

  return (
    <div className="ev-page">
      <div className="ev-top">
        <div>
          <h1>Llamada en vivo</h1>
          <p>Datos de demostración (sintéticos)</p>
        </div>
        <select aria-label="Persona" value={personaId ?? ''} disabled={activa} onChange={(e) => setPersonaId(Number(e.target.value))}>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.preferred_name} · {p.age ?? '—'} años · {p.comuna ?? ''}</option>)}
        </select>
        <button onClick={iniciar} disabled={personaId === null || activa} className="ev-btn-dark">Iniciar llamada</button>
      </div>

      {apiError && <div role="alert" className="ev-notice">No se pudo conectar con la API en vivo. Inicie: uv run uvicorn src.api.app:app --port 8000</div>}
      {aviso && <div className="ev-notice">{aviso}</div>}
      {urgencia && <UrgentBanner cita={urgencia} />}

      <PersonaHeader persona={persona} activa={activa} terminada={terminada} segundos={segundos} />

      <div className="ev-grid">
        <ConversationPanel msgs={msgs} nombre={persona?.preferred_name ?? ''} activa={activa} terminada={terminada}
          escuchando={escuchando} texto={texto} onTexto={setTexto} onEnviar={() => void enviar()} enviando={enviando}
          onTerminar={() => sesion && void terminarSesion(sesion)} />
        <div className="ev-right">
          <LevelHero nivel={nivel} motivo={motivo} cambios={cambios} pulse={nivelPulse} />
          <DimensionTiles obs={obs} niveles={niveles} flash={flash} order={order} />
          <StatsStrip stats={stats} obs={obs} />
          <UnderstandingFeed obs={obs} order={order} flash={flash} />
        </div>
      </div>
    </div>
  );
}
