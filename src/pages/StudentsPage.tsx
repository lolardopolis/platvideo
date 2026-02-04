import { useState, useEffect } from 'react';
import { Search, Mail, Loader2, User, Download, ChevronDown, Check, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersApi, coursesApi } from '../services/api';

const API_BASE = 'http://localhost:3001';

interface Course {
  id: string;
  title: string;
}

interface StudentWithProgress {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  createdAt: string;
  enrollments: {
    course: { id: string; title: string };
    progress?: number;
  }[];
}

function StudentAvatar({ avatar, name, size = 'md' }: { avatar: string; name: string; size?: 'sm' | 'md' }) {
  const isImageUrl = avatar?.startsWith('/');
  const initials = name.substring(0, 2).toUpperCase();
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  
  if (isImageUrl) {
    return <img src={`${API_BASE}${avatar}`} alt={name} className={`${sizeClasses} rounded-full object-cover`} />;
  }
  
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-slate-900`}>
      {initials}
    </div>
  );
}

export function StudentsPage() {
  const { token, role, user } = useAuth();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [usersData, coursesData] = await Promise.all([
          usersApi.list(token),
          coursesApi.list()
        ]);
        const studentUsers = usersData.filter((u: any) => u.role === 'STUDENT');
        setStudents(studentUsers);
        
        // Filter courses to only show instructor's courses
        const myCourses = coursesData.filter((c: any) => c.instructor?.id === user?.id);
        setCourses(myCourses);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, user]);

  // Filter and sort students
  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                           s.email.toLowerCase().includes(search.toLowerCase());
      const matchesCourse = selectedCourse === 'all' || 
                           s.enrollments?.some(e => e.course.id === selectedCourse);
      return matchesSearch && matchesCourse;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'email') comparison = a.email.localeCompare(b.email);
      else if (sortBy === 'date') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'email' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const getSelectedEmails = () => {
    return filteredStudents
      .filter(s => selectedStudents.has(s.id))
      .map(s => s.email);
  };

  const handleSendEmail = () => {
    const emails = getSelectedEmails();
    if (emails.length === 0) return;
    window.location.href = `mailto:${emails.join(',')}`;
  };

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Fecha Registro', 'Cursos Inscritos'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      new Date(s.createdAt).toLocaleDateString('es-ES'),
      s.enrollments?.map(e => e.course.title).join('; ') || 'Ninguno'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alumnos_${selectedCourse === 'all' ? 'todos' : 'curso'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToXLSX = () => {
    // For XLSX, we'll create a simple HTML table and let Excel handle it
    const headers = ['Nombre', 'Email', 'Fecha Registro', 'Cursos Inscritos'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      new Date(s.createdAt).toLocaleDateString('es-ES'),
      s.enrollments?.map(e => e.course.title).join('; ') || 'Ninguno'
    ]);
    
    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => html += `<td>${cell}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table>';
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alumnos_${selectedCourse === 'all' ? 'todos' : 'curso'}_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  if (role !== 'tutor') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.24))] text-center">
        <User className="h-16 w-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-slate-600">Esta página es solo para tutores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Mis Alumnos</h2>
          <p className="text-slate-600 mt-1">Base de datos de estudiantes inscritos en tus cursos</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="bg-slate-100 px-3 py-1 rounded-lg">{filteredStudents.length} estudiantes</span>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left side - Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar alumno..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-64"
              />
            </div>

            {/* Course Filter */}
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="appearance-none bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value="all">Todos los cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {selectedStudents.size > 0 && (
              <button
                onClick={handleSendEmail}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
              >
                <Mail size={16} />
                Enviar Email ({selectedStudents.size})
              </button>
            )}
            
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition-colors"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={exportToXLSX}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm border-l border-slate-300 transition-colors"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 && (
                      <Check size={12} className="text-slate-900" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition-colors">
                    Nombre
                    <ArrowUpDown size={12} className={sortBy === 'name' ? 'text-purple-400' : ''} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('email')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition-colors">
                    Email
                    <ArrowUpDown size={12} className={sortBy === 'email' ? 'text-purple-400' : ''} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('date')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition-colors">
                    Registro
                    <ArrowUpDown size={12} className={sortBy === 'date' ? 'text-purple-400' : ''} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cursos</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No se encontraron estudiantes</h3>
                    <p className="text-slate-600 text-sm">Intenta ajustar los filtros</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-100/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelectStudent(student.id)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedStudents.has(student.id)
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {selectedStudents.has(student.id) && <Check size={12} className="text-slate-900" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar avatar={student.avatar} name={student.name} size="sm" />
                        <span className="font-medium text-slate-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{student.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {new Date(student.createdAt).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {student.enrollments?.slice(0, 2).map((e, idx) => (
                          <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {e.course.title.length > 20 ? e.course.title.substring(0, 20) + '...' : e.course.title}
                          </span>
                        ))}
                        {student.enrollments && student.enrollments.length > 2 && (
                          <span className="text-xs bg-slate-700 text-slate-600 px-2 py-0.5 rounded">
                            +{student.enrollments.length - 2}
                          </span>
                        )}
                        {(!student.enrollments || student.enrollments.length === 0) && (
                          <span className="text-xs text-slate-600">Sin cursos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => window.location.href = `mailto:${student.email}`}
                        className="p-2 text-slate-600 hover:text-purple-400 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Enviar email"
                      >
                        <Mail size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {selectedStudents.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-100 border border-slate-300 rounded-xl px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <span className="text-sm text-slate-700">
            <strong className="text-slate-900">{selectedStudents.size}</strong> estudiantes seleccionados
          </span>
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Mail size={16} />
            Enviar Email Masivo
          </button>
          <button
            onClick={() => setSelectedStudents(new Set())}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
