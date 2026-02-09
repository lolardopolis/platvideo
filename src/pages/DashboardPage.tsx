import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi, messagesApi } from '../services/api';
import { BookOpen, Clock, Award, TrendingUp, Users, AlertCircle, Mail, Search, Loader2 } from 'lucide-react';
import { AvatarDisplay } from '../components/AvatarDisplay';

interface CourseEnrollment {
  courseId: string;
  courseTitle: string;
  thumbnail: string;
  instructor: string;
  totalVideos: number;
  completedVideos: number;
  progress: number;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrollments: { course: { id: string; title: string } }[];
}

export function DashboardPage() {
  const { role, token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Student state
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  
  // Tutor state
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalStudents: 0, atRisk: 0, completionRate: 0 });

  useEffect(() => {
    async function loadDashboardData() {
      if (!token || !user) {
        setLoading(false);
        return;
      }
      
      try {
        if (role === 'tutor') {
          // Load students
          const usersData = await usersApi.list(token);
          const studentUsers = usersData.filter((u: any) => u.role === 'STUDENT');
          setStudents(studentUsers);
          setStats({
            totalStudents: studentUsers.length,
            atRisk: Math.floor(studentUsers.length * 0.2), // Placeholder
            completionRate: 76, // Placeholder
          });
        } else {
          // Load enrolled courses with progress
          const data = await usersApi.getEnrollments(user.id, token);
          setEnrollments(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [token, user, role]);

  const handleSendMessage = async (studentId: string) => {
    if (!token) return;
    try {
      const result = await messagesApi.createConversation(studentId, token);
      navigate(`/messages?chat=${result.id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      navigate('/messages');
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // TUTOR DASHBOARD
  if (role === 'tutor') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Stats */}
        <div className="bg-gradient-to-r from-blue-100 to-slate-100 border border-blue-200 rounded-2xl p-8 sticky top-0 backdrop-blur-xl z-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Panel de Tutor</h2>
          <p className="text-slate-600">Bienvenido, {user?.name}. Aquí tienes el resumen del rendimiento de tus alumnos.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm mb-1">Alumnos Activos</p>
                  <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
                </div>
                <Users className="text-white" size={20} />
              </div>
            </div>
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm mb-1">En Riesgo</p>
                  <p className="text-2xl font-bold text-white">{stats.atRisk}</p>
                </div>
                <AlertCircle className="text-white" size={20} />
              </div>
            </div>
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm mb-1">Tasa de Finalización</p>
                  <p className="text-2xl font-bold text-white">{stats.completionRate}%</p>
                </div>
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Students List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Listado de Alumnos
              </h3>
              <p className="text-slate-600 text-sm">Gestiona y comunícate con tus estudiantes inscritos.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="text" 
                placeholder="Buscar alumno..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-600 uppercase bg-slate-100/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Alumno</th>
                  <th className="px-4 py-3">Cursos Inscritos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStudents.map((student) => {
                  const courses = student.enrollments?.map(e => e.course.title).join(', ') || '';
                  return (
                    <tr key={student.id} className="hover:bg-slate-100/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-900 overflow-hidden">
                            <AvatarDisplay avatar={student.avatar} name={student.name} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-600">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={courses}>
                        {courses || <span className="text-slate-600 italic">Sin cursos</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/20">
                          Activo
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleSendMessage(student.id)}
                          className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-all text-xs font-medium"
                        >
                          <Mail size={14} />
                          Mensaje
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-600">
                      No se encontraron alumnos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // STUDENT DASHBOARD
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-900/50 to-slate-900 border border-blue-500/20 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Hola, {user?.name || 'Estudiante'}!</h2>
        <p className="text-blue-200/70">Continúa donde lo dejaste. Tienes {enrollments.length} cursos activos.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-3 bg-blue-600 p-3 rounded-lg shadow-lg">
            <div className="p-2 text-white rounded-lg">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{enrollments.length}</p>
              <p className="text-xs text-white/80">Cursos en curso</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-600 p-3 rounded-lg shadow-lg">
            <div className="p-2 text-white rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{enrollments.reduce((acc, e) => acc + e.completedVideos, 0)}</p>
              <p className="text-xs text-white/80">Videos vistos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-600 p-3 rounded-lg shadow-lg">
            <div className="p-2 text-white rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{enrollments.filter(e => e.progress === 100).length}</p>
              <p className="text-xs text-white/80">Completados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-600 p-3 rounded-lg shadow-lg">
            <div className="p-2 text-white rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length) : 0}%
              </p>
              <p className="text-xs text-white/80">Promedio</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Learning Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Mi Aprendizaje</h3>
          <Link to="/courses" className="text-sm text-blue-400 hover:text-blue-300 font-medium">Ver catálogo</Link>
        </div>
        
        {enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {enrollments.map(enrollment => (
              <Link 
                key={enrollment.courseId}
                to={`/courses/${enrollment.courseId}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/5 flex flex-col"
              >
                <div className="h-40 bg-slate-100 relative overflow-hidden group">
                  <img 
                    src={enrollment.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
                    alt={enrollment.courseTitle} 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{enrollment.courseTitle}</h3>
                  <p className="text-sm text-slate-600 mb-4">{enrollment.instructor}</p>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex justify-between text-xs text-slate-700">
                      <span>{enrollment.completedVideos}/{enrollment.totalVideos} videos</span>
                      <span>{enrollment.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h4 className="text-slate-900 font-medium mb-1">No estás inscrito en ningún curso</h4>
            <p className="text-slate-600 text-sm mb-4">Explora el catálogo para empezar a aprender</p>
            <Link to="/courses" className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-colors text-sm font-medium">
              Explorar Cursos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
