'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { createProfessional, updateProfessional, toggleProfessionalStatus } from '@/app/actions/professionals';
import ProfessionalSchedulesModal from './ProfessionalSchedulesModal';

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isCustomHoursEnabled: boolean;
};

export default function ProfesionalesClient({
  initialProfessionals,
  businessHours,
  userRole
}: {
  initialProfessionals: Professional[],
  businessHours: { dayOfWeek: string, startMinute: number, endMinute: number }[],
  userRole: string
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  const [professionals, setProfessionals] = useState<Professional[]>(initialProfessionals);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfessionals(initialProfessionals);
  }, [initialProfessionals]);

  // Schedules Modal state
  const [schedulesModal, setSchedulesModal] = useState<{isOpen: boolean, professional: Professional | null}>({isOpen: false, professional: null});

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete/Deactivate state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string, isActive: boolean, title: string } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const openNewModal = () => {
    setError('');
    setEditingProfessional(null);
    setName('');
    setEmail('');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Professional) => {
    setError('');
    setEditingProfessional(p);
    setName(p.name);
    setEmail(p.email || '');
    setPhone(p.phone || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');

    setIsSubmitting(true);

    let res;
    if (editingProfessional) {
      res = await updateProfessional(editingProfessional.id, {
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined
      });
    } else {
      res = await createProfessional({
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined
      });
    }

    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setError(res.error || 'Ocurrió un error inesperado');
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmModal) return;
    setIsToggling(true);
    const res = await toggleProfessionalStatus(confirmModal.id, !confirmModal.isActive);
    setIsToggling(false);

    if (res.success) {
      setConfirmModal(null);
    } else {
      alert(res.error || 'Error al cambiar el estado');
    }
  };

  return (
    <div className="space-y-6">

      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={openNewModal}
            className="whitespace-nowrap bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            + Agregar profesional
          </button>
        </div>
      )}

      {professionals.length === 0 ? (
        <div className="bg-[#111113] border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No tenés profesionales todavía.</h3>
          <p className="text-gray-400 mb-6 max-w-sm">Agregá a las personas que brindan servicios en tu negocio.</p>
          {isAdmin && (
            <button onClick={openNewModal} className="bg-white text-black px-6 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors">
              + Agregar profesional
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map(p => (
            <div key={p.id} className={`bg-[#111113] border ${p.isActive ? 'border-gray-800' : 'border-red-900/30 opacity-75'} rounded-2xl p-6 hover:border-gray-600 transition-colors flex flex-col items-center text-center relative overflow-hidden`}>
              {!p.isActive && (
                <div className="absolute top-0 right-0 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">INACTIVO</div>
              )}
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xl font-bold text-white mb-4">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>

              <div className="text-sm text-gray-400 mb-4 space-y-1">
                {p.email && <div className="truncate w-full max-w-[180px]">{p.email}</div>}
                {p.phone && <div>{p.phone}</div>}
                {(!p.email && !p.phone) && <div className="invisible">Espacio</div>}
              </div>

              <div className="mb-6 flex flex-col items-center gap-2">
                <StatusBadge status={p.isActive ? 'Activo' : 'Inactivo'} />
                <div className="text-xs text-gray-400">
                  Horarios: <span className="font-medium text-gray-300">{p.isCustomHoursEnabled ? 'Personalizados' : 'Globales del negocio'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full mt-auto">
                {isAdmin && (
                  <div className="flex gap-2 w-full">
                    <button onClick={() => openEditModal(p)} className="flex-1 bg-[#1A1A1C] border border-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, id: p.id, isActive: p.isActive, title: p.name })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${p.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {p.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setSchedulesModal({ isOpen: true, professional: p })}
                  className="w-full bg-[#1A1A1C] border border-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  {isAdmin ? 'Configurar horarios' : 'Ver horarios'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingProfessional ? "Editar Profesional" : "Nuevo Profesional"}>
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
              placeholder="Ej: Lucas Martínez"
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
              placeholder="Ej: lucas@email.com"
              disabled={isSubmitting}
            />
          </div>

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

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center">
              {isSubmitting ? 'Guardando...' : (editingProfessional ? 'Guardar cambios' : 'Crear profesional')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación Estado */}
      <Modal isOpen={confirmModal?.isOpen || false} onClose={() => !isToggling && setConfirmModal(null)} title={confirmModal?.isActive ? 'Desactivar profesional' : 'Activar profesional'}>
        <div className="space-y-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {confirmModal?.isActive
              ? `¿Querés desactivar a "${confirmModal?.title}"? Ya no estará disponible para recibir reservas.`
              : `¿Querés reactivar a "${confirmModal?.title}"? Volverá a estar disponible para recibir reservas.`}
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

      <ProfessionalSchedulesModal
        isOpen={schedulesModal.isOpen}
        onClose={() => setSchedulesModal({ isOpen: false, professional: null })}
        professional={schedulesModal.professional}
        businessHours={businessHours}
        isAdmin={isAdmin}
        onUpdated={(isCustomHoursEnabled) => {
          // Update the local list so the UI reflects the toggle immediately
          if (schedulesModal.professional) {
            setProfessionals(prev => prev.map(p =>
              p.id === schedulesModal.professional!.id
                ? { ...p, isCustomHoursEnabled }
                : p
            ));
          }
        }}
      />
    </div>
  );
}
