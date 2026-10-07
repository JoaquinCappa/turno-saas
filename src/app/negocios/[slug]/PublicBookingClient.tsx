'use client';

import { useState, useEffect } from 'react';
import { getAvailableTimes, createPublicBooking } from '@/app/actions/publicBooking';

type Service = { id: string; name: string; duration: number; price: { toString(): string } };
type Professional = { id: string; name: string };
type Business = { id: string; name: string; slug: string; timezone: string };

function getNextDays(startDateStr: string, days: number) {
  const dates = [];
  // Parse startDateStr (YYYY-MM-DD) as local time safely by splitting
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);

  for (let i = 0; i < days; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    dates.push(current);
  }
  return dates;
}

export default function PublicBookingClient({
  business,
  services,
  professionals,
  initialDate
}: {
  business: Business;
  services: Service[];
  professionals: Professional[];
  initialDate: string;
}) {
  const [step, setStep] = useState(1);

  const [serviceId, setServiceId] = useState('');
  // Auto-select if there is only one professional
  const [professionalId, setProfessionalId] = useState(professionals.length === 1 ? professionals[0].id : '');

  const [localDate, setLocalDate] = useState(() => initialDate);
  const [localTime, setLocalTime] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [existingBookingInfo, setExistingBookingInfo] = useState<{ startAt: string, endAt: string, serviceName: string, professionalName: string } | null>(null);
  const [dayBlockedBy, setDayBlockedBy] = useState<{ startAt: string, endAt: string, serviceName: string, professionalName: string } | null>(null);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Generate date options
  const [dateOptions] = useState<Date[]>(() => {
    return getNextDays(initialDate, 14);
  });

  useEffect(() => {
    if (step !== 2) return;
    let active = true;
    if (serviceId && professionalId && localDate) {
      setTimeout(() => {
        if (active) {
          setIsLoadingTimes(true);
          setLocalTime('');
        }
      }, 0);
      getAvailableTimes(business.id, serviceId, professionalId, localDate, undefined, customerEmail).then(res => {
        if (!active) return;
        // La autoridad es el backend: si reporta un turno bloqueante ese dia, lo mostramos en el selector
        // de fecha (sin forzar volver al paso 3) para que el usuario pueda elegir otra fecha.
        const blockingBooking = 'existingBooking' in res ? res.existingBooking : undefined;
        if (res.hasBookingThatDay && blockingBooking) {
          setDayBlockedBy({
            startAt: new Date(blockingBooking.startAt).toISOString(),
            endAt: new Date(blockingBooking.endAt).toISOString(),
            serviceName: blockingBooking.serviceName,
            professionalName: blockingBooking.professionalName
          });
          setAvailableTimes([]);
          setIsLoadingTimes(false);
          return;
        }
        setDayBlockedBy(null);
        setAvailableTimes(res.availableTimes || []);
        setIsLoadingTimes(false);
      });
    } else {
      setTimeout(() => {
        if (active) {
          setAvailableTimes([]);
          setDayBlockedBy(null);
        }
      }, 0);
    }
    return () => { active = false; };
  }, [serviceId, professionalId, localDate, business.id, customerEmail, step]);

  if (success) {
    const srv = services.find(s => s.id === serviceId);
    const prof = professionals.find(p => p.id === professionalId);

    return (
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-10 text-center text-gray-900">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-extrabold mb-2">¡Reserva confirmada!</h2>
        <p className="text-gray-500 mb-8">Te esperamos, {customerName.split(' ')[0]}.</p>

        <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4 mb-8">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Cuándo</div>
            <div className="font-medium">{localDate} a las {localTime} ({business.timezone})</div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Qué</div>
            <div className="font-medium">{srv?.name} con {prof?.name}</div>
            <div className="text-sm text-gray-500">{srv?.duration} min â€¢ ${srv?.price.toString()}</div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dónde</div>
            <div className="font-medium">{business.name}</div>
          </div>
        </div>

        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors w-full sm:w-auto">
          Hacer otra reserva
        </button>
      </div>
    );
  }

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => { setStep(s => s - 1); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) return setError('Nombre y email son obligatorios');

    setError('');
    setIsSubmitting(true);

    const res = await createPublicBooking({
      slug: business.slug,
      serviceId,
      professionalId,
      localDate,
      localTime,
      customerName,
      customerEmail,
      customerPhone,
      notes
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      if ('reason' in res && res.reason === 'limit_exceeded') {
        setExistingBookingInfo(res.existingBooking);
      } else
      if ((res as { error?: string }).error === 'El profesional ya tiene un turno en ese horario') {
          setError('Este horario acaba de ser reservado. Elegí otro horario.');
          setStep(2); // Go back to time selection
          setLocalTime('');
        } else {
        setError((res as { error?: string }).error || 'Error al procesar la reserva');
      }
    }
  };

  const steps = [
    { num: 1, label: 'Servicio' },
    { num: 2, label: 'Fecha' },
    { num: 3, label: 'Tus datos' }
  ];

  return (
    <div className="bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-3xl overflow-hidden">

      {/* Header progress */}
      <div className="bg-gray-50/80 px-6 py-5 border-b border-gray-100 flex items-center justify-between sm:justify-start sm:gap-4 text-sm">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.num ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s.num}
            </span>
            <span className={`hidden sm:inline font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {idx < steps.length - 1 && <span className="text-gray-300 hidden sm:inline ml-2">›</span>}
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 lg:p-10">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">¿Qué servicio buscás?</h3>
              <div className="grid gap-3">
                {services.map(s => (
                  <div key={s.id} onClick={() => setServiceId(s.id)} className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${serviceId === s.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div>
                      <div className={`font-semibold text-lg ${serviceId === s.id ? 'text-gray-900' : 'text-gray-700'}`}>{s.name}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {s.duration} min
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-gray-900 font-bold">${s.price.toString()}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${serviceId === s.id ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}>
                        {serviceId === s.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {professionals.length > 1 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Elegí el profesional</h3>
                <div className="grid gap-3">
                  {professionals.map(p => (
                    <div key={p.id} onClick={() => setProfessionalId(p.id)} className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${professionalId === p.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 ${professionalId === p.id ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}>
                        {professionalId === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className={`font-medium ${professionalId === p.id ? 'text-gray-900' : 'text-gray-700'}`}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6">
              <button
                onClick={handleNext}
                disabled={!serviceId || !professionalId}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all active:scale-[0.98]"
              >
                Siguiente paso
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">¿Cuándo querés venir?</h3>

              {/* Horizontal Date Picker */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 snap-x">
                {dateOptions.map(date => {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  const isSelected = localDate === dateStr;
                  const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const monthName = date.toLocaleDateString('es-ES', { month: 'short' });

                  return (
                    <button
                      key={dateStr}
                      onClick={(e) => { e.preventDefault(); setLocalDate(dateStr); setLocalTime(''); }}
                      className={`snap-start flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border-2 transition-all ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'}`}
                    >
                      <span className={`text-xs uppercase font-semibold mb-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{dayName}</span>
                      <span className="text-2xl font-bold">{dayNum}</span>
                      <span className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{monthName}</span>
                    </button>
                  );
                })}
                <div className="snap-start flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer relative overflow-hidden">
                  <span className="text-xs font-semibold px-2 text-center">Otra fecha</span>
                  <input
                    type="date"
                    min={initialDate}
                    value={localDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setLocalDate(e.target.value);
                        setLocalTime('');
                        // If it's not in the array, we don't necessarily add it, it will just show as selected in the input.
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            {localDate && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Horarios disponibles</h3>
                {isLoadingTimes ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                  </div>
                ) : dayBlockedBy ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <h4 className="text-red-900 font-bold mb-2">Ya tenés un turno para ese día.</h4>
                    <div className="bg-white p-4 rounded-xl border border-red-100 mb-4 inline-block text-left shadow-sm">
                      <div className="font-medium text-gray-900">
                        {new Date(dayBlockedBy.startAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} · {new Date(dayBlockedBy.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}–{new Date(dayBlockedBy.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-gray-600 text-sm mt-1">
                        {dayBlockedBy.serviceName} · {dayBlockedBy.professionalName}
                      </div>
                    </div>
                    <p className="text-red-700 text-sm">Solo permitimos un turno por cliente por día. Elegí otra fecha.</p>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="text-gray-900 font-medium mb-1">Sin horarios</h4>
                    <p className="text-gray-500 text-sm">No encontramos turnos para este día. Por favor, elegí otra fecha.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => setLocalTime(time)}
                        className={`py-3 px-2 text-center rounded-xl font-bold transition-all ${localTime === time ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button onClick={handleBack} className="px-6 py-3 text-gray-500 font-medium hover:text-gray-900 transition-colors">Volver</button>
              <button
                onClick={handleNext}
                disabled={!localDate || !localTime}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all active:scale-[0.98]"
              >
                Siguiente paso
              </button>
            </div>
          </div>
        )}

        {step === 3 && existingBookingInfo && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-red-900 font-bold mb-2">Ya tenés un turno para ese día.</h4>
            <div className="bg-white p-4 rounded-xl border border-red-100 mb-4 inline-block text-left shadow-sm">
              <div className="font-medium text-gray-900">
                {new Date(existingBookingInfo.startAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} · {new Date(existingBookingInfo.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}–{new Date(existingBookingInfo.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-gray-600 text-sm mt-1">
                {existingBookingInfo.serviceName} · {existingBookingInfo.professionalName}
              </div>
            </div>
            <p className="text-red-700 text-sm mb-6">Solo permitimos un turno por cliente por día.</p>
            <button
              type="button"
              onClick={() => {
                setExistingBookingInfo(null);
                setStep(2);
              }}
              className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              Elegir otra fecha
            </button>
          </div>
        )}

        {step === 3 && !existingBookingInfo && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Tus datos</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Tu número de celular"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="¿Algún comentario para el profesional?"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Resumen de tu reserva</div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-gray-900 font-bold">{services.find(s => s.id === serviceId)?.name}</div>
                  <div className="text-gray-500 text-sm">con {professionals.find(p => p.id === professionalId)?.name}</div>
                </div>
                <div className="text-gray-900 font-bold">${services.find(s => s.id === serviceId)?.price.toString()}</div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-sm mt-4 pt-4 border-t border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="font-medium">{localDate}</span> a las <span className="font-medium">{localTime}</span>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button type="button" onClick={handleBack} disabled={isSubmitting} className="px-6 py-3 text-gray-500 font-medium hover:text-gray-900 transition-colors">Volver</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                    Confirmando...
                  </>
                ) : 'Confirmar Reserva'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
