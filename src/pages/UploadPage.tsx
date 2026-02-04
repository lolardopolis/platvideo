import { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, FileVideo, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

interface Module {
  id: string;
  title: string;
  courseId: string;
}

interface Course {
  id: string;
  title: string;
  modules: Module[];
}

export function UploadPage() {
  const { token, role } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  // Load courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await coursesApi.list();
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourse(data[0].id);
          if (data[0].modules.length > 0) {
            setSelectedModule(data[0].modules[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    }
    loadCourses();
  }, []);

  // Update module when course changes
  useEffect(() => {
    const course = courses.find(c => c.id === selectedCourse);
    if (course && course.modules.length > 0) {
      setSelectedModule(course.modules[0].id);
    } else {
      setSelectedModule('');
    }
  }, [selectedCourse, courses]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!title) {
        setTitle(e.dataTransfer.files[0].name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) {
        setTitle(e.target.files[0].name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !token || !selectedModule || !title) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('moduleId', selectedModule);
    formData.append('duration', '0'); // Will be calculated on server or updated later
    formData.append('order', '0');

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setCompleted(true);
          setUploading(false);
        } else {
          const response = JSON.parse(xhr.responseText);
          setError(response.error || 'Error al subir el video');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('Error de conexión al subir el video');
        setUploading(false);
      };

      xhr.open('POST', 'http://localhost:3001/api/videos');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err: any) {
      setError(err.message || 'Error al subir el video');
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setCompleted(false);
    setTitle('');
    setError('');
  };

  const currentCourse = courses.find(c => c.id === selectedCourse);

  if (role !== 'tutor') {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-slate-600">Solo los tutores pueden subir videos. Cambia tu rol a Tutor para acceder.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
       <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Subir Video</h2>
            <p className="text-slate-600 mt-2">Sube tus grabaciones para compartirlas con la clase</p>
        </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!file && !completed && (
          <>
            {/* Course/Module Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Curso</label>
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Módulo</label>
                <div className="relative">
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currentCourse?.modules.map(mod => (
                      <option key={mod.id} value={mod.id}>{mod.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                </div>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-300 hover:border-slate-600 hover:bg-slate-100/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 shadow-inner">
                  <Upload className={`h-10 w-10 ${isDragging ? 'text-blue-400' : 'text-slate-600'}`} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Arrastra y suelta tu video aquí</h3>
                <p className="text-slate-600 mb-6 text-sm">Soporta MP4, WEBM, MOV (Max 500MB)</p>
                
                <div className="relative">
                  <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      accept="video/*"
                      onChange={handleFileChange}
                  />
                  <label
                      htmlFor="file-upload"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium cursor-pointer transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 inline-block"
                  >
                      Explorar Archivos
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {file && !completed && (
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Título del Video</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Introducción a React Hooks"
                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-xl border border-slate-300">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-slate-700 rounded-lg flex items-center justify-center">
                    <FileVideo className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {!uploading && (
                <button
                    onClick={() => setFile(null)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-slate-200 rounded-lg"
                >
                    <X size={20} />
                </button>
              )}
            </div>

            {uploading ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Subiendo...</span>
                  <span className="text-blue-400 font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button 
                        onClick={resetUpload}
                        className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!title || !selectedModule}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95"
                    >
                        Subir Video
                    </button>
                </div>
            )}
          </div>
        )}

        {completed && (
          <div className="text-center py-12 animate-in zoom-in duration-300">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 text-green-500">
                <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Subida Completada!</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">Tu video ha sido procesado y ya está disponible en el curso.</p>
            <div className="flex justify-center gap-4">
                 <button
                    onClick={resetUpload}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors border border-slate-300"
                >
                    Subir otro video
                </button>
                <button
                    onClick={() => window.location.href = `/courses/${selectedCourse}`}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                    Ver curso
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
