import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { readCollapsed, writeCollapsed } from './Sidebar';

export default function Layout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () =>
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className={`transition-[padding] duration-200 ease-out ${collapsed ? 'pl-[72px]' : 'pl-[248px]'}`}>
        <div key={pathname} className="anim-rise">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
