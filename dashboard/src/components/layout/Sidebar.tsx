import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Activity,
  AlertTriangle,
  Users,
  ClipboardList,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/geografico', icon: MapPin, label: 'Distribución Geográfica' },
  { to: '/bienestar', icon: Activity, label: 'Análisis de Bienestar' },
  { to: '/alertas', icon: AlertTriangle, label: 'Centro de Alertas' },
  { to: '/personas', icon: Users, label: 'Personas' },
  { to: '/seguimiento', icon: ClipboardList, label: 'Gestión de Seguimiento' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-gray-900 leading-tight whitespace-nowrap">
              helper<span className="text-primary-600"> AI</span>
            </h1>
            <p className="text-[10px] text-gray-400 leading-tight whitespace-nowrap">
              Seguimiento preventivo
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Collapse */}
      <div className="border-t border-gray-100 p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Colapsar</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 px-3 py-2">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Datos sintéticos · Prototipo
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

