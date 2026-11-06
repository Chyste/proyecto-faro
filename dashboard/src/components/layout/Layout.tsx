import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="pl-[220px]">
        <div key={pathname} className="anim-rise">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
