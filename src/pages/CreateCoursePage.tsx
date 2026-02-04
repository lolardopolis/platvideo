import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, Eye, ChevronDown, Loader2, Upload, Image, X, Video, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesApi } from '../services/api';

const API_BASE = 'http://localhost:3001';

export function CreateCoursePage() {
  const { token, role } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [noExpiration, setNoExpiration] = useState(true);
  
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
      const data = await coursesApi.uploadIntro('', file, token);
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

  const removeThumbnail = () => {
    setThumbnailPreview(null);
    setForm({ ...form, thumbnail: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeVideo = () => {
    setForm({ ...form, introVideo: '' });
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const course = await coursesApi.create({
        ...form,
        startDate: noExpiration ? null : form.startDate,
        endDate: noExpiration ? null : form.endDate,
        maxEnrollments: form.maxEnrollments ? parseInt(form.maxEnrollments) : null,
      }, token);
      navigate(`/courses/${course.id}`);
    } catch (err) {
      console.error('Failed to create course:', err);
    } finally {
      setSaving(false);
    }
  };

  if ((role as string) !== 'tutor' && (role as string) !== 'admin') {
    return <div className="text-center py-20"><p className="text-slate-600">Solo los tutores pueden crear cursos.</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Volver
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Crear Nuevo Curso</h1>
        <p className="text-slate-600 mt-1">Configura los detalles de tu curso para empezar a enseñar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Información Básica</h2>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Título del Curso *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ej: Desarrollo Web con React" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Descripción *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} placeholder="Describe lo que aprenderán los estudiantes..." className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all" />
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
                <label className="block text-sm text-slate-600 mb-1">Modo de Inscripción</label>
                <div className="relative">
                <select value={form.enrollmentMode} onChange={(e) => setForm({ ...form, enrollmentMode: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="OPEN">Abierto</option>
                    <option value="APPLICATION">Con Postulación</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
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
                Portada (Recomendado 1920×1080)
                </label>
                
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleThumbnailChange} className="hidden" />

                {thumbnailPreview || form.thumbnail ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video">
                    <img src={thumbnailPreview || (form.thumbnail.startsWith('/') ? `${API_BASE}${form.thumbnail}` : form.thumbnail)} alt="Portada" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={handleThumbnailClick} className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-slate-900 text-xs rounded-lg hover:bg-white/30 transition-colors">Cambiar</button>
                    <button type="button" onClick={removeThumbnail} className="p-1.5 bg-red-500/80 text-slate-900 rounded-lg hover:bg-red-500 transition-colors"><X size={16} /></button>
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
                Video de Introducción (Máx 100MB)
                </label>
                
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />

                {form.introVideo ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video flex flex-col items-center justify-center gap-2">
                    <PlayCircle size={40} className="text-blue-400" />
                    <span className="text-xs text-slate-600">Video cargado</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={handleVideoClick} className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-slate-900 text-xs rounded-lg hover:bg-white/30 transition-colors">Cambiar</button>
                    <button type="button" onClick={removeVideo} className="p-1.5 bg-red-500/80 text-slate-900 rounded-lg hover:bg-red-500 transition-colors"><X size={16} /></button>
                    </div>
                </div>
                ) : (
                <button type="button" onClick={handleVideoClick} disabled={uploadingIntro} className="w-full aspect-video border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-blue-500 hover:text-blue-400 transition-colors bg-slate-100/50">
                    {uploadingIntro ? <Loader2 className="animate-spin" size={24} /> : <><Video size={24} /><span className="text-xs">Subir video corto</span></>}
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

        {/* Visibility */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><Eye size={18} className="text-green-400" /> Visibilidad</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Visibilidad</label>
              <div className="relative">
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                  <option value="PUBLIC">Público (en catálogo)</option>
                  <option value="PRIVATE">Privado (solo invitados)</option>
                  <option value="UNLISTED">No listado (con link)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Máximo Inscritos (Opcional)</label>
              <input type="number" value={form.maxEnrollments} onChange={(e) => setForm({ ...form, maxEnrollments: e.target.value })} placeholder="Sin límite" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 text-slate-600 hover:text-slate-900 transition-colors font-medium">Cancelar</button>
          <button type="submit" disabled={saving || !form.title || !form.description || uploadingThumbnail || uploadingIntro} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Crear Curso
          </button>
        </div>
      </form>
    </div>
  );
}
