import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Upload, Loader2, Video, FileText, Trash2, 
  GripVertical, ChevronRight, ChevronDown, MoreVertical, Eye,
  Clock, File, X, CheckCircle, Play, FolderPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

const API_BASE = 'http://localhost:3001';

interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
}

interface VideoItem {
  id: string;
  title: string;
  duration: number;
  thumbnail: string | null;
  videoUrl: string;
  order: number;
  resources?: Resource[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  videos: VideoItem[];
}

interface Course {
  id: string;
  title: string;
  thumbnail: string | null;
  modules: Module[];
  instructor: { id: string };
}

export function CourseContentPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingToModule, setUploadingToModule] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // New module
  const [showNewModule, setShowNewModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  
  // Resources modal
  const [resourceModal, setResourceModal] = useState<{ videoId: string; videoTitle: string } | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      try {
        const data = await coursesApi.get(courseId);
        setCourse(data);
        // Expand all modules by default
        setExpandedModules(new Set(data.modules.map((m: Module) => m.id)));
        if (data.modules.length > 0) {
          setSelectedModule(data.modules[0].id);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleDragOver = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    setIsDragging(true);
    setUploadingToModule(moduleId);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setUploadingToModule(null);
  };

  const handleDrop = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setVideoTitle(e.dataTransfer.files[0].name.replace(/\.[^.]+$/, ''));
      setUploadingToModule(moduleId);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, moduleId: string) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setVideoTitle(e.target.files[0].name.replace(/\.[^.]+$/, ''));
      setUploadingToModule(moduleId);
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedFile || !token || !uploadingToModule || !videoTitle) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('title', videoTitle);
    formData.append('moduleId', uploadingToModule);
    formData.append('duration', '0');
    formData.append('order', '0');

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Reload course to get updated videos
          const data = await coursesApi.get(courseId!);
          setCourse(data);
          setSelectedFile(null);
          setVideoTitle('');
          setUploadingToModule(null);
        } else {
          alert('Error al subir el video');
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        alert('Error de conexión');
        setUploading(false);
      };

      xhr.open('POST', `${API_BASE}/api/videos`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err) {
      console.error('Upload error:', err);
      setUploading(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !courseId || !token) return;
    setAddingModule(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newModuleTitle }),
      });
      if (res.ok) {
        const newModule = await res.json();
        setCourse(prev => prev ? { 
          ...prev, 
          modules: [...prev.modules, { ...newModule, videos: [] }] 
        } : null);
        setExpandedModules(new Set([...expandedModules, newModule.id]));
        setNewModuleTitle('');
        setShowNewModule(false);
      }
    } catch (err) {
      console.error('Failed to add module:', err);
    } finally {
      setAddingModule(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!token || !confirm('¿Eliminar este video?')) return;
    try {
      await fetch(`${API_BASE}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await coursesApi.get(courseId!);
      setCourse(data);
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  // Resource functions
  const openResourceModal = async (videoId: string, videoTitle: string) => {
    setResourceModal({ videoId, videoTitle });
    setLoadingResources(true);
    try {
      const res = await fetch(`${API_BASE}/api/videos/${videoId}/resources`);
      const data = await res.json();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !resourceModal) return;

    setUploadingResource(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      const res = await fetch(`${API_BASE}/api/videos/${resourceModal.videoId}/resources`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const newResource = await res.json();
        setResources([...resources, newResource]);
      }
    } catch {
      alert('Error al subir recurso');
    } finally {
      setUploadingResource(false);
      if (resourceInputRef.current) resourceInputRef.current.value = '';
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!token || !resourceModal) return;
    try {
      await fetch(`${API_BASE}/api/videos/${resourceModal.videoId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setResources(resources.filter(r => r.id !== resourceId));
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, string> = {
      'PDF': '📄', 'DOC': '📝', 'EXCEL': '📊', 'PPT': '📽️',
      'IMAGE': '🖼️', 'VIDEO': '🎬', 'ZIP': '📦', 'FILE': '📁'
    };
    return icons[type] || '📁';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-20 text-slate-600">Curso no encontrado</div>;
  }

  const totalVideos = course.modules.reduce((acc, m) => acc + m.videos.length, 0);
  const totalDuration = course.modules.reduce((acc, m) => 
    acc + m.videos.reduce((a, v) => a + v.duration, 0), 0
  );

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate(`/courses/${courseId}`)} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Volver al Curso
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contenido del Curso</h1>
            <p className="text-slate-600 mt-1">{course.title}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1"><Video size={14} /> {totalVideos} videos</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{course.modules.length}</p>
            <p className="text-xs text-slate-600">Módulos</p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totalVideos}</p>
            <p className="text-xs text-slate-600">Videos</p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{Math.floor(totalDuration / 60)}</p>
            <p className="text-xs text-slate-600">Minutos</p>
          </div>
        </div>
        <button 
          onClick={() => setShowNewModule(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <FolderPlus size={18} />
          Nuevo Módulo
        </button>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {course.modules.length === 0 ? (
          <div className="text-center py-16 bg-white/50 border-2 border-dashed border-slate-300 rounded-2xl">
            <FolderPlus size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">Sin módulos aún</h3>
            <p className="text-slate-600 mb-6">Crea tu primer módulo para empezar a agregar videos</p>
            <button 
              onClick={() => setShowNewModule(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-xl font-medium inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Crear Primer Módulo
            </button>
          </div>
        ) : (
          course.modules.map((module, moduleIndex) => (
            <div key={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Module Header */}
              <div 
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => toggleModule(module.id)}
              >
                <GripVertical size={18} className="text-slate-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {expandedModules.has(module.id) ? (
                      <ChevronDown size={18} className="text-slate-600" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-600" />
                    )}
                    <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      M{moduleIndex + 1}
                    </span>
                    <h3 className="text-lg font-medium text-slate-900">{module.title}</h3>
                  </div>
                </div>
                <span className="text-sm text-slate-600">{module.videos.length} videos</span>
              </div>

              {/* Module Content */}
              {expandedModules.has(module.id) && (
                <div className="border-t border-slate-200">
                  {/* Videos Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {module.videos.map((video, videoIndex) => (
                      <div key={video.id} className="bg-slate-100/50 border border-slate-300 rounded-xl overflow-hidden group hover:border-blue-500/50 transition-all">
                        {/* Video Thumbnail */}
                        <div className="relative aspect-video bg-slate-100">
                          {video.thumbnail ? (
                            <img src={`${API_BASE}${video.thumbnail}`} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                              <Play size={32} className="text-slate-600" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-slate-900 text-xs px-2 py-0.5 rounded">
                            {formatDuration(video.duration)}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <Link to={`/video/${video.id}`} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                              <Eye size={18} className="text-slate-900" />
                            </Link>
                          </div>
                        </div>
                        
                        {/* Video Info */}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-slate-600">Video {videoIndex + 1}</span>
                              <h4 className="text-sm font-medium text-slate-900 truncate">{video.title}</h4>
                            </div>
                            <div className="relative group/menu">
                              <button className="p-1 text-slate-600 hover:text-slate-900 rounded transition-colors">
                                <MoreVertical size={16} />
                              </button>
                              <div className="absolute right-0 top-full mt-1 bg-slate-100 border border-slate-300 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 min-w-[140px]">
                                <button 
                                  onClick={() => openResourceModal(video.id, video.title)}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-200 flex items-center gap-2"
                                >
                                  <FileText size={14} /> Recursos
                                </button>
                                <button 
                                  onClick={() => handleDeleteVideo(video.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-200 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Video Card */}
                    <div 
                      className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                        isDragging && uploadingToModule === module.id 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-slate-300 hover:border-blue-500/50 hover:bg-slate-100/30'
                      }`}
                      onDragOver={(e) => handleDragOver(e, module.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, module.id)}
                      onClick={() => {
                        setUploadingToModule(module.id);
                        videoInputRef.current?.click();
                      }}
                    >
                      <input 
                        ref={videoInputRef} 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => handleFileSelect(e, module.id)} 
                      />
                      <div className="p-3 rounded-full bg-slate-100">
                        <Upload size={24} className="text-slate-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">Subir Video</p>
                        <p className="text-xs text-slate-600">Arrastra o haz clic</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {selectedFile && uploadingToModule && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Subir Video</h3>
              {!uploading && (
                <button onClick={() => { setSelectedFile(null); setUploadingToModule(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-600" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-100/50 rounded-xl">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Video size={24} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-600">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Título del Video</label>
                <input 
                  type="text" 
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del video..."
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Subiendo...</span>
                    <span className="text-blue-400 font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              {!uploading && (
                <button 
                  onClick={() => { setSelectedFile(null); setUploadingToModule(null); }}
                  className="flex-1 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleUploadVideo}
                disabled={uploading || !videoTitle}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                {uploading ? 'Subiendo...' : 'Subir Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Module Modal */}
      {showNewModule && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Módulo</h3>
              <button onClick={() => setShowNewModule(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm text-slate-600 mb-1">Nombre del Módulo</label>
              <input 
                type="text" 
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Introducción al Curso"
                autoFocus
              />
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setShowNewModule(false)} className="flex-1 py-2.5 text-slate-600 hover:text-slate-900 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleAddModule}
                disabled={addingModule || !newModuleTitle.trim()}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {addingModule ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                Crear Módulo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resources Modal */}
      {resourceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recursos</h3>
                <p className="text-sm text-slate-600 truncate">{resourceModal.videoTitle}</p>
              </div>
              <button onClick={() => setResourceModal(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {loadingResources ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <File size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No hay recursos adjuntos</p>
                  <p className="text-xs mt-1">Sube PDFs, documentos o archivos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map((resource) => (
                    <div key={resource.id} className="flex items-center gap-3 p-3 bg-slate-100/50 rounded-lg group">
                      <span className="text-xl">{getFileIcon(resource.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 font-medium truncate">{resource.title}</p>
                        <p className="text-xs text-slate-600">{resource.type}</p>
                      </div>
                      <a href={`${API_BASE}${resource.url}`} target="_blank" className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg hover:bg-blue-500/30">
                        Ver
                      </a>
                      <button onClick={() => handleDeleteResource(resource.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200">
              <input ref={resourceInputRef} type="file" onChange={handleResourceUpload} className="hidden" />
              <button 
                onClick={() => resourceInputRef.current?.click()}
                disabled={uploadingResource}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {uploadingResource ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                Subir Recurso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
