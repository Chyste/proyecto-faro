import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="pl-[220px]">
        <Outlet />
      </div>
    </div>
  );
}
