'use client';

import { useState } from 'react';
import { changePassword } from '@/app/actions/security';
import { signOut } from 'next-auth/react';

export default function SecurityClient() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPass !== confirmPass) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    const res = await changePassword(current, newPass, confirmPass);

    if (!res.success) {
      setError('error' in res && typeof res.error === 'string' ? res.error : 'Error al cambiar la contraseña');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setCurrent('');
    setNewPass('');
    setConfirmPass('');
    setLoading(false);
    
    // Invalida la sesion del cliente ya que el JWT fue revocado
    setTimeout(() => {
      signOut({ callbackUrl: '/login' });
    }, 2000);
  };

  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Seguridad</h2>
        <p className="text-sm text-gray-400">Actualiza tu contraseña. Al cambiarla, tu sesión actual se cerrará.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Contraseña actualizada con éxito. Redirigiendo...
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña Actual</label>
          <input 
            type="password" 
            value={current} 
            onChange={(e) => setCurrent(e.target.value)} 
            required 
            className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nueva Contraseña</label>
          <input 
            type="password" 
            value={newPass} 
            onChange={(e) => setNewPass(e.target.value)} 
            required 
            minLength={8}
            className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Nueva Contraseña</label>
          <input 
            type="password" 
            value={confirmPass} 
            onChange={(e) => setConfirmPass(e.target.value)} 
            required 
            minLength={8}
            className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-white text-black px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={loading || success}
          >
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
