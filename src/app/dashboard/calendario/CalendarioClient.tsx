'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatBusinessDate, getBusinessDayAndMinute } from '@/lib/date-utils';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { cancelBooking, completeBooking, confirmBooking, noShowBooking, adminRescheduleBooking } from '@/app/actions/bookings';
import { addDays, parseISO, format } from 'date-fns';

type Booking = {
  id: string;
  startAt: Date;
  endAt: Date;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  status: string;
  notes: string | null;
  customer: { name: string; phone: string | null };
  professional: { id: string; name: string };
};

export default function CalendarioClient({
  initialBookings,
  professionals,
  businessTimezone,
  currentDate,
  currentView,
  currentProf,
  userRole
}: {
  initialBookings: (Omit<Booking, 'startAt' | 'endAt'> & { startAt: string | Date; endAt: string | Date })[];
  professionals: { id: string; name: string }[];
  businessTimezone: string;
  currentDate: string; // YYYY-MM-DD
  currentView: 'Día' | 'Semana';
  currentProf: string;
  userRole: string;
}) {
  const router = useRouter();

  // Make sure Date objects
  const bookings: Booking[] = initialBookings.map(b => ({
    ...b,
    startAt: new Date(b.startAt),
    endAt: new Date(b.endAt),
  }));

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleProfId, setRescheduleProfId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  // Escala visual
  const START_HOUR = 8;
  const END_HOUR = 22;
  const PIXELS_PER_MINUTE = 1.333; // 80px per hour
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  // Navegación
  const navigate = (direction: 'prev' | 'next' | 'today') => {
    let targetDate = currentDate;
    if (direction === 'today') {
      targetDate = formatBusinessDate(new Date(), businessTimezone, 'yyyy-MM-dd');
    } else {
      const parsed = parseISO(currentDate);
      const amount = currentView === 'Semana' ? 7 : 1;
      const newDate = addDays(parsed, direction === 'next' ? amount : -amount);
      targetDate = format(newDate, 'yyyy-MM-dd');
    }
    pushUrl(targetDate, currentView, currentProf);
  };

  const pushUrl = (date: string, view: string, prof: string) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (view === 'Semana') params.set('view', 'Semana');
    if (prof) params.set('prof', prof);
    router.push(`?${params.toString()}`);
  };

  // Algoritmo de columnas para solapamientos
  const calculateEventPositions = (events: Booking[]) => {
    const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const columns: Booking[][] = [];

    sorted.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastEvent = columns[i][columns[i].length - 1];
        if (lastEvent.endAt <= event.startAt) {
          columns[i].push(event);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([event]);
    });

    const positionedEvents = [];
    for (let i = 0; i < columns.length; i++) {
      for (const event of columns[i]) {
        positionedEvents.push({
          event,
          colIndex: i,
          totalCols: columns.length,
        });
      }
    }
    return positionedEvents;
  };

  // Preparar días para la vista semana
  const getWeekDays = () => {
    // Si currentDate es Miércoles, necesitamos encontrar el Lunes
    const parsed = parseISO(currentDate);
    // getDay en JS: 0 Domingo, 1 Lunes.
    const dayOfWeek = parsed.getDay();
    const jsToIso = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = addDays(parsed, -jsToIso);

    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const name = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i];
      const num = format(d, 'dd');
      return { dateStr, name, num, isToday: dateStr === formatBusinessDate(new Date(), businessTimezone, 'yyyy-MM-dd') };
    });
  };

  const weekDays = getWeekDays();

  // Mapear eventos a columnas diarias
  // 0 = Lunes, 6 = Domingo
  const dayIndexMap: Record<string, number> = {
    'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3, 'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6
  };

  const eventsByDay = Array.from({ length: 7 }, () => [] as Booking[]);
  bookings.forEach(b => {
    const { dayOfWeek } = getBusinessDayAndMinute(b.startAt, businessTimezone);
    const index = dayIndexMap[dayOfWeek];
    if (index !== undefined) {
      eventsByDay[index].push(b);
    }
  });

  const renderEvent = (t: { event: Booking, colIndex: number, totalCols: number }) => {
    const { event: ev, colIndex, totalCols } = t;
    const { minuteOfDay } = getBusinessDayAndMinute(ev.startAt, businessTimezone);
    const startMins = minuteOfDay - START_HOUR * 60;

    // Ocultar si está antes de la hora de inicio de visualización
    if (startMins < 0 && startMins + ev.serviceDuration <= 0) return null;

    const top = Math.max(0, startMins) * PIXELS_PER_MINUTE;
    const height = ev.serviceDuration * PIXELS_PER_MINUTE;
    const width = 100 / totalCols;
    const left = colIndex * width;

    // Estilos por estado
    const isCancelled = ev.status === 'CANCELLED' || ev.status === 'NO_SHOW';
    const isPending = ev.status === 'PENDING';

    let borderClass = 'border-green-500';
    if (isPending) borderClass = 'border-yellow-500';
    if (isCancelled) borderClass = 'border-gray-500 opacity-60';

    return (
      <div
        key={ev.id}
        className="absolute p-0.5"
        style={{ top: `${top}px`, height: `${height}px`, left: `${left}%`, width: `${width}%` }}
      >
        <div
          onClick={() => setSelectedBooking(ev)}
          className={`w-full h-full rounded-md bg-[#18181A] border border-gray-800/80 border-l-2 ${borderClass} p-1 sm:p-2 overflow-hidden shadow-sm hover:bg-[#202023] transition-colors cursor-pointer group flex flex-col`}
        >
          <div className="font-bold text-gray-100 truncate text-[11px] sm:text-xs mb-0.5 leading-tight">{ev.customer.name}</div>
          <div className="text-gray-400 truncate text-[10px] sm:text-[11px] mb-1 leading-tight">{ev.serviceName}</div>
          <div className="mt-auto text-gray-500 font-mono text-[9px] sm:text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
            {formatBusinessDate(ev.startAt, businessTimezone, 'HH:mm')} - {formatBusinessDate(ev.endAt, businessTimezone, 'HH:mm')}
          </div>
        </div>
      </div>
    );
  };


  const handleStartReschedule = () => {
    if (!selectedBooking) return;
    setRescheduleProfId(selectedBooking.professional.id);
    setRescheduleDate(formatBusinessDate(selectedBooking.startAt, businessTimezone, 'yyyy-MM-dd'));
    setRescheduleTime(formatBusinessDate(selectedBooking.startAt, businessTimezone, 'HH:mm'));
    setRescheduleError('');
    setIsRescheduling(true);
  };

  const handleSaveReschedule = async () => {
    if (!selectedBooking) return;
    if (!rescheduleProfId || !rescheduleDate || !rescheduleTime) {
      setRescheduleError('Completá todos los campos.');
      return;
    }
    setIsActioning(true);
    setRescheduleError('');
    const res = await adminRescheduleBooking(selectedBooking.id, rescheduleProfId, rescheduleDate, rescheduleTime);
    setIsActioning(false);

    if (res?.success) {
      setIsRescheduling(false);
      setSelectedBooking(null);
    } else {
      setRescheduleError(res?.error || 'Error al reprogramar el turno');
    }
  };

  const handleAction = async (action: 'cancel' | 'complete' | 'confirm' | 'noshow') => {
    if (!selectedBooking) return;
    setIsActioning(true);
    let res;
    if (action === 'cancel') res = await cancelBooking(selectedBooking.id);
    else if (action === 'complete') res = await completeBooking(selectedBooking.id);
    else if (action === 'confirm') res = await confirmBooking(selectedBooking.id);
    else if (action === 'noshow') res = await noShowBooking(selectedBooking.id);

    setIsActioning(false);
    if (res?.success) {
      setSelectedBooking(null);
    } else {
      alert(res?.error || 'Error procesando la acción');
    }
  };

  // Formato para la vista actual
  const getHeaderTitle = () => {
    const d = parseISO(currentDate);
    const mesStr = format(d, 'MMMM'); // TODO: i18n
    if (currentView === 'Día') {
      return `${format(d, 'dd')} de ${mesStr}, ${format(d, 'yyyy')}`;
    } else {
      const sun = weekDays[6].dateStr;
      return `${format(d, 'dd')} al ${format(parseISO(sun), 'dd')} de ${mesStr}, ${format(d, 'yyyy')}`;
    }
  };

  return (
    <div className="space-y-6">

      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button onClick={() => navigate('today')} className="px-4 py-2 bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-800 hover:text-white transition-colors">
            Hoy
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1A1A1C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={() => navigate('next')} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1A1A1C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <span className="text-white font-semibold sm:text-lg">{getHeaderTitle()}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <select
            value={currentProf}
            onChange={e => pushUrl(currentDate, currentView, e.target.value)}
            className="w-full sm:w-auto bg-[#111113] border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500"
          >
            <option value="">Todos los profesionales</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="flex w-full sm:w-auto items-center bg-[#111113] border border-gray-800 rounded-lg p-1">
            {(['Día', 'Semana'] as const).map(v => (
              <button
                key={v}
                onClick={() => pushUrl(currentDate, v, currentProf)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentView === v ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      <div className="bg-[#111113] border border-gray-800 rounded-xl flex flex-col shadow-sm overflow-hidden">

        {/* HEADER */}
        {currentView === 'Día' ? (
          <div className="grid grid-cols-[50px_1fr] sm:grid-cols-[60px_1fr] border-b border-gray-800 bg-[#151517]">
            <div className="p-3 sm:p-4 border-r border-gray-800"></div>
            <div className="p-3 sm:p-4 text-center">
              <span className="text-sm font-semibold text-gray-200">{formatBusinessDate(new Date(`${currentDate}T12:00:00Z`), 'UTC', 'EEEE dd')}</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-[#151517] border-b border-gray-800 scrollbar-hide">
            <div className="grid grid-cols-[50px_1fr] sm:grid-cols-[60px_1fr] min-w-[600px]">
              <div className="p-3 sm:p-4 border-r border-gray-800"></div>
              <div className="grid grid-cols-7">
                {weekDays.map((d, i) => (
                  <div key={i} className={`py-2 sm:py-3 text-center border-l border-gray-800/50 first:border-l-0 ${d.isToday ? 'bg-white/5' : ''}`}>
                    <div className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">{d.name}</div>
                    <div className={`text-lg sm:text-xl font-bold ${d.isToday ? 'text-white' : 'text-gray-300'}`}>{d.num}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] bg-[#111113]">
          <div className={`grid grid-cols-[50px_1fr] sm:grid-cols-[60px_1fr] relative ${currentView === 'Semana' ? 'min-w-[600px]' : ''}`}>

            {/* Background Grid */}
            <div className="col-start-2 absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(h => (
                <div key={h} style={{ height: `${60 * PIXELS_PER_MINUTE}px` }} className="border-b border-gray-800/40 w-full box-border relative">
                  <div className="absolute top-1/2 w-full border-b border-gray-800/20 border-dashed"></div>
                </div>
              ))}
            </div>

            {/* Time labels */}
            <div className="flex flex-col border-r border-gray-800 z-10 bg-[#111113]">
              {hours.map(h => (
                <div key={h} style={{ height: `${60 * PIXELS_PER_MINUTE}px` }} className="p-1 pr-2 sm:pr-3 text-right text-[10px] sm:text-xs font-mono text-gray-500 relative box-border">
                  <span className="relative -top-2.5 bg-[#111113] px-1">{h.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Events Area */}
            {currentView === 'Día' ? (
              <div className="relative z-10 w-full bg-transparent">
                {/*
                  En la vista día mostramos los del dayIndex correspondiente.
                  Como recibimos eventos filtrados, y el query de DB trajo solo los del día consultado,
                  todos pertenecen a la vista actual.
                */}
                {calculateEventPositions(bookings).map(renderEvent)}
              </div>
            ) : (
              <div className="grid grid-cols-7 relative z-10 bg-transparent">
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
                  <div key={dayIndex} className="relative border-l border-gray-800/40 first:border-l-0">
                    {calculateEventPositions(eventsByDay[dayIndex]).map(renderEvent)}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL DETALLE DE TURNO */}
      <Modal isOpen={!!selectedBooking} onClose={() => { if (!isActioning) { setSelectedBooking(null); setIsRescheduling(false); } }} title={isRescheduling ? "Reprogramar Turno" : "Detalle del Turno"}>
          {selectedBooking && !isRescheduling && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedBooking.customer.name}</h3>
                {selectedBooking.customer.phone && <p className="text-gray-400 font-mono mt-1">{selectedBooking.customer.phone}</p>}
              </div>
              <StatusBadge status={selectedBooking.status === 'CONFIRMED' ? 'Confirmado' : selectedBooking.status === 'PENDING' ? 'Pendiente' : selectedBooking.status === 'CANCELLED' ? 'Cancelado' : selectedBooking.status === 'NO_SHOW' ? 'Ausente' : 'Completado'} />
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
              <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between">
                <span className="text-gray-400">Horario</span>
                <span className="text-white font-mono font-bold">
                  {formatBusinessDate(selectedBooking.startAt, businessTimezone, 'dd/MM/yyyy HH:mm')} - {formatBusinessDate(selectedBooking.endAt, businessTimezone, 'HH:mm')}
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
              <button
                onClick={() => setSelectedBooking(null)}
                disabled={isActioning}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
              {userRole !== 'STAFF' && selectedBooking.status === 'PENDING' && (
                <button
                  onClick={() => handleAction('confirm')}
                  disabled={isActioning}
                  className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Confirmar Turno
                </button>
              )}
              {userRole !== 'STAFF' && selectedBooking.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleAction('complete')}
                  disabled={isActioning}
                  className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Completar Turno
                </button>
              )}
              {userRole !== 'STAFF' && (selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PENDING') && (
                <>
                  <button
                    onClick={() => handleAction('noshow')}
                    disabled={isActioning}
                    className="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Ausente
                  </button>
                  <button onClick={handleStartReschedule} disabled={isActioning} className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                      Reprogramar
                    </button>
                    <button
                    onClick={() => handleAction('cancel')}
                    disabled={isActioning}
                    className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Cancelar Turno
                  </button>
                </>
              )}
              </div>
            </div>
          )}

          {selectedBooking && isRescheduling && (
            <div className="space-y-4 mt-2">
              {rescheduleError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{rescheduleError}</div>}

              <div className="bg-[#1A1A1C] border border-gray-800 rounded-lg p-4 space-y-2 mb-4">
                <p className="text-sm text-gray-400">Cliente: <span className="text-white font-medium">{selectedBooking.customer.name}</span></p>
                <p className="text-sm text-gray-400">Servicio: <span className="text-white font-medium">{selectedBooking.serviceName} ({selectedBooking.serviceDuration} min)</span></p>
                <p className="text-sm text-gray-400">Horario actual: <span className="text-white font-medium">{formatBusinessDate(selectedBooking.startAt, businessTimezone, 'dd/MM/yyyy HH:mm')}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nuevo Profesional</label>
                <select value={rescheduleProfId} onChange={e => setRescheduleProfId(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500">
                  <option value="">Seleccionar profesional</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nueva Fecha</label>
                  <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nueva Hora</label>
                  <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className="w-full bg-[#111113] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-4">
                <button onClick={() => setIsRescheduling(false)} disabled={isActioning} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Volver</button>
                <button onClick={handleSaveReschedule} disabled={isActioning} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {isActioning ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
      </Modal>

    </div>
  );
}
