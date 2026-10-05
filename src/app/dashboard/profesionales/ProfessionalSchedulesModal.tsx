'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/dashboard/Modal';
import { 
  getProfessionalHours, 
  getProfessionalBlockedTimes,
  setProfessionalCustomHours,
  createProfessionalHour,
  updateProfessionalHour,
  deleteProfessionalHour,
  createProfessionalBlockedTime,
  updateProfessionalBlockedTime,
  deleteProfessionalBlockedTime
} from '@/app/actions/professionalSchedules';

type Professional = {
  id: string;
  name: string;
  isCustomHoursEnabled: boolean;
};

type ProfessionalHour = {
  id: string;
  dayOfWeek: string;
  startMinute: number;
  endMinute: number;
};

type ProfessionalBlockedTime = {
  id: string;
  date: Date | string;
  startMinute: number;
  endMinute: number;
  title: string | null;
};

const DAYS_ES: Record<string, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo'
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const parseTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export default function ProfessionalSchedulesModal({
  isOpen,
  onClose,
  professional,
  businessHours,
  isAdmin,
  onUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  professional: Professional | null;
  businessHours: { dayOfWeek: string, startMinute: number, endMinute: number }[];
  isAdmin: boolean;
  onUpdated: (isCustomEnabled: boolean) => void;
}) {
  const [isCustomEnabled, setIsCustomEnabled] = useState(false);
  const [hours, setHours] = useState<ProfessionalHour[]>([]);
  const [blocked, setBlocked] = useState<ProfessionalBlockedTime[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  // Modals for add/edit
  const [hourForm, setHourForm] = useState<{isOpen: boolean, id?: string, dayOfWeek: string, start: string, end: string} | null>(null);
  const [blockForm, setBlockForm] = useState<{isOpen: boolean, id?: string, localDate: string, start: string, end: string, title: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, id: string, type: 'hour'|'block'} | null>(null);

  const loadData = useCallback(async () => {
    if (!professional) return;
    setIsLoading(true);
    const [hRes, bRes] = await Promise.all([
      getProfessionalHours(professional.id),
      getProfessionalBlockedTimes(professional.id)
    ]);
    if (hRes.success) setHours((hRes as unknown as {hours: ProfessionalHour[]}).hours);
    if (bRes.success) setBlocked((bRes as unknown as {blockedTimes: ProfessionalBlockedTime[]}).blockedTimes);
    setIsLoading(false);
  }, [professional]);

  useEffect(() => {
    if (isOpen && professional) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCustomEnabled(professional.isCustomHoursEnabled);
      loadData();
    }
  }, [isOpen, professional, loadData]);

  const handleToggle = async () => {
    if (!professional || !isAdmin) return;
    const newVal = !isCustomEnabled;
    setIsToggling(true);
    const res = await setProfessionalCustomHours(professional.id, newVal);
    setIsToggling(false);
    if (res.success) {
      setIsCustomEnabled(newVal);
      onUpdated(newVal);
    } else {
      alert((res as unknown as {error: string}).error || 'Error al actualizar configuración');
    }
  };

  // HOUR SUBMIT
  const handleSaveHour = async () => {
    if (!professional || !hourForm) return;
    setFormError('');
    const startM = parseTime(hourForm.start);
    const endM = parseTime(hourForm.end);
    if (startM >= endM) return setFormError('La hora de inicio debe ser menor a la hora de fin.');

    setIsSubmitting(true);
    let res;
    if (hourForm.id) {
      res = await updateProfessionalHour(hourForm.id, {
        dayOfWeek: hourForm.dayOfWeek as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
        startMinute: startM,
        endMinute: endM
      });
    } else {
      res = await createProfessionalHour({
        professionalId: professional.id,
        dayOfWeek: hourForm.dayOfWeek as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
        startMinute: startM,
        endMinute: endM
      });
    }
    setIsSubmitting(false);

    if (res.success) {
      setHourForm(null);
      loadData();
    } else {
      setFormError((res as unknown as {error: string}).error || 'Error al guardar el horario');
    }
  };

  // BLOCK SUBMIT
  const handleSaveBlock = async () => {
    if (!professional || !blockForm) return;
    setFormError('');
    if (!blockForm.localDate) return setFormError('La fecha es obligatoria.');
    const startM = parseTime(blockForm.start);
    const endM = parseTime(blockForm.end);
    if (startM >= endM) return setFormError('La hora de inicio debe ser menor a la hora de fin.');

    setIsSubmitting(true);
    let res;
    if (blockForm.id) {
      res = await updateProfessionalBlockedTime(blockForm.id, {
        localDate: blockForm.localDate,
        startMinute: startM,
        endMinute: endM,
        title: blockForm.title
      });
    } else {
      res = await createProfessionalBlockedTime({
        professionalId: professional.id,
        localDate: blockForm.localDate,
        startMinute: startM,
        endMinute: endM,
        title: blockForm.title
      });
    }
    setIsSubmitting(false);

    if (res.success) {
      setBlockForm(null);
      loadData();
    } else {
      setFormError((res as unknown as {error: string}).error || 'Error al guardar el bloqueo');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    let res;
    if (confirmDelete.type === 'hour') {
      res = await deleteProfessionalHour(confirmDelete.id);
    } else {
      res = await deleteProfessionalBlockedTime(confirmDelete.id);
    }
    setIsSubmitting(false);

    if (res.success) {
      setConfirmDelete(null);
      loadData();
    } else {
      alert((res as unknown as {error: string}).error || 'Error al eliminar');
    }
  };

  if (!isOpen || !professional) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-[#111113] border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white">Horarios de {professional.name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-8">
            {/* TOGGLE */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#1A1A1C] p-5 rounded-xl border border-gray-800 gap-4">
              <div className="flex-1">
                <h4 className="text-white font-medium text-lg">Horarios personalizados</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Los horarios personalizados se conservarán aunque los desactives.
                </p>
              </div>
              <label className={`relative inline-flex items-center ${(!isAdmin || isToggling) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isCustomEnabled} 
                  onChange={handleToggle}
                  disabled={!isAdmin || isToggling}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
              </label>
            </div>

            {isCustomEnabled && (
              <div className="space-y-8">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400 flex flex-col gap-3">
                  <div className="flex gap-3 items-start">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="text-gray-300 space-y-2">
                      <p><strong>Reglas de disponibilidad:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Si el profesional <strong>no tiene</strong> horarios personalizados, utiliza los horarios generales del negocio.</li>
                        <li>Si el profesional <strong>sí tiene</strong> horarios personalizados, su disponibilidad es la <strong>intersección</strong> (el tiempo en común) entre sus horarios y los del negocio.</li>
                        <li>Los bloqueos (ausencias, feriados, etc.) son acumulativos: se aplican tanto los bloqueos generales del negocio como los propios del profesional.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-2 bg-[#1A1A1C]/50 rounded-lg p-3 border border-blue-500/10">
                    <div className="font-bold mb-2">Horario global del negocio (Referencia):</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {Object.keys(DAYS_ES).map(day => {
                        const dayHours = businessHours.filter(h => h.dayOfWeek === day);
                        return (
                          <div key={day} className="bg-[#111113] p-2 rounded border border-gray-800">
                            <span className="font-bold text-gray-300 block mb-1">{DAYS_ES[day]}</span>
                            {dayHours.length > 0 ? (
                              dayHours.map((h, i) => (
                                <div key={i} className="text-gray-400">
                                  {formatTime(h.startMinute)} - {formatTime(h.endMinute)}
                                </div>
                              ))
                            ) : (
                              <div className="text-red-400 font-medium">Cerrado</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : (
                  <>
                    {/* HORARIOS */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold text-lg">Horarios de atención</h4>
                        {isAdmin && (
                          <button 
                            onClick={() => setHourForm({ isOpen: true, dayOfWeek: 'MONDAY', start: '09:00', end: '18:00' })}
                            className="bg-white text-black px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200"
                          >
                            + Agregar horario
                          </button>
                        )}
                      </div>

                      {hours.length === 0 ? (
                        <div className="bg-[#1A1A1C] border border-red-900/50 rounded-xl p-6 text-center">
                          <p className="text-red-400 font-medium mb-1">Este profesional todavía no tiene horarios personalizados configurados.</p>
                          <p className="text-gray-400 text-sm">Sin horarios personalizados, no tendrá disponibilidad para reservar.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {hours.map(h => (
                            <div key={h.id} className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                              <div>
                                <div className="text-white font-bold mb-1">{DAYS_ES[h.dayOfWeek]}</div>
                                <div className="text-sm text-gray-400">{formatTime(h.startMinute)} — {formatTime(h.endMinute)}</div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-2">
                                  <button onClick={() => setHourForm({ isOpen: true, id: h.id, dayOfWeek: h.dayOfWeek, start: formatTime(h.startMinute), end: formatTime(h.endMinute) })} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg" aria-label="Editar">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => setConfirmDelete({ isOpen: true, id: h.id, type: 'hour' })} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg" aria-label="Eliminar">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* BLOQUEOS */}
                    <section className="pt-4 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold text-lg">Bloqueos del profesional</h4>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              const tzOffset = (new Date()).getTimezoneOffset() * 60000;
                              const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
                              setBlockForm({ isOpen: true, localDate: localISOTime, start: '09:00', end: '10:00', title: '' });
                            }}
                            className="bg-[#1A1A1C] border border-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-800"
                          >
                            + Agregar bloqueo
                          </button>
                        )}
                      </div>

                      {blocked.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">No hay bloqueos configurados.</div>
                      ) : (
                        <div className="space-y-3">
                          {blocked.map(b => {
                            const dateObj = new Date(b.date);
                            const displayDate = dateObj.toLocaleDateString('es-AR', { timeZone: 'UTC' }); 
                            const formDate = dateObj.toISOString().slice(0, 10);

                            return (
                              <div key={b.id} className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold">{displayDate}</span>
                                    <span className="text-sm text-gray-400">{formatTime(b.startMinute)} - {formatTime(b.endMinute)}</span>
                                  </div>
                                  {b.title && <div className="text-sm text-gray-500">{b.title}</div>}
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-2">
                                    <button onClick={() => setBlockForm({ isOpen: true, id: b.id, localDate: formDate, start: formatTime(b.startMinute), end: formatTime(b.endMinute), title: b.title || '' })} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => setConfirmDelete({ isOpen: true, id: b.id, type: 'block' })} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORM: HOUR */}
      <Modal isOpen={hourForm?.isOpen || false} onClose={() => !isSubmitting && setHourForm(null)} title={hourForm?.id ? "Editar horario" : "Agregar horario"}>
        <div className="space-y-4">
          {formError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Día</label>
            <select 
              value={hourForm?.dayOfWeek} 
              onChange={e => setHourForm(s => s ? {...s, dayOfWeek: e.target.value} : null)}
              className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
              disabled={isSubmitting}
            >
              {Object.entries(DAYS_ES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Desde</label>
              <input type="time" value={hourForm?.start} onChange={e => setHourForm(s => s ? {...s, start: e.target.value} : null)} disabled={isSubmitting} className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Hasta</label>
              <input type="time" value={hourForm?.end} onChange={e => setHourForm(s => s ? {...s, end: e.target.value} : null)} disabled={isSubmitting} className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setHourForm(null)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={handleSaveHour} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* FORM: BLOCK */}
      <Modal isOpen={blockForm?.isOpen || false} onClose={() => !isSubmitting && setBlockForm(null)} title={blockForm?.id ? "Editar bloqueo" : "Agregar bloqueo"}>
        <div className="space-y-4">
          {formError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
            <input type="date" value={blockForm?.localDate} onChange={e => setBlockForm(s => s ? {...s, localDate: e.target.value} : null)} disabled={isSubmitting} className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Desde</label>
              <input type="time" value={blockForm?.start} onChange={e => setBlockForm(s => s ? {...s, start: e.target.value} : null)} disabled={isSubmitting} className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Hasta</label>
              <input type="time" value={blockForm?.end} onChange={e => setBlockForm(s => s ? {...s, end: e.target.value} : null)} disabled={isSubmitting} className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Motivo (Opcional)</label>
            <input type="text" value={blockForm?.title} onChange={e => setBlockForm(s => s ? {...s, title: e.target.value} : null)} disabled={isSubmitting} placeholder="Ej: Turno medico" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setBlockForm(null)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={handleSaveBlock} disabled={isSubmitting} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE */}
      <Modal isOpen={confirmDelete?.isOpen || false} onClose={() => !isSubmitting && setConfirmDelete(null)} title="Eliminar registro">
        <div className="space-y-6">
          <p className="text-gray-300 text-sm">¿Estás seguro de que querés eliminar este {confirmDelete?.type === 'hour' ? 'horario' : 'bloqueo'}?</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/20 disabled:opacity-50">
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
