import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen, FileText, Link as LinkIcon, Code, Award, Trophy, Medal, User, Loader2, Edit, Video, Star, Heart, Eye } from 'lucide-react';
import { CourseReviews } from '../components/CourseReviews';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

interface Video {
  id: string;
  title: string;
  duration: number;
  videoUrl: string;
  thumbnail: string | null;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  videos: Video[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  introVideo: string | null;
  category: string;
  instructor: { id: string; name: string; avatar: string };
  modules: Module[];
}

interface LeaderboardEntry {
  user: { id: string; name: string; avatar: string };
  progress: number;
}

export function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { enrolledCourses, completedVideos, toggleVideoComplete, enroll, token, user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  const isEnrolled = courseId && enrolledCourses.includes(courseId);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      try {
        const data = await coursesApi.get(courseId);
        setCourse(data);
        
        const lbData = await coursesApi.leaderboard(courseId);
        setLeaderboard(lbData);
      } catch (err) {
        console.error('Failed to load course details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  // Load like status and stats
  useEffect(() => {
    async function loadStats() {
      if (!courseId) return;
      try {
        const stats = await fetch(`http://localhost:3001/api/courses/${courseId}/stats`).then(r => r.json());
        setLikesCount(stats.likes || 0);
        setViewsCount(stats.views || 0);
        
        if (token) {
          const likedRes = await fetch(`http://localhost:3001/api/courses/${courseId}/liked`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json());
          setLiked(likedRes.liked);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    }
    loadStats();
  }, [courseId, token]);

  const handleLike = async () => {
    if (!courseId || !token) return;
    try {
      if (liked) {
        await fetch(`http://localhost:3001/api/courses/${courseId}/like`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await fetch(`http://localhost:3001/api/courses/${courseId}/like`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleEnroll = async () => {
    if (!courseId || !token) return;
    setEnrolling(true);
    try {
      await enroll(courseId);
    } catch (err) {
      console.error('Failed to enroll:', err);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Curso no encontrado</h2>
        <Link to="/courses" className="text-blue-400 hover:underline">Volver al catálogo</Link>
      </div>
    );
  }

  const totalVideos = course.modules.reduce((acc, m) => acc + m.videos.length, 0);
  const completedCount = course.modules.reduce((acc, m) => 
    acc + m.videos.filter(v => completedVideos.includes(v.id)).length, 0
  );
  const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 aspect-video rounded-xl overflow-hidden shadow-2xl relative group bg-slate-100">
                {course.introVideo ? (
                    <video 
                        src={course.introVideo.startsWith('/') ? `http://localhost:3001${course.introVideo}` : course.introVideo}
                        controls
                        className="w-full h-full object-cover"
                        poster={course.thumbnail?.startsWith('/') ? `http://localhost:3001${course.thumbnail}` : course.thumbnail || undefined}
                    />
                ) : (
                    <>
                        <img src={course.thumbnail?.startsWith('/') ? `http://localhost:3001${course.thumbnail}` : course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} alt={course.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                             <PlayCircle className="text-slate-900 h-16 w-16 opacity-80" />
                        </div>
                    </>
                )}
            </div>
            <div className="flex-1 space-y-4">
                <div>
                     <Link to="/courses" className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors mb-2 text-sm">
                        <ArrowLeft size={16} className="mr-1" />
                        Volver a cursos
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{course.title}</h1>
                    <p className="text-slate-600 text-lg">{course.description}</p>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><BookOpen size={16} /> {course.modules.length} Módulos</span>
                    <span className="flex items-center gap-1"><PlayCircle size={16} /> {totalVideos} Videos</span>
                    <span className="flex items-center gap-1"><Eye size={16} /> {viewsCount} views</span>
                    <button onClick={handleLike} disabled={!token} className={"flex items-center gap-1 px-3 py-1 rounded-lg transition-all " + (liked ? "bg-red-500/20 text-red-400" : "bg-slate-100 text-slate-600 hover:text-red-400") + (!token ? " opacity-50 cursor-not-allowed" : "")}><Heart size={16} className={liked ? "fill-current" : ""} /> {likesCount}</button>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400">{course.instructor.name}</span>
                        {user?.id === course.instructor.id && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/courses/${courseId}/content`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1">
                              <Video size={14} /> Editar Contenido
                            </button>
                            <button onClick={() => navigate(`/courses/${courseId}/edit`)} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1">
                              <Edit size={12} /> Configuración del Curso
                            </button>
                          </div>
                        )}
                    </div>
                </div>

                {!isEnrolled && user?.id !== course.instructor.id ? (
                    <button 
                         onClick={handleEnroll}
                         disabled={enrolling}
                         className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all w-full md:w-auto flex items-center justify-center gap-2"
                    >
                        {enrolling ? <Loader2 className="animate-spin" size={20} /> : null}
                        Inscribirme Gratis
                    </button>
                ) : (
                    <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-300 w-full md:w-80">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600 font-medium font-display uppercase tracking-widest text-[10px]">Progreso del Curso</span>
                            <span className="text-blue-400 font-bold">{progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Content List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/50 border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <h2 className="text-xl font-bold text-slate-900">Contenido del curso</h2>
                        <p className="text-sm text-slate-600 mt-1">Sigue los módulos en orden para un mejor aprendizaje</p>
                    </div>
                    
                    <div className="divide-y divide-slate-800">
                        {course.modules.length === 0 ? (
                            <div className="p-12 text-center text-slate-600">
                                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No hay contenido publicado aún</p>
                            </div>
                        ) : course.modules.map((module, mIdx) => (
                            <div key={module.id} className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-blue-400 font-bold text-sm">
                                        {mIdx + 1}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{module.title}</h3>
                                </div>
                                <div className="space-y-2 ml-11">
                                    {module.videos.map((video) => {
                                        const isCompleted = completedVideos.includes(video.id);
                                        return (
                                            <div key={video.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100/50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    {isEnrolled ? (
                                                        <Link 
                                                            to={`/videos/${video.id}`}
                                                            className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                                                        >
                                                            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                <PlayCircle size={18} />
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700">{video.title}</span>
                                                        </Link>
                                                    ) : (
                                                        <>
                                                            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                                                <Lock size={18} />
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-600">{video.title}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-slate-600 font-medium">
                                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                                    </span>
                                                    {isEnrolled && isCompleted && (
                                                        <CheckCircle size={18} className="text-green-500" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

                {/* Reviews Section */}
                <CourseReviews courseId={courseId!} isEnrolled={isEnrolled} />

            {/* Sidebar / Leaderboard */}
            <div className="space-y-6">
                <div className="bg-white/50 border border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500" />
                        Estudiantes Top
                    </h3>
                    <div className="space-y-4">
                        {leaderboard.length === 0 ? (
                            <p className="text-sm text-slate-600 text-center py-4">Sé el primero en inscribirte</p>
                        ) : leaderboard.map((entry, idx) => (idx < 5 && (
                            <div key={entry.user.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-transparent hover:border-slate-300 transition-all">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-300">
                                        {entry.user.avatar ? <img src={entry.user.avatar.startsWith('/') ? `http://localhost:3001${entry.user.avatar}` : entry.user.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-600" />}
                                    </div>
                                    <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500 text-yellow-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-400 text-orange-950' : 'bg-slate-700 text-slate-900'}`}>
                                        {idx + 1}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{entry.user.name}</p>
                                    <p className="text-xs text-blue-400">{entry.progress}% completado</p>
                                </div>
                                {idx === 0 && <Medal size={16} className="text-yellow-500" />}
                            </div>
                        )))}
                    </div>
                </div>

                <div className="bg-blue-600 rounded-2xl p-6 text-slate-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <Award className="h-12 w-12 mb-4 opacity-50" />
                    <h4 className="text-lg font-bold mb-2">Obtén tu certificado</h4>
                    <p className="text-blue-100 text-sm mb-4">Completa todos los videos y evaluaciones para obtener tu certificación oficial.</p>
                    <button className="w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                        Ver requisitos
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
