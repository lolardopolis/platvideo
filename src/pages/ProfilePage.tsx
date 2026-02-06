import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, BookOpen, Calendar, Award, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  createdAt: string;
  enrollments: { course: { id: string; title: string; thumbnail: string | null } }[];
  coursesCreated: { id: string; title: string; thumbnail: string | null; _count: { enrollments: number } }[];
}

export function ProfilePage() {
  const { userId } = useParams();
  const { token, user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Usuario no encontrado</h2>
        <Link to="/" className="text-blue-400 hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const isTutor = profile.role === 'TUTOR';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
          <ArrowLeft size={16} /> Volver
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white/50 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500" />
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 -mt-12">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-2xl bg-slate-100 border-4 border-slate-900 flex items-center justify-center overflow-hidden shadow-xl">
              {profile.avatar?.startsWith('/') ? (
                <img src={`${API_BASE}${profile.avatar}`} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-900">{profile.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {profile.name}
                    {isTutor && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Tutor</span>
                    )}
                  </h1>
                  <p className="text-slate-600 flex items-center gap-2 mt-1">
                    <Mail size={14} /> {profile.email}
                  </p>
                </div>
                {isOwnProfile && (
                  <Link
                    to="/settings"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-sm transition-colors"
                  >
                    Editar Perfil
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-6 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                {isTutor && (
                  <span className="flex items-center gap-1">
                    <Award size={14} />
                    {profile.coursesCreated?.length || 0} cursos creados
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen size={14} />
                  {profile.enrollments?.length || 0} cursos inscritos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      {isTutor && profile.coursesCreated && profile.coursesCreated.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Cursos de {profile.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.coursesCreated.map(course => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group"
              >
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={course.thumbnail?.startsWith('/') ? `${API_BASE}${course.thumbnail}` : course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-900 line-clamp-2">{course.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{course._count?.enrollments || 0} estudiantes</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Courses (only visible to own profile or admin) */}
      {isOwnProfile && profile.enrollments && profile.enrollments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Cursos Inscritos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.enrollments.map(enrollment => (
              <Link
                key={enrollment.course.id}
                to={`/courses/${enrollment.course.id}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all group"
              >
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={enrollment.course.thumbnail?.startsWith('/') ? `${API_BASE}${enrollment.course.thumbnail}` : enrollment.course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-900 line-clamp-2">{enrollment.course.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
