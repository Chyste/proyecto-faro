import { useEffect, useRef } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import { Waveform } from './viz';
import { initials } from './liveModel';

export type Msg = { id: number; rol: 'asistente' | 'persona'; texto: string; acuse?: string; fueraDeTema?: string };

interface Props {
  msgs: Msg[]; nombre: string; activa: boolean; terminada: boolean; escuchando: boolean; texto: string;
  onTexto: (t: string) => void; onEnviar: () => void; onTerminar: () => void; enviando: boolean;
  hablando?: boolean; grabando?: boolean; transcribiendo?: boolean; onHablar?: () => void; hablarOk?: boolean;
}

export default function ConversationPanel(p: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [p.msgs, p.terminada, p.escuchando]);
  return (
    <section className="ev-card ev-chat">
      <div className="ev-card-head">Conversación</div>
      <div className="ev-chat-body" aria-live="polite">
        {p.msgs.length === 0 && <p className="ev-empty">Inicie una llamada para ver la conversación en vivo.</p>}
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
        {p.hablando && <Waveform label="Hablando…" />}
        {p.grabando && <Waveform label="Escuchando a la persona…" />}
        {p.transcribiendo && <Waveform label="Transcribiendo…" />}
        {p.escuchando && !p.hablando && !p.grabando && !p.transcribiendo && <Waveform />}
        {p.terminada && <p className="ev-empty ev-center">Llamada terminada</p>}
        <div ref={end} />
      </div>
      <form className="ev-compose" onSubmit={(e) => { e.preventDefault(); p.onEnviar(); }}>
        <input value={p.texto} onChange={(e) => p.onTexto(e.target.value)} disabled={!p.activa || p.enviando}
          placeholder="Escriba la respuesta de la persona…" aria-label="Respuesta de la persona" />
        <button type="submit" className="ev-btn-dark" disabled={!p.activa || !p.texto.trim() || p.enviando}>
          <Send className="size-4" aria-hidden />Enviar</button>
        {p.activa && p.hablarOk && (
          <button type="button" className="ev-btn-hablar" aria-pressed={!!p.grabando} onClick={p.onHablar}
            disabled={p.hablando || p.transcribiendo || p.enviando} title="Pulse para hablar y pulse de nuevo para enviar">
            {p.grabando ? <Square className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}{p.grabando ? 'Detener' : 'Hablar'}
          </button>
        )}
        {p.activa && <button type="button" className="ev-btn-ghost" onClick={p.onTerminar}>Terminar</button>}
      </form>
    </section>
  );
}
