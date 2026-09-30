'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import WhatsAppAction from '@/components/dashboard/WhatsAppAction';
import { createCustomer, updateCustomer, toggleCustomerStatus } from '@/app/actions/customers';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
};

export default function ClientesClient({
  initialCustomers,
  userRole,
  businessName
}: {
  initialCustomers: Customer[],
  userRole: string,
  businessName: string
}) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Confirm state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string, isActive: boolean, title: string } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const filtered = initialCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const openNewModal = () => {
    setError('');
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setError('');
    setEditingCustomer(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');

    setIsSubmitting(true);
    let res;
    if (editingCustomer) {
      res = await updateCustomer(editingCustomer.id, {
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined
      });
    } else {
      res = await createCustomer({
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined
      });
    }
    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setError(res.error || 'Ocurrió un error');
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmModal) return;
    setIsToggling(true);
    const res = await toggleCustomerStatus(confirmModal.id, !confirmModal.isActive);
    setIsToggling(false);

    if (res.success) {
      setConfirmModal(null);
    } else {
      alert(res.error || 'Error al cambiar estado');
    }
  };

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
  };

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <input 
          type="text" 
          placeholder="Buscar por nombre, email o teléfono..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 bg-[#111113] border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 transition-colors"
        />
        {isAdmin && (
          <button 
            onClick={openNewModal}
            className="w-full sm:w-auto whitespace-nowrap bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            + Agregar cliente
          </button>
        )}
      </div>

      {initialCustomers.length === 0 ? (
        <div className="bg-[#111113] border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No tenés clientes todavía.</h3>
          <p className="text-gray-400 mb-6 max-w-sm">Registrá a tus clientes para tener su información siempre a mano.</p>
          {isAdmin && (
            <button onClick={openNewModal} className="bg-white text-black px-6 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors">
              + Agregar cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Contacto</th>
                  <th className="px-6 py-4 font-semibold">Fecha alta</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  {isAdmin && <th className="px-6 py-4 font-semibold text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron clientes con esos datos.
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-[#1A1A1C] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{c.name}</div>
                        {c.notes && <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={c.notes}>{c.notes}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs space-y-1">
                        {c.phone && <div>{c.phone}</div>}
                        {c.email && <div>{c.email}</div>}
                        {(!c.phone && !c.email) && <span>-</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{formatDate(c.createdAt)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.isActive ? 'Activo' : 'Inactivo'} />
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <WhatsAppAction 
                              clientName={c.name} 
                              clientPhone={c.phone || ''} 
                              businessName={businessName} 
                              variant="text"
                            />
                            <button 
                              onClick={() => openEditModal(c)}
                              className="text-gray-400 hover:text-white transition-colors" 
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => setConfirmModal({ isOpen: true, id: c.id, isActive: c.isActive, title: c.name })}
                              className={c.isActive ? "text-red-400 hover:text-red-300 transition-colors" : "text-green-400 hover:text-green-300 transition-colors"}
                            >
                              {c.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}>
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre completo *</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
              placeholder="Ej: Sofía García" 
              disabled={isSubmitting}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono (Opcional)</label>
              <input 
                type="text" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
                placeholder="Ej: +54 9 11 1234 5678" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email (Opcional)</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
                placeholder="Ej: sofia@email.com" 
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notas (Opcional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 min-h-[80px]" 
              placeholder="Alergias, preferencias, etc." 
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center">
              {isSubmitting ? 'Guardando...' : (editingCustomer ? 'Guardar cambios' : 'Crear cliente')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación Estado */}
      <Modal isOpen={confirmModal?.isOpen || false} onClose={() => !isToggling && setConfirmModal(null)} title={confirmModal?.isActive ? 'Desactivar cliente' : 'Activar cliente'}>
        <div className="space-y-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {confirmModal?.isActive 
              ? `¿Querés desactivar a "${confirmModal?.title}"?` 
              : `¿Querés reactivar a "${confirmModal?.title}"?`}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmModal(null)} disabled={isToggling} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button 
              onClick={handleToggleStatus} 
              disabled={isToggling} 
              className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${confirmModal?.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
            >
              {isToggling ? 'Procesando...' : (confirmModal?.isActive ? 'Desactivar' : 'Activar')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
