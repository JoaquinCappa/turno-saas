'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/security';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await requestPasswordReset(email);
    if ('message' in res && res.message) {
      setMessage(res.message);
    } else if ('error' in res && res.error) {
      setMessage(res.error);
    } else {
      setMessage('Operación completada');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Recuperar Contraseña</h2>
        
        {message ? (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md text-sm mb-6 border border-blue-200">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="tu@email.com"
              />
            </div>
  
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black text-white font-medium py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-gray-600">
          <Link href="/login" className="text-black font-semibold hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
