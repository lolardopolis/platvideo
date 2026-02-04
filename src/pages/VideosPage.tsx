import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, PlayCircle, Clock, Loader2, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { videosApi } from '../services/api';

interface WatchedVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number;
  watchedSeconds: number;
  completed: boolean;
  course: { id: string; title: string };
  module: { id: string; title: string };
  lastWatched: string;
}

export function VideosPage() {
  const { token, role } = useAuth();
  const [videos, setVideos] = useState<WatchedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadVideos() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await videosApi.getMyVideos(token);
        setVideos(data);
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, [token]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    if (diffMins < 10080) return `Hace ${Math.floor(diffMins / 1440)} días`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(search.toLowerCase()) ||
    video.course.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {role === 'tutor' ? 'Gestionar Videos' : 'Mis Videos'}
            </h2>
            <p className="text-slate-600 mt-1">
              {role === 'tutor' 
                ? 'Administra los videos de tus cursos'
                : 'Videos que has visto de tus cursos'
              }
            </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar videos..." 
                    className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64 transition-all"
                />
            </div>
        </div>
      </div>
      
      {filteredVideos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No has visto ningún video aún</h3>
          <p className="text-slate-600 text-sm mb-6">Inscríbete en un curso y comienza a aprender</p>
          <Link 
            to="/courses" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium"
          >
            Ver Catálogo de Cursos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Link 
              key={video.id}
              to={`/videos/${video.id}`}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/5 group"
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {video.thumbnail ? (
                  <img 
                    src={video.thumbnail.startsWith('http') ? video.thumbnail : `http://localhost:3001${video.thumbnail}`} 
                    alt={video.title} 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <PlayCircle size={40} className="text-slate-600" />
                  </div>
                )}
                
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                  <div 
                    className={`h-full ${video.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (video.watchedSeconds / video.duration) * 100)}%` }}
                  />
                </div>
                
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-slate-900 font-medium flex items-center gap-1">
                  <Clock size={12} />
                  {formatDuration(video.duration)}
                </div>
                
                {/* Completed badge */}
                {video.completed && (
                  <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-slate-900 font-medium flex items-center gap-1">
                    <CheckCircle size={12} />
                    Completado
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {video.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1 line-clamp-1">{video.course.title}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
                  <span>{video.module.title}</span>
                  <span>{formatDate(video.lastWatched)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
