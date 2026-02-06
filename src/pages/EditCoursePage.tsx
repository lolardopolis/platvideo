import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, GripVertical, Upload, Loader2, Image, X, ChevronDown, PlayCircle, Video, Calendar, FileText, Trash2, File } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

import { API_BASE } from '../services/api';

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
  description: string;
  thumbnail: string | null;
  introVideo: string | null;
  category: string;
  status: string;
  visibility: string;
  startDate: string | null;
  endDate: string | null;
  maxEnrollments: number | null;
  enrollmentMode: string;
  modules: Module[];
  instructor: { id: string };
}

export function EditCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [noExpiration, setNoExpiration] = useState(false);
  
  // Resource modal state
  const [resourceModal, setResourceModal] = useState<{ videoId: string; videoTitle: string } | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Programación',
    thumbnail: '',
    introVideo: '',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    startDate: '',
    endDate: '',
    maxEnrollments: '',
    enrollmentMode: 'OPEN',
  });

  useEffect(() => {
    async function loadCourse() {
      if (!courseId || !token) return;
      try {
        const data = await coursesApi.get(courseId);
        setCourse(data);
        setForm({
          title: data.title,
          description: data.description,
          category: data.category || 'Programación',
          thumbnail: data.thumbnail || '',
          introVideo: data.introVideo || '',
          status: data.status,
          visibility: data.visibility || 'PUBLIC',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          endDate: data.endDate ? data.endDate.split('T')[0] : '',
          maxEnrollments: data.maxEnrollments?.toString() || '',
          enrollmentMode: data.enrollmentMode || 'OPEN',
        });
        setNoExpiration(!data.endDate);
        if (data.thumbnail) {
          setThumbnailPreview(data.thumbnail.startsWith('/') ? `${API_BASE}${data.thumbnail}` : data.thumbnail);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId, token]);

  const handleThumbnailClick = () => fileInputRef.current?.click();
  const handleVideoClick = () => videoInputRef.current?.click();

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      const res = await fetch(`${API_BASE}/api/courses/upload-thumbnail`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ ...form, thumbnail: data.url });
      } else {
        alert(data.error || 'Error al subir imagen');
        setThumbnailPreview(null);
      }
    } catch {
      alert('Error de conexión');
      setThumbnailPreview(null);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato no soportado. Usa MP4, WebM o MOV.');
      return;
    }

    setUploadingIntro(true);
    try {
      const data = await coursesApi.uploadIntro(courseId!, file, token);
      if (data.url) {
        setForm({ ...form, introVideo: data.url });
      } else {
        alert(data.error || 'Error al subir video');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setUploadingIntro(false);
    }
  };

  const handleSave = async () => {
    if (!courseId || !token) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: noExpiration ? null : form.startDate,
        endDate: noExpiration ? null : form.endDate,
      };
      await coursesApi.update(courseId, payload, token);
      navigate(`/courses/${courseId}`);
    } catch (err) {
      console.error('Failed to save course:', err);
      alert('Error al guardar');
    } finally {
      setSaving(false);
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
        setCourse(prev => prev ? { ...prev, modules: [...prev.modules, { ...newModule, videos: [] }] } : null);
        setNewModuleTitle('');
      }
    } catch (err) {
      console.error('Failed to add module:', err);
    } finally {
      setAddingModule(false);
    }
  };

  // Resource management functions
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
      } else {
        const err = await res.json();
        alert(err.error || 'Error al subir recurso');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setUploadingResource(false);
      if (resourceInputRef.current) resourceInputRef.current.value = '';
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!token || !resourceModal) return;
    try {
      const res = await fetch(`${API_BASE}/api/videos/${resourceModal.videoId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setResources(resources.filter(r => r.id !== resourceId));
      }
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return '📄';
      case 'DOC': return '📝';
      case 'EXCEL': return '📊';
      case 'PPT': return '📽️';
      case 'IMAGE': return '🖼️';
      case 'VIDEO': return '🎬';
      case 'ZIP': return '📦';
      default: return '📁';
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
    return <div className="text-center py-20 text-slate-600">Curso no encontrado</div>;
  }

  if (course.instructor.id !== user?.id && user?.role?.toUpperCase() !== 'ADMIN') {
    return <div className="text-center py-20 text-red-400">No tienes permiso para editar este curso</div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <button onClick={() => navigate(`/courses/${courseId}`)} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Volver al Curso
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Editar Curso</h1>
        <p className="text-slate-600 mt-1">Realiza los cambios necesarios en tu curso</p>
      </div>

      <div className="space-y-6">
        {/* Course Details Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Información del Curso</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Título *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Descripción *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Categoría</label>
                <div className="relative">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="Programación">Programación</option>
                    <option value="Diseño">Diseño</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Negocios">Negocios</option>
                    <option value="Ciencia de Datos">Ciencia de Datos</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Estado</label>
                <div className="relative">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="ACTIVE">Activo</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media (Image & Video) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Multimedia</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail Upload */}
            <div>
                <label className="block text-sm text-slate-600 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                <Image size={14} className="inline mr-1" />
                Portada
                </label>
                
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleThumbnailChange} className="hidden" />

                {thumbnailPreview || form.thumbnail ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video">
                    <img src={thumbnailPreview || (form.thumbnail.startsWith('/') ? `${API_BASE}${form.thumbnail}` : form.thumbnail)} alt="Portada" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={handleThumbnailClick} className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-slate-900 text-xs rounded-lg hover:bg-white/30 transition-colors">Cambiar</button>
                    <button type="button" onClick={() => { setForm({...form, thumbnail: ''}); setThumbnailPreview(null); }} className="p-1.5 bg-red-500/80 text-slate-900 rounded-lg hover:bg-red-500 transition-colors"><X size={16} /></button>
                    </div>
                </div>
                ) : (
                <button type="button" onClick={handleThumbnailClick} disabled={uploadingThumbnail} className="w-full aspect-video border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-blue-500 hover:text-blue-400 transition-colors bg-slate-100/50">
                    {uploadingThumbnail ? <Loader2 className="animate-spin" size={24} /> : <><Upload size={24} /><span className="text-xs">Subir imagen</span></>}
                </button>
                )}
            </div>

            {/* Intro Video Upload */}
            <div>
                <label className="block text-sm text-slate-600 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                <Video size={14} className="inline mr-1" />
                Video de Introducción
                </label>
                
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />

                {form.introVideo ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video flex flex-col items-center justify-center gap-2">
                    <PlayCircle size={40} className="text-blue-400" />
                    <span className="text-xs text-slate-600">Video cargado</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={handleVideoClick} className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-slate-900 text-xs rounded-lg hover:bg-white/30 transition-colors">Cambiar</button>
                    <button type="button" onClick={() => setForm({...form, introVideo: ''})} className="p-1.5 bg-red-500/80 text-slate-900 rounded-lg hover:bg-red-500 transition-colors"><X size={16} /></button>
                    </div>
                </div>
                ) : (
                <button type="button" onClick={handleVideoClick} disabled={uploadingIntro} className="w-full aspect-video border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-blue-500 hover:text-blue-400 transition-colors bg-slate-100/50">
                    {uploadingIntro ? <Loader2 className="animate-spin" size={24} /> : <><Video size={24} /><span className="text-xs">Subir video</span></>}
                </button>
                )}
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Calendar size={18} className="text-blue-400" /> Programación</h2>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={noExpiration} onChange={(e) => setNoExpiration(e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-blue-500 focus:ring-blue-500/20" />
              <span className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">Sin fecha de caducidad</span>
            </label>
          </div>
          
          <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${noExpiration ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fecha de Inicio</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fecha de Término</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Save/Submit */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/courses/${courseId}`)} className="px-6 py-2.5 text-slate-600 hover:text-slate-900 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.title || uploadingThumbnail || uploadingIntro} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar Cambios
          </button>
        </div>

        {/* Modules Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Módulos del Curso</h2>
            <span className="text-xs text-slate-600">{course.modules.length} módulos</span>
          </div>

          <div className="space-y-3">
            {course.modules.map((module, index) => (
              <div key={module.id} className="bg-slate-100/50 border border-slate-300 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <GripVertical size={16} className="text-slate-600" />
                  <span className="text-xs text-slate-600 font-mono">Módulo {index + 1}</span>
                  <span className="text-slate-900 font-medium flex-1">{module.title}</span>
                  <span className="text-xs text-slate-600">{module.videos.length} videos</span>
                </div>

                {module.videos.length > 0 && (
                  <div className="ml-8 space-y-2 mb-3">
                    {module.videos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-2 bg-white/50 rounded-lg group">
                        <PlayCircle size={14} className="text-slate-600" />
                        <span className="text-sm text-slate-700 flex-1">{video.title}</span>
                        <span className="text-xs text-slate-600">{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                        <button 
                          onClick={() => openResourceModal(video.id, video.title)}
                          className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg hover:bg-purple-500/30 transition-all flex items-center gap-1"
                        >
                          <FileText size={12} />
                          Recursos
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ml-8">
                  <button onClick={() => navigate(`/upload?moduleId=${module.id}&courseId=${courseId}`)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Plus size={14} /> Agregar Video
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <input type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="Nombre del nuevo módulo..." className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleAddModule} disabled={addingModule || !newModuleTitle.trim()} className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center gap-2 text-sm">
              {addingModule ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Agregar Módulo
            </button>
          </div>
        </div>
      </div>

      {/* Resource Modal */}
      {resourceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recursos del Video</h3>
                <p className="text-sm text-slate-600 truncate">{resourceModal.videoTitle}</p>
              </div>
              <button onClick={() => setResourceModal(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
                      <a href={`${API_BASE}${resource.url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg hover:bg-blue-500/30 transition-colors">
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
              <input ref={resourceInputRef} type="file" onChange={handleResourceUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp4,.webm" />
              <button 
                onClick={() => resourceInputRef.current?.click()}
                disabled={uploadingResource}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
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
