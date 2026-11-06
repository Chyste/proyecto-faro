import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPersonas } from '../data/syntheticData';
import type { Control, Persona } from '../data/types';
import { useActions } from '../components/actions/ActionModals';
import { usePersonaState, fechaHora, tipoLabel, decisionTexto, proximaLlamada } from '../state/FaroStore';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import {
  addDays,
  fechaCorta,
  nivelDe,
  NIVEL_TO_LEVEL,
  primerNombre,
  SEVERIDAD_TO_LEVEL,
  type Level,
} from '../lib/faro';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const FG: Record<Level, string> = { 0: 'var(--color-l0-fg)', 1: 'var(--color-l1-fg)', 2: 'var(--color-l2-fg)', 3: 'var(--color-l3-fg)' };
const BG: Record<Level, string> = { 0: 'var(--color-l0-bg)', 1: 'var(--color-l1-bg)', 2: 'var(--color-l2-bg)', 3: 'var(--color-l3-bg)' };

const DIMS = [
  { key: 'aislamiento', label: 'Aislamiento social', doms: ['aislamiento', 'aislamiento_social'] },
  { key: 'funcional', label: 'Deterioro funcional', doms: ['funcional', 'movilidad_autonomia', 'caidas'] },
  { key: 'medicacion', label: 'Medicamentos y tratamientos', doms: ['medicacion', 'medicamentos'] },
  { key: 'emocional', label: 'Salud emocional y cognitiva', doms: ['emocional_cognitiva', 'bienestar_emocional'] },
  { key: 'seguridad', label: 'Seguridad y emergencias', doms: ['seguridad'] },
] as const;

type Dim = (typeof DIMS)[number];

/** Level of a dimension on a given day: null = no call that day (no data). */
function dimLevelOn(p: Persona, d: Dim, day: string, controlDays: Set<string>): Level | null {
  if (!controlDays.has(day)) return null;
  const sev = p.senales.filter((s) => s.fecha === day && (d.doms as readonly string[]).includes(s.dominio));
  return sev.reduce<Level>((m, s) => Math.max(m, SEVERIDAD_TO_LEVEL[s.severidad]) as Level, 0);
}

function dimSummary(p: Persona, d: Dim, ultima: string) {
  const from = addDays(ultima, -4);
  const doms = d.doms as readonly string[];
  const senales = p.senales
    .filter((s) => doms.includes(s.dominio))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const win = senales.filter((s) => s.fecha >= from && s.fecha <= ultima);
  const level = win.reduce<Level>((m, s) => Math.max(m, SEVERIDAD_TO_LEVEL[s.severidad]) as Level, 0);
  const ctrl = p.historialControles.at(-1);
  const resp = ctrl?.respuestas.find((r) => doms.includes(r.dominio));
  const raw = win[0]?.descripcion;
  const quote = raw ? raw.slice(raw.indexOf(': ') + 2) : resp?.respuesta;
  const status = win.length
    ? `${win.length} ${win.length === 1 ? 'señal' : 'señales'} en los últimos 5 días`
    : 'Sin señales en los últimos 5 días';
  const fuente = raw ? win[0].fecha : ctrl?.fecha;
  return { level, status, quote, fuente };
}

function Sparkline({ values }: { values: (Level | null)[] }) {
  const step = 37;
  const x = (i: number) => 15 + i * step;
  const y = (l: Level) => 22 - l * 6;
  return (
    <svg width={518} height={26} className="shrink-0" role="img" aria-label="Evolución por dimensión">
      <line x1={x(0)} x2={x(13)} y1={22} y2={22} stroke="var(--color-hairline-soft)" />
      {values.map((v, i) => {
        const prev = i > 0 ? values[i - 1] : null;
        return v !== null && prev !== null ? (
          <line key={`l${i}`} x1={x(i - 1)} y1={y(prev)} x2={x(i)} y2={y(v)} stroke="var(--color-muted)" strokeWidth={1.5} />
        ) : null;
      })}
      {values.map((v, i) =>
        v === null ? (
          <circle key={i} cx={x(i)} cy={22} r={2.5} fill="white" stroke="var(--color-muted)" />
        ) : (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={FG[v]} />
        ),
      )}
    </svg>
  );
}

function enNivelDesde(controles: Control[]): string | null {
  const last = controles.at(-1);
  if (!last) return null;
  let since = last.fecha;
  for (let i = controles.length - 2; i >= 0 && controles[i].nivelResultante === last.nivelResultante; i--) since = controles[i].fecha;
  return `En nivel ${NIVEL_TO_LEVEL[last.nivelResultante]} desde el ${fechaCorta(since)}.`;
}

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'red', label: 'Red de apoyo' },
  { key: 'pref', label: 'Preferencias y consentimiento' },
  { key: 'salud', label: 'Salud*' },
  { key: 'actividad', label: 'Actividad' },
] as const;

const ESTADO_LABEL = { pendiente: 'Pendiente', en_revision: 'En revisión', revisado: 'Revisado', derivado: 'Derivado' } as const;

function Row2({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-4 border-t border-hairline-soft py-2.5 first:border-t-0">
      <span className="w-[200px] shrink-0 text-[13px] text-muted">{k}</span>
      <span className="flex-1 text-[14px] leading-[20px] text-ink">{v && v.trim() ? v : '—'}</span>
    </div>
  );
}

const OutlineBtn = ({ children, onClick }: { children: string; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-full border border-ink bg-canvas px-6 py-3 text-[14px] font-semibold whitespace-nowrap text-ink">
    {children}
  </button>
);

export default function PersonaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const personas = useMemo(() => getPersonas(), []);
  const p = personas.find((x) => x.id === id) ?? personas[0];
  const ps = usePersonaState(p?.id ?? '');
  const { open } = useActions();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('resumen');

  if (!p) {
    return (
      <main className="p-8">
        <p>Persona no encontrada.</p>
        <Link to="/personas" className="mt-4 inline-block underline">
          Volver al listado
        </Link>
      </main>
    );
  }

  const controles = p.historialControles;
  const ultima = controles.at(-1)?.fecha ?? p.fechaUltimoControl;
  const days = Array.from({ length: 14 }, (_, i) => addDays(ultima, i - 13));
  const byDay = new Map(controles.map((c) => [c.fecha, c]));
  const controlDays = new Set(byDay.keys());
  const seguimientoDesde = controles[0]?.fecha;
  const motivo = controles.at(-1)?.resumen;
  const recientes = [...controles].reverse().slice(0, 4);

  return (
    <main className="flex flex-col gap-[18px] px-8 py-6">
      <div className="flex items-center">
        <p className="text-[13px] text-muted">
          <Link to="/personas" className="hover:underline">
            Personas
          </Link>{' '}
          / {p.nombre}
        </p>
        <div className="flex-1" />
        <DemoPill />
      </div>

      <section className={`flex flex-col gap-4 p-5 ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hairline-soft text-[22px] font-semibold text-ink">
            {p.nombre[0]}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-[22px] font-bold leading-tight text-ink">
              {p.nombre} · {p.edad} años · {p.comuna}
            </h1>
            <p className="text-[13px] text-muted">
              Responsable: {ps.responsable ? primerNombre(ps.responsable) : 'Sin asignar'} &nbsp;·&nbsp; Próxima llamada automática:{' '}
              {proximaLlamada(ps.frecuencia)} &nbsp;·&nbsp; Revisión: {ESTADO_LABEL[ps.estadoRevision]}
              {ps.pausado ? ' · Seguimiento pausado' : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            {!ps.responsable && <OutlineBtn onClick={() => open('asignar', p.id)}>Asignarme</OutlineBtn>}
            <button
              type="button"
              onClick={() => open('transcripcion', p.id)}
              className="rounded-full bg-ink px-6 py-3 text-[14px] font-semibold whitespace-nowrap text-white"
            >
              Revisar transcripción
            </button>
            <OutlineBtn onClick={() => open('derivar', p.id)}>Derivar</OutlineBtn>
            <OutlineBtn onClick={() => open('cerrar', p.id)}>Cerrar con decisión</OutlineBtn>
          </div>
        </div>
        <hr className="border-hairline-soft" />
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium text-muted">Nivel actual</span>
          <LevelBadge level={nivelDe(p)} />
          <p className="flex-1 text-[13px] leading-[19px] text-body">
            {motivo ? `Motivo: ${motivo} ` : ''}
            {enNivelDesde(controles) ?? ''}
          </p>
          <span className="text-[11px] whitespace-nowrap text-muted">Reglas explícitas · sin IA</span>
        </div>
        {ps.cierre && (
          <p className="rounded-[10px] bg-surface-soft px-3 py-2 text-[13px] text-body">
            Cerrado como «{ps.cierre.resultado}» por {ps.cierre.autor} el {fechaHora(ps.cierre.fecha)}. Nota: {ps.cierre.nota} (el nivel calculado se mantiene).
          </p>
        )}
        {nivelDe(p) === 3 && <p className="anim-ring-l3 rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] font-medium text-l3-fg">Situación de riesgo · Activación simulada del protocolo. Revisa la transcripción y decide.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-muted">Más decisiones</span>
          <OutlineBtn onClick={() => open('contacto', p.id)}>Avisar a contacto de confianza</OutlineBtn>
          <OutlineBtn onClick={() => open('llamadaHumana', p.id)}>Solicitar llamada humana del equipo</OutlineBtn>
          <OutlineBtn onClick={() => open('frecuencia', p.id)}>Ajustar frecuencia de llamadas automáticas</OutlineBtn>
        </div>
      </section>

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-[14px] font-medium ${tab === t.key ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink hover:bg-surface-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'red' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-2 text-[16px] font-semibold text-ink">Red de apoyo</h2>
          <Row2 k="Contacto de confianza" v={p.contactoEmergencia} />
          <Row2 k="Vive sola" v="—" />
          <Row2 k="Apoyo" v={p.red_apoyo_base} />
          <Row2 k="Autonomía base" v={p.autonomia_base} />
          <Row2 k="Observaciones" v={p.observaciones} />
        </section>
      )}

      {tab === 'pref' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-2 text-[16px] font-semibold text-ink">Preferencias y consentimiento</h2>
          <Row2 k="Horario preferido" v="—" />
          <Row2 k="Canal" v="Llamada automática de voz (simulada)" />
          <Row2 k="Consentimiento vigente" v={`Sí · registrado el ${fechaCorta(p.fechaRegistro)}`} />
          <Row2 k="Intereses" v={p.intereses?.join(', ')} />
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={ps.pausado} onClick={() => open('pausar', p.id)} className="rounded-full border border-ink bg-canvas px-5 py-2.5 text-[14px] font-semibold text-ink disabled:opacity-40">
              {ps.pausado ? 'Seguimiento pausado' : 'Pausar seguimiento'}
            </button>
            <span className="text-[12px] text-muted">Queda registrado quién, cuándo y por qué.</span>
          </div>
        </section>
      )}

      {tab === 'salud' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-1 text-[16px] font-semibold text-ink">Salud*</h2>
          <p className="mb-2 text-[12px] text-muted">* Visible según habilitación.</p>
          <Row2 k="En tratamiento" v={p.medicamentos?.length ? 'Sí' : p.medicamentos ? 'No' : undefined} />
          {p.medicamentos && p.medicamentos.length > 0 ? (
            p.medicamentos.map((m) => <Row2 key={m.name} k="Medicamento declarado" v={`${m.name} (${m.source}, ${fechaCorta(m.verified_at)})`} />)
          ) : (
            <Row2 k="Medicamentos declarados" v="—" />
          )}
        </section>
      )}

      {tab === 'actividad' && (
        <section className={`flex flex-col gap-3 p-5 ${card}`}>
          <h2 className="text-[16px] font-semibold text-ink">Actividad</h2>
          {ps.acciones.length === 0 && <p className="text-[13px] text-muted">Aún no hay decisiones humanas registradas.</p>}
          {ps.acciones.map((a) => (
            <div key={a.id} className="border-t border-hairline-soft pt-3 first:border-t-0 first:pt-0">
              <p className="text-[13px] font-semibold text-ink">
                {tipoLabel(a.tipo)}
                {a.resultado ? ` · ${a.resultado}` : ''}
                {a.destino ? ` · ${a.destino}` : ''}
              </p>
              <p className="text-[12px] text-muted">{fechaHora(a.fecha)}</p>
              <p className="text-[13px] text-body">{decisionTexto(a)}</p>
            </div>
          ))}
        </section>
      )}

      {tab === 'resumen' && (<>
      <h2 className="text-[16px] font-semibold text-ink">Cinco dimensiones · última llamada automática, {fechaCorta(ultima)}</h2>
      <div className="grid grid-cols-5 gap-4">
        {DIMS.map((d) => {
          const s = dimSummary(p, d, ultima);
          return (
            <article key={d.key} className={`flex flex-col gap-2.5 p-4 ${card}`}>
              <h3 className="text-[13px] font-semibold text-ink">{d.label}</h3>
              <LevelBadge level={s.level} className="self-start" />
              <p className="text-[13px] leading-[19px] text-body">{s.status}</p>
              <div className="rounded-lg bg-surface-soft p-2.5 text-[12px] leading-[17px] text-body">
                {s.quote ? `«${s.quote}»` : '—'}
              </div>
              <p className="text-[11px] leading-[14px] text-muted">
                Fuente: llamada automática{s.fuente ? ` · ${fechaCorta(s.fuente)}` : ''}
              </p>
            </article>
          );
        })}
      </div>

      <div className="flex items-start gap-4">
        <section className={`flex min-w-0 flex-1 flex-col gap-3 p-5 ${card}`}>
          <h2 className="text-[16px] font-semibold text-ink">
            Evolución · últimos 14 días ({fechaCorta(days[0])} – {fechaCorta(days[13])})
          </h2>
          <div className="flex items-center">
            <span className="w-[172px] shrink-0 text-[13px] font-medium text-ink">Nivel general</span>
            <div className="flex gap-[7px]">
              {days.map((day) => {
                const c = byDay.get(day);
                const l = c ? NIVEL_TO_LEVEL[c.nivelResultante] : null;
                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    {l === null ? (
                      <div className="flex size-[30px] items-center justify-center rounded-lg border border-dashed border-muted bg-surface-soft text-[13px] font-semibold text-muted">
                        –
                      </div>
                    ) : (
                      <div
                        className="flex size-[30px] items-center justify-center rounded-lg border border-solid text-[13px] font-semibold"
                        style={{ background: BG[l], color: FG[l], borderColor: FG[l] }}
                        title={`Nivel ${l}`}
                      >
                        {l}
                      </div>
                    )}
                    <span className="text-[10px] text-muted">{Number(day.slice(8))}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-muted">Por dimensión (altura = nivel 0 a 3)</p>
            {DIMS.map((d) => (
              <div key={d.key} className="flex items-center">
                <span className="w-[172px] shrink-0 text-[12px] text-body">{d.label}</span>
                <Sparkline values={days.map((day) => dimLevelOn(p, d, day, controlDays))} />
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-[15px] text-muted">
            Número = nivel de atención (0 habitual · 1 preventiva · 2 prioritaria · 3 urgente). Punteado = sin dato
            {seguimientoDesde ? `: el seguimiento comenzó el ${fechaCorta(seguimientoDesde)}` : ''}; un hueco nunca se lee como mejoría ni como
            alarma. El nivel por dimensión se deriva de las señales registradas ese día.
          </p>
        </section>

        <section className={`flex w-[400px] shrink-0 flex-col gap-3 p-5 ${card}`}>
          <h2 className="text-[16px] font-semibold text-ink">Llamadas automáticas recientes</h2>
          {recientes.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-2.5 ${i > 0 ? 'border-t border-hairline-soft pt-3' : ''}`}>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-ink">{fechaCorta(c.fecha)} 10:00 · Llamada automática</span>
                <span className="text-[12px] text-muted">
                  Completada · {c.duracion} min · {c.respuestas.length} respuestas
                </span>
              </div>
              <LevelBadge level={NIVEL_TO_LEVEL[c.nivelResultante]} />
            </div>
          ))}
          <p className="border-t border-hairline-soft pt-3 text-[12px] text-muted">Próxima llamada automática: {proximaLlamada(ps.frecuencia)}</p>
        </section>
      </div>
      </>)}
    </main>
  );
}
