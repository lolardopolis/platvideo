import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

export function VerifyEmailPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verificationToken = searchParams.get('token');
  
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (verificationToken) {
      verifyEmail(verificationToken);
    }
  }, [verificationToken]);

  const verifyEmail = async (verifyToken: string) => {
    setStatus('verifying');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('¡Email verificado correctamente!');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Token inválido o expirado');
      }
    } catch {
      setStatus('error');
      setMessage('Error de conexión');
    }
  };

  const handleResend = async () => {
    if (!token) return;
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Email de verificación enviado. Revisa tu bandeja de entrada.');
      } else {
        setMessage(data.error || 'Error al reenviar');
      }
    } catch {
      setMessage('Error de conexión');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If verifying from token in URL
  if (verificationToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 mx-auto animate-spin mb-4" />
              <h1 className="text-2xl font-bold text-slate-900">Verificando...</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Verificado!</h1>
              <p className="text-slate-600">{message}</p>
              <p className="text-sm text-slate-600 mt-4">Redirigiendo...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
              <p className="text-slate-600">{message}</p>
              <button onClick={() => navigate('/login')} className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg">
                Ir al Login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pending verification screen
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-10 w-10 text-blue-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifica tu email</h1>
        <p className="text-slate-600 mb-6">
          Hemos enviado un enlace de verificación a <span className="text-slate-900 font-medium">{user?.email}</span>
        </p>
        
        <div className="bg-slate-100/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-600">
            Revisa tu bandeja de entrada y haz click en el enlace para activar tu cuenta.
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
            {message}
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center justify-center gap-2 mb-4"
        >
          {resending ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          Reenviar email de verificación
        </button>

        <button onClick={handleLogout} className="text-slate-600 hover:text-slate-900 text-sm">
          Cerrar sesión
        </button>

        <p className="text-xs text-slate-600 mt-6">
          ¿No encuentras el email? Revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}
