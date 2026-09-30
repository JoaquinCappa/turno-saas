'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import { createService, updateService, toggleServiceStatus } from '@/app/actions/services';

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  isActive: boolean;
};

export default function ServiciosClient({ 
  initialServices,
  userRole 
}: { 
  initialServices: Service[],
  userRole: string 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete/Deactivate state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string, isActive: boolean, title: string } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  };

  const openNewModal = () => {
    setError('');
    setEditingService(null);
    setName('');
    setDuration('');
    setPrice('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Service) => {
    setError('');
    setEditingService(s);
    setName(s.name);
    setDuration(s.duration.toString());
    setPrice(s.price.toString());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');
    const durNum = parseInt(duration);
    if (isNaN(durNum) || durNum <= 0) return setError('La duración debe ser un número válido mayor a 0');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return setError('El precio debe ser un número válido');

    setIsSubmitting(true);
    
    let res;
    if (editingService) {
      res = await updateService(editingService.id, { name, duration: durNum, price: priceNum });
    } else {
      res = await createService({ name, duration: durNum, price: priceNum });
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
    const res = await toggleServiceStatus(confirmModal.id, !confirmModal.isActive);
    setIsToggling(false);
    
    if (res.success) {
      setConfirmModal(null);
    } else {
      alert(res.error || 'Error al cambiar el estado'); // Fallback en caso raro, normalmente iría un toast
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
            + Nuevo servicio
          </button>
        </div>
      )}

      {initialServices.length === 0 ? (
        <div className="bg-[#111113] border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No tenés servicios todavía.</h3>
          <p className="text-gray-400 mb-6 max-w-sm">Creá tu primer servicio para empezar a recibir reservas en tu negocio.</p>
          {isAdmin && (
            <button onClick={openNewModal} className="bg-white text-black px-6 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors">
              + Nuevo servicio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialServices.map(s => (
            <div key={s.id} className={`bg-[#111113] border ${s.isActive ? 'border-gray-800' : 'border-red-900/30 opacity-75'} rounded-2xl p-6 hover:border-gray-600 transition-colors relative overflow-hidden`}>
              {!s.isActive && (
                <div className="absolute top-0 right-0 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">INACTIVO</div>
              )}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white pr-10 truncate">{s.name}</h3>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duración</span>
                  <span className="text-gray-300 font-medium">{formatDuration(s.duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Precio</span>
                  <span className="text-gray-300 font-medium">{formatPrice(s.price)}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEditModal(s)} className="flex-1 bg-[#1A1A1C] border border-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                    Editar
                  </button>
                  <button 
                    onClick={() => setConfirmModal({ isOpen: true, id: s.id, isActive: s.isActive, title: s.name })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${s.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                  >
                    {s.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingService ? "Editar Servicio" : "Nuevo Servicio"}>
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del servicio</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
              placeholder="Ej: Corte clásico" 
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Duración (minutos)</label>
              <input 
                type="number" 
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
                placeholder="45" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Precio ($)</label>
              <input 
                type="number" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
                placeholder="8000" 
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center">
              {isSubmitting ? 'Guardando...' : (editingService ? 'Guardar cambios' : 'Crear servicio')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación Estado */}
      <Modal isOpen={confirmModal?.isOpen || false} onClose={() => !isToggling && setConfirmModal(null)} title={confirmModal?.isActive ? 'Desactivar servicio' : 'Activar servicio'}>
        <div className="space-y-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {confirmModal?.isActive 
              ? `¿Querés desactivar "${confirmModal?.title}"? Los clientes no podrán reservarlo mientras esté desactivado.` 
              : `¿Querés reactivar "${confirmModal?.title}"? Volverá a estar disponible para que los clientes lo reserven.`}
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
