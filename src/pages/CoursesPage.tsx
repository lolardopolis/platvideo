import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, PlayCircle, Loader2, Users, Plus, Edit, Eye, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
  status: string;
  visibility: string;
  instructor: { id: string; name: string; avatar: string };
  totalVideos: number;
  views?: number;
  likes?: number;
  enrolledCount: number;
}

export function CoursesPage() {
  const { enrolledCourses, enroll, token, role, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await coursesApi.list(token || undefined);
        setCourses(data);
        
        // Load my courses if tutor
        if (role === 'tutor' && token) {
          const myData = await coursesApi.my(token);
          setMyCourses(myData);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [token, role]);

  const handleEnroll = async (courseId: string) => {
    if (!token) return;
    setEnrollingId(courseId);
    try {
      await enroll(courseId);
    } catch (err) {
      console.error('Failed to enroll:', err);
    } finally {
      setEnrollingId(null);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase()) ||
    course.description.toLowerCase().includes(search.toLowerCase()) ||
    course.instructor.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMyCourses = myCourses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const CourseCard = ({ course, showEdit = false }: { course: Course; showEdit?: boolean }) => {
    const isEnrolled = enrolledCourses.includes(course.id);
    const isOwner = user?.id === course.instructor.id;
    
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/5 flex flex-col h-full">
        <div className="h-40 bg-slate-100 relative overflow-hidden group">
          <img 
            src={course.thumbnail?.startsWith('/') ? `http://localhost:3001${course.thumbnail}` : course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
            alt={course.title} 
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {showEdit && (
              <span className={`px-2 py-1 rounded text-xs font-medium border ${course.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                {course.status === 'ACTIVE' ? 'Activo' : course.status}
              </span>
            )}
            <span className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-900 border border-white/10">
              {course.category}
            </span>
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1" title={course.title}>{course.title}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
            <div className="flex items-center gap-1">
              <Users size={14} />
              {course.enrolledCount}
            </div>
            <div className="flex items-center gap-1">
              <Eye size={14} />
              {course.views || 0}
            </div>
            <div className="flex items-center gap-1">
              <Heart size={14} className="text-red-400" />
              {course.likes || 0}
            </div>
          </div>

          {showEdit && isOwner ? (
            <div className="flex gap-2">
              <Link 
                to={`/courses/${course.id}`}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium rounded-lg transition-colors text-center"
              >
                Ver
              </Link>
              <Link 
                to={`/courses/${course.id}/edit`}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Edit size={14} /> Editar
              </Link>
            </div>
          ) : isEnrolled ? (
            <Link 
              to={`/courses/${course.id}`}
              className="mt-auto py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 text-sm font-medium rounded-lg transition-colors text-center shadow-lg shadow-blue-500/20"
            >
              Continuar
            </Link>
          ) : (
            <button 
              onClick={() => handleEnroll(course.id)}
              disabled={enrollingId === course.id}
              className="mt-auto py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-900 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {enrollingId === course.id ? <Loader2 className="animate-spin" size={16} /> : null}
              Inscribirse
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Catálogo de Cursos</h2>
          <p className="text-slate-600 mt-1">Explora y aprende nuevas habilidades</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cursos..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full transition-all"
            />
          </div>
          {role === 'tutor' && (
            <Link 
              to="/courses/new" 
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-xl font-medium flex items-center gap-2 text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Crear Curso
            </Link>
          )}
        </div>
      </div>

      {/* My Courses Section (Tutors) */}
      {role === 'tutor' && filteredMyCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            📚 Mis Cursos
            <span className="text-sm font-normal text-slate-600">({filteredMyCourses.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMyCourses.map(course => (
              <CourseCard key={course.id} course={course} showEdit />
            ))}
          </div>
        </div>
      )}

      {/* All Courses Section */}
      <div className="space-y-4">
        {role === 'tutor' && filteredMyCourses.length > 0 && (
          <h3 className="text-xl font-bold text-slate-900">🌐 Todos los Cursos</h3>
        )}
        
        {filteredCourses.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            No se encontraron cursos
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
