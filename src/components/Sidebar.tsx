import { Home, PlaySquare, BookOpen, Settings, Users, GraduationCap, MessageSquare, LogOut, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, setRole, user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    ...(role === 'alumno' ? [
        { name: 'Mis Cursos', href: '/my-learning', icon: GraduationCap },
    ] : [
        { name: 'Mis Alumnos', href: '/students', icon: Users },
    ]),
    { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    { name: role === 'alumno' ? 'Catálogo Cursos' : 'Gestión de Cursos', href: '/courses', icon: BookOpen },
    { name: 'Comunidad', href: '/community', icon: MessageCircle },
    ...(role === 'alumno' ? [
        { name: 'Mis Videos', href: '/videos', icon: PlaySquare },
    ] : []),
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if avatar is a URL path (starts with /) or just initials
  const avatarUrl = user?.avatar?.startsWith('/') ? `${API_BASE}${user.avatar}` : null;
  const initials = user?.name?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex h-screen w-64 flex-col bg-white text-slate-900 shadow-xl border-r border-slate-200">
      <div className="flex h-16 items-center px-6 border-b border-slate-200 justify-between">
        <h1 className="text-xl font-bold text-blue-400 font-display">ClassLink</h1>
        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${role === 'alumno' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {role === 'alumno' ? 'Alumno' : 'Tutor'}
        </span>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-700'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Role Switcher */}
      <div className="px-4 py-3 border-t border-slate-200">
        <p className="text-[10px] text-slate-600 uppercase font-semibold mb-2 tracking-wider">Cambiar Rol (Demo)</p>
        <div className="flex gap-2">
          <button 
            onClick={() => setRole('alumno')}
            className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${role === 'alumno' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Alumno
          </button>
          <button 
            onClick={() => setRole('tutor')}
            className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${role === 'tutor' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tutor
          </button>
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="px-4 py-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-600 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
