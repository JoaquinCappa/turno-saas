'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import { createBlockedTime, deleteBlockedTime } from '@/app/actions/blockedTimes';
import { formatBusinessDate } from '@/lib/date-utils';

type BlockedTime = {
  id: string;
  date: Date;
  startMinute: number;
  endMinute: number;
  title: string | null;
};

export default function BloqueosClient({
  initialBlocks,
  userRole
}: {
  initialBlocks: (Omit<BlockedTime, 'date'> & { date: string | Date })[];
  userRole: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [localDate, setLocalDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [title, setTitle] = useState('');

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const blocks: BlockedTime[] = initialBlocks.map(b => ({
    ...b,
    date: new Date(b.date)
  }));

  // Sort blocks by date asc, startMinute asc
  blocks.sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
    return a.startMinute - b.startMinute;
  });

  // Separate upcoming and past based on today's date in local timezone
  // We use date comparison
  
  const parseMinute = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
  };

  const formatMinute = (minute: number) => {
    const h = Math.floor(minute / 60).toString().padStart(2, '0');
    const m = (minute % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleSave = async () => {
    setError('');
    const startMin = parseMinute(startTime);
    const endMin = parseMinute(endTime);

    if (!localDate) return setError('Seleccioná una fecha válida');
    if (startMin >= endMin) return setError('La hora de inicio debe ser anterior a la hora de fin');

    setIsSubmitting(true);
    const res = await createBlockedTime({
      localDate,
      startMinute: startMin,
      endMinute: endMin,
      title
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setLocalDate('');
      setTitle('');
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteBlockedTime(id);
    if (!res.success) alert(res.error || 'Error al eliminar');
    setDeletingId(null);
  };

  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Bloqueos de agenda</h3>
          <p className="text-sm text-gray-400">Días u horarios excepcionales donde el negocio está cerrado.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">
            + Agregar bloqueo
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-800">
        {blocks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay bloqueos configurados.</div>
        ) : (
          blocks.map(block => {
            const dateStr = formatBusinessDate(block.date, 'UTC', 'dd/MM/yyyy'); // Date is stored at UTC midnight natively representing the local date
            return (
              <div key={block.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-[#1A1A1C] transition-colors">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{dateStr}</span>
                    <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded font-mono">
                      {formatMinute(block.startMinute)} - {formatMinute(block.endMinute)}
                    </span>
                  </div>
                  {block.title && <p className="text-gray-400 text-sm mt-1">{block.title}</p>}
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(block.id)} 
                    disabled={deletingId === block.id}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Agregar bloqueo de agenda">
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
            <input 
              type="date" 
              value={localDate}
              onChange={e => setLocalDate(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 [color-scheme:dark]" 
              disabled={isSubmitting}
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Motivo (opcional)</label>
            <input 
              type="text" 
              placeholder="Ej. Feriado, Vacaciones..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" 
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Crear bloqueo'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
