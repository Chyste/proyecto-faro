import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Calling02Icon,
  Home01Icon,
  ListViewIcon,
  MapsLocation01Icon,
  Notification03Icon,
  RefreshIcon,
  Settings02Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { useFaro } from '../../state/FaroStore';
import { useActions } from '../actions/ActionModals';
import { getPersonas } from '../../data/syntheticData';
import { nivelDe } from '../../lib/faro';
import lockup from '../../assets/faro-lockup.svg';
import mark from '../../assets/faro-mark.svg';

const COLLAPSE_KEY = 'faro-sidebar-collapsed';
export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}
export function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

type Badge = 'alerts' | 'live';
interface Item { to: string; label: string; icon: IconSvgElement; badge?: Badge }
const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Seguimiento',
    items: [
      { to: '/', label: 'Hoy', icon: Home01Icon },
      { to: '/alertas', label: 'Alertas', icon: Notification03Icon, badge: 'alerts' },
      { to: '/personas', label: 'Personas', icon: UserGroupIcon },
    ],
  },
  {
    title: 'Llamadas',
    items: [
      { to: '/en-vivo', label: 'Llamada en vivo', icon: Calling02Icon, badge: 'live' },
      { to: '/seguimiento', label: 'Llamadas y decisiones', icon: ListViewIcon },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/geografico', label: 'Territorio', icon: MapsLocation01Icon },
      { to: '/configuracion', label: 'Configuración', icon: Settings02Icon },
    ],
  },
];

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-soft';

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const { state, dispatch } = useFaro();
  const { toast } = useActions();

  const alerts = useMemo(() => {
    const open = getPersonas().filter((p) => nivelDe(p) >= 2 && state.byId[p.id]?.estadoRevision !== 'revisado');
    return { count: open.length, critical: open.some((p) => nivelDe(p) === 3) };
  }, [state]);

  return (
    <aside
      className={`fixed top-0 left-0 z-40 flex h-screen flex-col bg-surface-soft pt-6 pb-4 transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px] px-3' : 'w-[248px] px-4'
      }`}
    >
      <div className={`flex flex-col gap-2 pb-5 ${collapsed ? 'items-center' : 'px-2'}`}>
        {collapsed ? (
          <img src={mark} alt="FARO" className="h-9 w-9" />
        ) : (
          <>
            <img src={lockup} alt="FARO" className="h-10 w-auto self-start" />
            <p className="text-[12px] leading-4 text-muted">Acompañamiento que llega a tiempo</p>
            <span className="mt-1 self-start rounded-full bg-l1-bg px-2.5 py-0.5 text-[11px] font-medium text-l1-fg">
              Datos de demostración
            </span>
          </>
        )}
      </div>

      <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-3 mb-1 h-px bg-hairline" aria-hidden />
            ) : (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{g.title}</p>
            )}
            {g.items.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              const showAlerts = item.badge === 'alerts' && alerts.count > 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={`group relative flex items-center rounded-[10px] py-2.5 text-[14px] transition-colors duration-150 ${ring} ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${active ? 'bg-surface-strong font-semibold text-ink' : 'font-medium text-body hover:bg-surface-strong/70 hover:text-ink'}`}
                >
                  {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-brand" />}
                  <span className="relative flex">
                    <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.5} />
                    {collapsed && showAlerts && (
                      <span aria-hidden className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${alerts.critical ? 'bg-l3-fg' : 'bg-l2-fg'}`} />
                    )}
                    {collapsed && item.badge === 'live' && (
                      <span aria-hidden className="live-dot absolute -top-1 -right-1 h-2 w-2 rounded-full bg-l0-fg" />
                    )}
                  </span>
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && showAlerts && (
                    <span
                      aria-label={`${alerts.count} alertas abiertas de nivel 2 o más`}
                      className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                        alerts.critical ? 'bg-l3-bg text-l3-fg' : 'bg-l2-bg text-l2-fg'
                      }`}
                    >
                      {alerts.count}
                    </span>
                  )}
                  {!collapsed && item.badge === 'live' && (
                    <span className="flex items-center gap-1.5 rounded-full bg-l0-bg px-2 py-0.5 text-[11px] font-semibold text-l0-fg">
                      <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-l0-fg" />
                      En vivo
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 pt-3">
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'reset' });
            toast('Demo restablecida');
          }}
          title={collapsed ? 'Restablecer demo' : undefined}
          aria-label="Restablecer demo"
          className={`flex items-center rounded-[10px] py-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-surface-strong hover:text-ink ${ring} ${
            collapsed ? 'justify-center' : 'gap-2.5 px-3'
          }`}
        >
          <HugeiconsIcon icon={RefreshIcon} size={18} strokeWidth={1.5} />
          {!collapsed && 'Restablecer demo'}
        </button>

        <div className={`flex items-center rounded-[12px] border border-hairline-soft bg-canvas ${collapsed ? 'justify-center p-2' : 'gap-3 p-2.5'}`} title={collapsed ? 'Camila Rojas · Monitora OAM · San Joaquín' : undefined}>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">CR</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">Camila Rojas</p>
              <p className="truncate text-[12px] leading-4 text-muted">Monitora OAM · San Joaquín</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          title={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          className={`flex items-center rounded-[10px] py-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-surface-strong hover:text-ink ${ring} ${
            collapsed ? 'justify-center' : 'gap-2.5 px-3'
          }`}
        >
          <HugeiconsIcon icon={collapsed ? SidebarRightIcon : SidebarLeftIcon} size={18} strokeWidth={1.5} />
          {!collapsed && 'Contraer'}
        </button>
      </div>
    </aside>
  );
}
