import { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Send } from 'lucide-react';
import CallStage, { type Niveles } from './CallStage';
import { initials, mmss } from './liveModel';
import type { EstadoLlamada } from '../../lib/llamada';

export type Msg = { id: number; rol: 'asistente' | 'persona'; texto: string; acuse?: string; fueraDeTema?: string };

const ESTADO_LABEL: Record<EstadoLlamada, string> = {
  inactiva: 'Lista para llamar', llamando: 'Llamando…', en_llamada: 'En llamada', hablando: 'Hablando el asistente',
  escuchando: 'Escuchando', pensando: 'Pensando…', finalizada: 'Llamada finalizada',
};

interface Props {
  msgs: Msg[]; nombre: string; estado: EstadoLlamada; segundos: number; texto: string; enviando: boolean;
  onTexto: (t: string) => void; onEnviar: () => void;
  puedeIniciar: boolean; onIniciar: () => void; onColgar: () => void;
  muted: boolean; onMute: () => void; getNiveles: () => Niveles;
  parcial: string; sigueAhi: boolean; sinRespuesta: boolean; onRepetir: () => void;
}

export default function ConversationPanel(p: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [p.msgs, p.estado, p.parcial]);
  const activa = p.estado !== 'inactiva' && p.estado !== 'finalizada';
  return (
    <section className="ev-card ev-chat">
      <div className="ev-card-head ev-call-head">
        <span>Conversación</span>
        <span className={`ev-chip-state ev-chip-state-${p.estado}`} role="status">
          {(p.estado === 'escuchando' || p.estado === 'hablando') && <span className="ev-pulse" aria-hidden />}{ESTADO_LABEL[p.estado]}
        </span>
        {activa && <span className="ev-call-timer" aria-label="Duración">{mmss(p.segundos)}</span>}
        {activa && (
          <span className="ev-call-actions">
            <button type="button" className="ev-btn-ghost ev-icon-btn" aria-pressed={p.muted} onClick={p.onMute}
              title={p.muted ? 'Activar micrófono' : 'Silenciar micrófono'} aria-label={p.muted ? 'Activar micrófono' : 'Silenciar micrófono'}>
              {p.muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
            </button>
            <button type="button" className="ev-btn-dark" onClick={p.onColgar}><PhoneOff className="size-4" aria-hidden />Colgar</button>
          </span>
        )}
      </div>

      <CallStage nombre={p.nombre} estado={p.estado} getNiveles={p.getNiveles} />

      {!activa && (
        <div className="ev-start">
          <button type="button" className="ev-btn-dark ev-btn-big" onClick={p.onIniciar} disabled={!p.puedeIniciar}>
            <Phone className="size-5" aria-hidden />{p.estado === 'finalizada' ? 'Nueva llamada' : 'Iniciar llamada'}</button>
          <p className="ev-empty">Manos libres: el asistente habla y luego escucha solo.</p>
        </div>
      )}

      <div className="ev-chat-body" aria-live="polite">
        {p.msgs.map((m) => (
          <div key={m.id} className={`ev-row ev-bubble-in ${m.rol === 'persona' ? 'ev-row-persona' : ''}`}>
            <div className={`ev-avatar ${m.rol === 'asistente' ? 'ev-avatar-ia' : ''}`} aria-hidden>
              {m.rol === 'asistente' ? 'IA' : initials(p.nombre || 'P')}
            </div>
            <div className="ev-stack">
              <div className={`ev-bubble ${m.rol === 'persona' ? 'ev-bubble-persona' : 'ev-bubble-ia'}`}>
                {m.acuse && <span className="ev-ack">{m.acuse} </span>}
                {m.acuse ? m.texto.slice(m.acuse.length).trimStart() : m.texto}
              </div>
              {m.fueraDeTema && <span className="ev-tag">{m.fueraDeTema}</span>}
            </div>
          </div>
        ))}
        {p.parcial && (p.estado === 'escuchando' || p.estado === 'pensando') && (
          <p className="ev-caption" aria-live="off">{p.parcial === '…' ? 'Transcribiendo…' : `${p.parcial}…`}</p>
        )}
        {p.sigueAhi && p.estado === 'escuchando' && <p className="ev-hint">¿Sigue ahí?</p>}
        {p.sinRespuesta && (
          <div className="ev-hint">
            <span>No se escuchó respuesta.</span>
            <button type="button" className="ev-btn-ghost" onClick={p.onRepetir}>Repetir pregunta</button>
          </div>
        )}
        {p.estado === 'finalizada' && <p className="ev-empty ev-center">Llamada finalizada</p>}
        <div ref={end} />
      </div>

      <form className="ev-compose ev-compose-small" onSubmit={(e) => { e.preventDefault(); p.onEnviar(); }}>
        <input value={p.texto} onChange={(e) => p.onTexto(e.target.value)} disabled={!activa || p.enviando}
          placeholder="O escriba la respuesta de la persona…" aria-label="Respuesta de la persona" />
        <button type="submit" className="ev-btn-ghost" disabled={!activa || !p.texto.trim() || p.enviando} aria-label="Enviar">
          <Send className="size-4" aria-hidden /></button>
      </form>
    </section>
  );
}
