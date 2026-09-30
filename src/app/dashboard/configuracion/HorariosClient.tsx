'use client';

import { useState } from 'react';
import { DayOfWeek } from '@prisma/client';
import Modal from '@/components/dashboard/Modal';
import { createBusinessHour, deleteBusinessHour } from '@/app/actions/businessHours';

type BusinessHour = {
  id: string;
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
};

const DAYS = [
  { value: DayOfWeek.MONDAY, label: 'Lunes' },
  { value: DayOfWeek.TUESDAY, label: 'Martes' },
  { value: DayOfWeek.WEDNESDAY, label: 'Miércoles' },
  { value: DayOfWeek.THURSDAY, label: 'Jueves' },
  { value: DayOfWeek.FRIDAY, label: 'Viernes' },
  { value: DayOfWeek.SATURDAY, label: 'Sábado' },
  { value: DayOfWeek.SUNDAY, label: 'Domingo' }
];

export default function HorariosClient({
  initialHours,
  userRole
}: {
  initialHours: BusinessHour[],
  userRole: string
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  
  // Form
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const formatMinute = (minute: number) => {
    const h = Math.floor(minute / 60).toString().padStart(2, '0');
    const m = (minute % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const parseMinute = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
  };

  const openNewModal = (day: DayOfWeek) => {
    setSelectedDay(day);
    setStartTime('09:00');
    setEndTime('18:00');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    const startMin = parseMinute(startTime);
    const endMin = parseMinute(endTime);

    if (startMin >= endMin) {
      return setError('La hora de inicio debe ser anterior a la hora de fin.');
    }

    setIsSubmitting(true);
    const res = await createBusinessHour({
      dayOfWeek: selectedDay,
      startMinute: startMin,
      endMinute: endMin
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteBusinessHour(id);
    if (!res.success) {
      alert(res.error || 'Error al eliminar');
    }
    setDeletingId(null);
  };

  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Horarios de atención</h3>
          <p className="text-sm text-gray-400">Configurá la disponibilidad semanal de tu negocio.</p>
        </div>
      </div>
      
      <div className="divide-y divide-gray-800">
        {DAYS.map(day => {
          const hoursForDay = initialHours.filter(h => h.dayOfWeek === day.value).sort((a, b) => a.startMinute - b.startMinute);
          
          return (
            <div key={day.value} className="p-6 flex flex-col sm:flex-row gap-4 hover:bg-[#151517] transition-colors">
              <div className="w-32 flex-shrink-0 font-medium text-white">
                {day.label}
              </div>
              <div className="flex-1 space-y-3">
                {hoursForDay.length === 0 ? (
                  <div className="text-sm text-gray-500">Cerrado</div>
                ) : (
                  hoursForDay.map(hour => (
                    <div key={hour.id} className="flex items-center gap-3">
                      <div className="bg-[#1A1A1C] border border-gray-700 px-3 py-1.5 rounded-md text-sm font-mono text-gray-300">
                        {formatMinute(hour.startMinute)} — {formatMinute(hour.endMinute)}
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(hour.id)}
                          disabled={deletingId === hour.id}
                          className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Eliminar intervalo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {isAdmin && (
                <div>
                  <button 
                    onClick={() => openNewModal(day.value)}
                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={`Agregar horario - ${DAYS.find(d => d.value === selectedDay)?.label}`}>
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Inicio</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 [color-scheme:dark]" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Fin</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 [color-scheme:dark]" 
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center">
              {isSubmitting ? 'Guardando...' : 'Guardar horario'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
