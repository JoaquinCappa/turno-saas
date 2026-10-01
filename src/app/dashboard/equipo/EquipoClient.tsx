'use client';

import { useState } from 'react';
import { createTeamMember, setTeamMemberActive } from '@/app/actions/team';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  isActive: boolean;
  createdAt: Date;
};

export default function EquipoClient({ initialMembers, currentUserId }: { initialMembers: TeamMember[], currentUserId: string }) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [password, setPassword] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createTeamMember({ name, email, role, password });
    
    if (!res.success) {
      setError(res.error || 'Error al crear miembro');
      setLoading(false);
      return;
    }

    if (res.data) {
      setMembers([...members, res.data as TeamMember]);
    }
    
    setShowModal(false);
    setName('');
    setEmail('');
    setRole('STAFF');
    setPassword('');
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const confirm = window.confirm(`¿Estás seguro de que querés ${currentStatus ? 'desactivar' : 'activar'} este usuario?`);
    if (!confirm) return;

    setLoading(true);
    const res = await setTeamMemberActive(id, !currentStatus);
    
    if (!res.success) {
      alert(res.error || 'Error al actualizar el estado');
    } else {
      setMembers(members.map(m => m.id === id ? { ...m, isActive: !currentStatus } : m));
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          + Nuevo miembro
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-[#1A1A1C] text-gray-300 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Nombre / Email</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Creado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {members.map(member => (
              <tr key={member.id} className="hover:bg-[#1A1A1C] transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-white flex items-center gap-2">
                    {member.name || 'Sin nombre'}
                    {member.id === currentUserId && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                        Tú
                      </span>
                    )}
                  </div>
                  <div className="text-xs">{member.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                    member.role === 'OWNER' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    member.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                    'bg-gray-700/50 text-gray-300 border border-gray-600'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${member.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {member.isActive ? 'Activo' : 'Inactivo'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(member.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                </td>
                <td className="px-6 py-4 text-right">
                  {member.id !== currentUserId && (
                    <button
                      onClick={() => handleToggleStatus(member.id, member.isActive)}
                      disabled={loading}
                      className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {member.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron miembros del equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-6">Nuevo Miembro</h3>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Ej: juan@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña Inicial</label>
                <input 
                  type="text" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={8}
                  className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'STAFF')}
                  className="w-full bg-[#1A1A1C] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="STAFF">STAFF (Solo Turnos)</option>
                  <option value="ADMIN">ADMIN (Acceso Total)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-transparent border border-gray-700 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white text-black px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear Miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
