'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { createBooking, cancelBooking, completeBooking, confirmBooking, noShowBooking } from '@/app/actions/bookings';
import { formatBusinessDate } from '@/lib/date-utils';

type BookingItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  notes: string | null;
  customer: { name: string; phone: string | null; email: string | null };
  professional: { name: string };
};

export default function TurnosClient({
  initialBookings,
  customers,
  services,
  professionals,
  businessTimezone,
  currentPage,
  totalItems,
  pageSize,
  filters
}: {
  initialBookings: (Omit<BookingItem, 'startAt' | 'endAt'> & { startAt: string | Date; endAt: string | Date })[];
  customers: { id: string; name: string; phone: string | null }[];
  services: { id: string; name: string; duration: number; price: number }[];
  professionals: { id: string; name: string }[];
  businessTimezone: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  filters: { status: string; prof: string; service: string; date: string; q: string };
}) {
  const router = useRouter();

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Local Filter State (for controlled inputs before pushing to URL)
  const [localFilters, setLocalFilters] = useState(filters);
  const hasActiveFilters = filters.status || filters.prof || filters.service || filters.date || filters.q;

  // Actions state
  const [isActioning, setIsActioning] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  const bookings = initialBookings.map(b => ({
    ...b,
    startAt: new Date(b.startAt),
    endAt: new Date(b.endAt),
  }));

  const pushFilters = (newFilters: typeof localFilters, page = 1) => {
    const params = new URLSearchParams();
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.prof) params.set('prof', newFilters.prof);
    if (newFilters.service) params.set('service', newFilters.service);
    if (newFilters.date) params.set('date', newFilters.date);
    if (newFilters.q) params.set('q', newFilters.q);
    if (page > 1) params.set('page', page.toString());
    
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
    const next = { ...localFilters, [key]: value };
    setLocalFilters(next);
    pushFilters(next, 1);
  };

  const handleClearFilters = () => {
    const next = { status: '', prof: '', service: '', date: '', q: '' };
    setLocalFilters(next);
    pushFilters(next, 1);
  };

  const handleSaveCreate = async () => {
    setFormError('');
    if (!customerId || !serviceId || !professionalId || !localDate || !localTime) {
      return setFormError('Por favor completá todos los campos obligatorios');
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
      setIsCreateOpen(false);
      setCustomerId(''); setServiceId(''); setProfessionalId(''); setLocalDate(''); setLocalTime(''); setNotes('');
    } else {
      setFormError(res.error || 'Error al guardar');
    }
  };

  const executeAction = async (action: 'confirm' | 'complete' | 'cancel' | 'noshow', id: string) => {
    setIsActioning(true);
    let res;
    switch (action) {
      case 'confirm': res = await confirmBooking(id); break;
      case 'complete': res = await completeBooking(id); break;
      case 'cancel': res = await cancelBooking(id); break;
      case 'noshow': res = await noShowBooking(id); break;
    }
    setIsActioning(false);
    if (res.success) {
      setSelectedBooking(null); // Close modal if open
    } else {
      alert(res.error || 'Error al procesar la acción');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="space-y-6">

      {/* FILTER BAR */}
      <div className="bg-[#111113] border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold">Filtros</h2>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="text-sm text-gray-400 hover:text-white transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={localFilters.q}
            onChange={e => setLocalFilters({ ...localFilters, q: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && pushFilters(localFilters, 1)}
            className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <input
            type="date"
            value={localFilters.date}
            onChange={e => handleFilterChange('date', e.target.value)}
            className="w-full bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <select value={localFilters.status} onChange={e => handleFilterChange('status', e.target.value)} className="w-full bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500">
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="NO_SHOW">No asistió</option>
          </select>
          <select value={localFilters.prof} onChange={e => handleFilterChange('prof', e.target.value)} className="w-full bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500">
            <option value="">Profesionales (Todos)</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={localFilters.service} onChange={e => handleFilterChange('service', e.target.value)} className="w-full bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500">
            <option value="">Servicios (Todos)</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setIsCreateOpen(true)} className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
          + Nuevo turno
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-[#111113] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Fecha y Hora</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Servicio</th>
                <th className="px-6 py-4 font-semibold">Profesional</th>
                <th className="px-6 py-4 font-semibold text-right">Duración/Precio</th>
                <th className="px-6 py-4 font-semibold text-right">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron turnos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const dateStr = formatBusinessDate(b.startAt, businessTimezone, 'dd/MM/yyyy');
                  const timeStr = formatBusinessDate(b.startAt, businessTimezone, 'HH:mm');
                  const isPending = b.status === 'PENDING';
                  const isConfirmed = b.status === 'CONFIRMED';
                  
                  return (
                    <tr key={b.id} className="hover:bg-[#1A1A1C] transition-colors cursor-pointer" onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      setSelectedBooking(b);
                    }}>
                      <td className="px-6 py-4 text-white font-mono">{dateStr} {timeStr}</td>
                      <td className="px-6 py-4 text-gray-300 font-medium">{b.customer.name}</td>
                      <td className="px-6 py-4 text-gray-400">{b.serviceName}</td>
                      <td className="px-6 py-4 text-gray-400">{b.professional.name}</td>
                      <td className="px-6 py-4 text-gray-400 text-right">{b.serviceDuration}m / ${b.servicePrice}</td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge status={b.status === 'CONFIRMED' ? 'Confirmado' : b.status === 'PENDING' ? 'Pendiente' : b.status === 'COMPLETED' ? 'Completado' : b.status === 'CANCELLED' ? 'Cancelado' : 'Ausente'} />
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        {isPending && (
                          <button onClick={() => executeAction('confirm', b.id)} disabled={isActioning} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-md transition-colors" title="Confirmar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        {isConfirmed && (
                          <button onClick={() => executeAction('complete', b.id)} disabled={isActioning} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors" title="Completar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                          </button>
                        )}
                        {(isPending || isConfirmed) && (
                          <>
                            <button onClick={() => executeAction('cancel', b.id)} disabled={isActioning} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Cancelar">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <button onClick={() => executeAction('noshow', b.id)} disabled={isActioning} className="p-1.5 text-orange-500 hover:bg-orange-500/10 rounded-md transition-colors" title="No asistió">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalItems)} de {totalItems}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => pushFilters(localFilters, currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button 
                onClick={() => pushFilters(localFilters, currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREAR TURNO */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo Turno">
        <div className="space-y-4 mt-2">
          {formError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{formError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500">
              <option value="">Seleccionar cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Servicio</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500">
              <option value="">Seleccionar servicio</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - ${s.price})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Profesional</label>
            <select value={professionalId} onChange={e => setProfessionalId(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500">
              <option value="">Seleccionar profesional</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
              <input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hora</label>
              <input type="time" value={localTime} onChange={e => setLocalTime(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500"></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={handleSaveCreate} disabled={isSubmitting} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Crear Turno'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DETALLE DE TURNO */}
      <Modal isOpen={!!selectedBooking} onClose={() => !isActioning && setSelectedBooking(null)} title="Detalle del Turno">
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedBooking.customer.name}</h3>
                {selectedBooking.customer.phone && <p className="text-gray-400 font-mono mt-1">{selectedBooking.customer.phone}</p>}
                {selectedBooking.customer.email && <p className="text-gray-500 text-sm mt-1">{selectedBooking.customer.email}</p>}
              </div>
              <StatusBadge status={selectedBooking.status === 'CONFIRMED' ? 'Confirmado' : selectedBooking.status === 'PENDING' ? 'Pendiente' : selectedBooking.status === 'COMPLETED' ? 'Completado' : selectedBooking.status === 'CANCELLED' ? 'Cancelado' : 'Ausente'} />
            </div>
            
            <div className="bg-[#1A1A1C] border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Servicio</span>
                <span className="text-white font-medium">{selectedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duración</span>
                <span className="text-white font-medium">{selectedBooking.serviceDuration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Precio</span>
                <span className="text-green-400 font-medium">${selectedBooking.servicePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Profesional</span>
                <span className="text-white font-medium">{selectedBooking.professional.name}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between items-center">
                <span className="text-gray-400">Horario</span>
                <span className="text-white font-mono font-bold">
                  {formatBusinessDate(selectedBooking.startAt, businessTimezone, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>

            {selectedBooking.notes && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Notas</p>
                <p className="text-white bg-[#1A1A1C] p-3 rounded-lg border border-gray-800">{selectedBooking.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-800">
              <button onClick={() => setSelectedBooking(null)} disabled={isActioning} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Cerrar
              </button>
              {selectedBooking.status === 'PENDING' && (
                <button onClick={() => executeAction('confirm', selectedBooking.id)} disabled={isActioning} className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  Confirmar
                </button>
              )}
              {selectedBooking.status === 'CONFIRMED' && (
                <button onClick={() => executeAction('complete', selectedBooking.id)} disabled={isActioning} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  Completar
                </button>
              )}
              {(selectedBooking.status === 'PENDING' || selectedBooking.status === 'CONFIRMED') && (
                <>
                  <button onClick={() => executeAction('noshow', selectedBooking.id)} disabled={isActioning} className="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                    Ausente
                  </button>
                  <button onClick={() => executeAction('cancel', selectedBooking.id)} disabled={isActioning} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
