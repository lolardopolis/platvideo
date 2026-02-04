import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
