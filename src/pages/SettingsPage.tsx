import { useState, useRef } from 'react';
import { User, Lock, Mail, Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

export function SettingsPage() {
  const { user, token, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        showMessage('success', 'Perfil actualizado correctamente');
      } else {
        showMessage('error', data.error || 'Error al actualizar');
      }
    } catch {
      showMessage('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (passwords.newPassword !== passwords.confirmPassword) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }
    if (passwords.newPassword.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showMessage('success', 'Contraseña actualizada');
      } else {
        showMessage('error', data.error || 'Error al cambiar contraseña');
      }
    } catch {
      showMessage('error', 'Error de conexión');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const res = await fetch(`${API_BASE}/users/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        showMessage('success', 'Foto de perfil actualizada');
      } else {
        showMessage('error', data.error || 'Error al subir imagen');
      }
    } catch {
      showMessage('error', 'Error de conexión');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResendVerification = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', 'Email de verificación enviado');
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', 'Error de conexión');
    }
  };

  const avatarUrl = user?.avatar?.startsWith('/') ? `${API_BASE.replace('/api', '')}${user.avatar}` : null;

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Configuración</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <User size={20} className="text-blue-400" /> Perfil
        </h2>

        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div 
              onClick={handleAvatarClick}
              className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-slate-900 cursor-pointer overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
            >
              {uploadingAvatar ? (
                <Loader2 className="animate-spin" size={24} />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.avatar || user?.name?.substring(0, 2).toUpperCase()
              )}
            </div>
            <button 
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 h-7 w-7 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
            >
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div>
            <p className="text-slate-900 font-medium">{user?.name}</p>
            <p className="text-slate-600 text-sm">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-1">Click en la foto para cambiar</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nombre</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            Guardar Cambios
          </button>
        </div>
      </section>

      {/* Email Verification */}
      {user && !user.emailVerified && (
        <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <Mail className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-yellow-400">Email no verificado</h3>
              <p className="text-sm text-yellow-300/70 mt-1">Verifica tu email para acceder a todas las funcionalidades.</p>
              <button onClick={handleResendVerification} className="mt-3 text-sm text-yellow-400 hover:text-yellow-300 underline">
                Reenviar email de verificación
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Security Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Lock size={20} className="text-green-400" /> Seguridad
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Contraseña Actual</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nueva Contraseña</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !passwords.currentPassword || !passwords.newPassword}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center gap-2"
          >
            {changingPassword && <Loader2 className="animate-spin" size={16} />}
            Cambiar Contraseña
          </button>
        </div>
      </section>
    </div>
  );
}
