import { Bell, LogOut, User } from 'lucide-react';
import { GlobalSearch } from '../GlobalSearch';
import { useAuth } from '../../context/AuthContext';

import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

export function Header() {
  const { user, role, setRole, logout } = useAuth();
  
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if avatar is a URL path (starts with /) or just initials
  const avatarUrl = user?.avatar?.startsWith('/') ? `${API_BASE}${user.avatar}` : null;

  return (
    <header className="h-16 border-b border-slate-200 bg-slate-50/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-3">

        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setRole('alumno')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${role === 'alumno' ? 'bg-blue-600 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Alumno
          </button>
          <button
            onClick={() => setRole('tutor')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${role === 'tutor' ? 'bg-purple-600 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Tutor
          </button>
        </div>
        
        <button className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-300">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-slate-900 text-sm font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={16} />
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-900">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-600">{user?.role === 'TUTOR' ? 'Tutor' : 'Estudiante'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-600 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
