'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import WhatsAppAction from '@/components/dashboard/WhatsAppAction';
import { createBooking, cancelBooking, completeBooking } from '@/app/actions/bookings';
import { formatBusinessDate } from '@/lib/date-utils';

type BookingItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  serviceName: string;
  customer: { name: string; phone: string | null };
  professional: { name: string };
};

export default function TurnosClient({
  initialBookings,
  customers,
  services,
  professionals,
  businessName,
  businessTimezone,
  userRole
}: {
  initialBookings: (Omit<BookingItem, 'startAt' | 'endAt'> & { startAt: string | Date; endAt: string | Date })[];
  customers: { id: string; name: string; phone: string | null }[];
  services: { id: string; name: string; duration: number; price: number }[];
  professionals: { id: string; name: string }[];
  businessName: string;
  businessTimezone: string;
  userRole: string;
}) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Actions
  const [actionModal, setActionModal] = useState<{ isOpen: boolean, id: string, type: 'cancel' | 'complete' } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const bookings: BookingItem[] = initialBookings.map((b) => ({
    ...b,
    startAt: new Date(b.startAt),
    endAt: new Date(b.endAt),
  } as BookingItem));

  const filtered = bookings.filter(b => {
    const statusMatch = filter === 'Todos' || 
                        (filter === 'Confirmado' && b.status === 'CONFIRMED') ||
                        (filter === 'Pendiente' && b.status === 'PENDING') ||
                        (filter === 'Cancelado' && b.status === 'CANCELLED');
    
    const searchMatch = b.customer.name.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const handleSave = async () => {
    setError('');
    if (!customerId || !serviceId || !professionalId || !localDate || !localTime) {
      return setError('Por favor completá todos los campos obligatorios');
    }

    setIsSubmitting(true);
    const res = await createBooking({
      customerId,
      serviceId,
      professionalId,
      localDate,
      localTime,
      notes: notes.trim() || undefined
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      // Reset form
      setCustomerId('');
      setServiceId('');
      setProfessionalId('');
      setLocalDate('');
      setLocalTime('');
      setNotes('');
    } else {
      setError(res.error || 'Error al crear turno');
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setIsActioning(true);
    
    let res;
    if (actionModal.type === 'cancel') {
      res = await cancelBooking(actionModal.id);
    } else {
      res = await completeBooking(actionModal.id);
    }
    
    setIsActioning(false);
    
    if (res.success) {
      setActionModal(null);
    } else {
      alert(res.error || 'Error al procesar la acción');
    }
  };

  const mapStatus = (status: string) => {
    if (status === 'CONFIRMED') return 'Confirmado';
    if (status === 'PENDING') return 'Pendiente';
    if (status === 'CANCELLED') return 'Cancelado';
    if (status === 'COMPLETED') return 'Completado';
    if (status === 'NO_SHOW') return 'Ausente';
    return status;
  };

  const selectedService = services.find(s => s.id === serviceId);

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-[#111113] border border-gray-800 rounded-lg p-1">
          {['Todos', 'Confirmado', 'Pendiente', 'Cancelado'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {f === 'Confirmado' ? 'Confirmados' : f === 'Pendiente' ? 'Pendientes' : f === 'Cancelado' ? 'Cancelados' : 'Todos'}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-[#111113] border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 transition-colors"
          />
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="whitespace-nowrap bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              + Nuevo turno
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Fecha y Hora</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Servicio</th>
                <th className="px-6 py-4 font-semibold">Profesional</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                {isAdmin && <th className="px-6 py-4 font-semibold text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron turnos.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const dateStr = formatBusinessDate(t.startAt, businessTimezone, 'dd/MM/yyyy');
                  const timeStr = formatBusinessDate(t.startAt, businessTimezone, 'HH:mm');
                  const isCancelable = t.status === 'CONFIRMED' || t.status === 'PENDING';
                  const isCompletable = t.status === 'CONFIRMED' || t.status === 'PENDING';

                  return (
                  <tr key={t.id} className="hover:bg-[#1A1A1C] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-mono font-bold">{timeStr}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{dateStr}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-200 font-medium">{t.customer.name}</div>
                      {t.customer.phone && <div className="text-xs text-gray-500 font-mono mt-0.5">{t.customer.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{t.serviceName}</td>
                    <td className="px-6 py-4 text-gray-400">{t.professional.name}</td>
                    <td className="px-6 py-4"><StatusBadge status={mapStatus(t.status)} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-4 text-gray-400 text-sm">
                          {t.customer.phone && (
                            <WhatsAppAction 
                              clientName={t.customer.name} 
                              clientPhone={t.customer.phone} 
                              businessName={businessName}
                              turnoInfo={{ time: `${dateStr} a las ${timeStr}`, service: t.serviceName }}
                              variant="text"
                            />
                          )}
                          
                          {isCompletable && (
                            <button 
                              onClick={() => setActionModal({ isOpen: true, id: t.id, type: 'complete' })}
                              className="text-green-500 hover:text-green-400 transition-colors font-medium"
                            >
                              Completar
                            </button>
                          )}
                          {isCancelable && (
                            <button 
                              onClick={() => setActionModal({ isOpen: true, id: t.id, type: 'cancel' })}
                              className="text-red-500 hover:text-red-400 transition-colors font-medium"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Nuevo Turno">
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente *</label>
            <select 
              value={customerId} 
              onChange={e => setCustomerId(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
              disabled={isSubmitting}
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Servicio *</label>
              <select 
                value={serviceId} 
                onChange={e => setServiceId(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
                disabled={isSubmitting}
              >
                <option value="">Seleccionar servicio...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedService && (
                <p className="text-xs text-gray-500 mt-1">
                  Duración: {selectedService.duration} min | Precio: ${selectedService.price}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Profesional *</label>
              <select 
                value={professionalId} 
                onChange={e => setProfessionalId(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
                disabled={isSubmitting}
              >
                <option value="">Seleccionar profesional...</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Fecha *</label>
              <input 
                type="date" 
                value={localDate}
                onChange={e => setLocalDate(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 [color-scheme:dark]" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Hora *</label>
              <input 
                type="time" 
                value={localTime}
                onChange={e => setLocalTime(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 [color-scheme:dark]" 
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notas (Opcional)</label>
            <input 
              type="text" 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
              placeholder="Ej: Primera vez" 
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Crear turno'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación de Acciones */}
      <Modal isOpen={actionModal?.isOpen || false} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.type === 'cancel' ? 'Cancelar Turno' : 'Completar Turno'}>
        <div className="space-y-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {actionModal?.type === 'cancel' 
              ? '¿Estás seguro que querés cancelar este turno? Este espacio quedará disponible nuevamente.' 
              : '¿Marcar este turno como completado? Esto indica que el servicio ya fue brindado.'}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setActionModal(null)} disabled={isActioning} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cerrar</button>
            <button 
              onClick={handleAction} 
              disabled={isActioning} 
              className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${actionModal?.type === 'cancel' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
            >
              {isActioning ? 'Procesando...' : (actionModal?.type === 'cancel' ? 'Cancelar turno' : 'Completar turno')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
