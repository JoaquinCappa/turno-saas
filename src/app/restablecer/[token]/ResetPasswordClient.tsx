'use client';

import { useState } from 'react';
import { resetPassword } from '@/app/actions/security';
import Link from 'next/link';

export default function ResetPasswordClient({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const res = await resetPassword(token, password, confirmPassword);

    if (!res.success) {
      setError('error' in res && typeof res.error === 'string' ? res.error : 'Error al restablecer la contraseña');
      setLoading(false);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm border border-green-200">
          Tu contraseña ha sido actualizada exitosamente.
        </div>
        <Link 
          href="/login" 
          className="inline-block w-full bg-black text-white font-medium py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
        >
          Ir a Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          minLength={8}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
        <input 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          minLength={8}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full bg-black text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Procesando...' : 'Cambiar Contraseña'}
        </button>
      </div>
    </form>
  );
}
