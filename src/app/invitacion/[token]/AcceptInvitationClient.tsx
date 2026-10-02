'use client';

import { useState } from 'react';
import { acceptInvitation } from '@/app/actions/teamInvitations';
import { useRouter } from 'next/navigation';

export default function AcceptInvitationClient({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const res = await acceptInvitation(token, name, password);

    if (!res.success) {
      setError('error' in res && typeof res.error === 'string' ? res.error : 'Error al aceptar la invitación');
      setLoading(false);
      return;
    }

    router.push('/login?message=Cuenta+creada.+Inicia+sesion+para+continuar.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input 
          type="email" 
          value={email} 
          disabled
          className="w-full bg-[#1A1A1C]/50 border border-gray-800 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Tu Nombre</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Crear Contraseña</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          minLength={8}
          className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Contraseña</label>
        <input 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          minLength={8}
          className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full bg-white text-black px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Procesando...' : 'Aceptar Invitación'}
        </button>
      </div>
    </form>
  );
}
