import { NavLink, useLocation } from 'react-router-dom';
import { useFaro } from '../../state/FaroStore';
import { useActions } from '../actions/ActionModals';

const navItems = [
  { to: '/', label: 'Hoy' },
  { to: '/en-vivo', label: 'Llamada en vivo' },
  { to: '/alertas', label: 'Alertas' },
  { to: '/personas', label: 'Personas' },
  { to: '/seguimiento', label: 'Llamadas y decisiones' },
  { to: '/geografico', label: 'Territorio' },
  { to: '/configuracion', label: 'Configuración' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { dispatch } = useFaro();
  const { toast } = useActions();
  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-[220px] flex-col gap-1 bg-surface-soft px-4 pt-7 pb-6">
      <div className="flex flex-col gap-0.5 px-3 pb-5">
        <p className="text-[24px] font-bold leading-none text-ink">FARO</p>
        <p className="text-[12px] leading-4 text-muted">Seguimiento de personas mayores</p>
      </div>
      {navItems.map((item) => {
        const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`rounded-[10px] px-3.5 py-[11px] text-[14px] ${
              active ? 'bg-hairline-soft font-semibold text-ink' : 'font-medium text-body hover:bg-hairline-soft/60'
            }`}
          >
            {item.label}
          </NavLink>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'reset' });
          toast('Demo restablecida');
        }}
        className="mb-2 self-start rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[12px] font-medium text-body hover:bg-hairline-soft"
      >
        Restablecer demo
      </button>
      <p className="text-[13px] font-semibold text-ink">Camila Rojas</p>
      <p className="text-[12px] leading-4 text-muted">Monitora · Sesión de demostración</p>
    </aside>
  );
}
