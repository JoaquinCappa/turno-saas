'use client';

import { useState, useEffect } from 'react';
import { getAvailableTimes, createPublicBooking } from '@/app/actions/publicBooking';

type Service = { id: string; name: string; duration: number; price: { toString(): string } };
type Professional = { id: string; name: string };
type Business = { id: string; name: string; slug: string; timezone: string };

export default function PublicBookingClient({
  business,
  services,
  professionals
}: {
  business: Business;
  services: Service[];
  professionals: Professional[];
}) {
  const [step, setStep] = useState(1);
  
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (serviceId && professionalId && localDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingTimes(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalTime('');
      getAvailableTimes(business.id, serviceId, professionalId, localDate).then(times => {
        setAvailableTimes(times);
        setIsLoadingTimes(false);
      });
    } else {
      setAvailableTimes([]);
    }
  }, [serviceId, professionalId, localDate, business.id]);

  if (success) {
    return (
      <div className="bg-[#111113] border border-gray-800 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Reserva confirmada!</h2>
        <p className="text-gray-400">Te enviamos los detalles a tu email.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">Reservar otro turno</button>
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
      setError(res.error || 'Error al procesar la reserva');
    }
  };

  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
      
      {/* Header progress */}
      <div className="bg-[#1A1A1C] px-6 py-4 border-b border-gray-800 flex items-center gap-2 text-sm text-gray-400">
        <span className={step >= 1 ? 'text-white font-medium' : ''}>Servicio</span>
        <span>›</span>
        <span className={step >= 2 ? 'text-white font-medium' : ''}>Fecha y hora</span>
        <span>›</span>
        <span className={step >= 3 ? 'text-white font-medium' : ''}>Tus datos</span>
      </div>

      <div className="p-6 md:p-8">
        {error && <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-lg">{error}</div>}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Elegí el servicio</h3>
              <div className="grid gap-3">
                {services.map(s => (
                  <label key={s.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${serviceId === s.id ? 'border-white bg-gray-800' : 'border-gray-800 hover:border-gray-600'}`}>
                    <div>
                      <div className="text-white font-medium">{s.name}</div>
                      <div className="text-sm text-gray-400">{s.duration} min</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">${s.price.toString()}</span>
                      <input type="radio" name="service" checked={serviceId === s.id} onChange={() => setServiceId(s.id)} className="w-4 h-4" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-4">Elegí el profesional</h3>
              <div className="grid gap-3">
                {professionals.map(p => (
                  <label key={p.id} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${professionalId === p.id ? 'border-white bg-gray-800' : 'border-gray-800 hover:border-gray-600'}`}>
                    <input type="radio" name="professional" checked={professionalId === p.id} onChange={() => setProfessionalId(p.id)} className="w-4 h-4 mr-4" />
                    <span className="text-white font-medium">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleNext} 
                disabled={!serviceId || !professionalId}
                className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Elegí el día</h3>
              <input 
                type="date" 
                value={localDate}
                onChange={e => setLocalDate(e.target.value)}
                min={new Date().toLocaleDateString('en-CA')} // approximate local min date
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500 [color-scheme:dark]"
              />
            </div>

            {localDate && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Horarios disponibles</h3>
                {isLoadingTimes ? (
                  <div className="text-gray-400">Buscando horarios...</div>
                ) : availableTimes.length === 0 ? (
                  <div className="text-gray-400 p-4 border border-gray-800 rounded-lg text-center bg-[#1A1A1C]">
                    No hay horarios disponibles para esta fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => setLocalTime(time)}
                        className={`py-2 px-1 text-center rounded-lg border font-mono text-sm transition-colors ${localTime === time ? 'border-white bg-white text-black font-bold' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={handleBack} className="px-6 py-3 text-gray-400 font-medium hover:text-white transition-colors">Atrás</button>
              <button 
                onClick={handleNext} 
                disabled={!localDate || !localTime}
                className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">Tus datos</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre completo *</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                  className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500" 
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  required
                  className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500" 
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono (opcional)</label>
              <input 
                type="tel" 
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500" 
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Notas (opcional)</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500 resize-none" 
                disabled={isSubmitting}
              />
            </div>

            {/* Summary */}
            <div className="bg-[#1A1A1C] p-4 rounded-xl border border-gray-800 text-sm">
              <div className="text-gray-400 mb-2">Resumen de reserva</div>
              <div className="text-white font-medium">{services.find(s => s.id === serviceId)?.name} con {professionals.find(p => p.id === professionalId)?.name}</div>
              <div className="text-white">{localDate} a las {localTime} ({business.timezone})</div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={handleBack} disabled={isSubmitting} className="px-6 py-3 text-gray-400 font-medium hover:text-white transition-colors">Atrás</button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
