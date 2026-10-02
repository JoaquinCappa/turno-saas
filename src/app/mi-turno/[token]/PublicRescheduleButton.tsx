'use client';

import { useState } from 'react';
import { getAvailableTimesForReschedule, reschedulePublicBooking } from '@/app/actions/publicBooking';

interface PublicRescheduleButtonProps {
  token: string;
  initialDate: string;
}

export default function PublicRescheduleButton({ token, initialDate }: PublicRescheduleButtonProps) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-800 font-medium">Tu turno fue reprogramado exitosamente.</p>
      </div>
    );
  }

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedTime('');
    setAvailableTimes([]);
    setError('');

    if (date) {
      setIsLoadingTimes(true);
      try {
        const res = await getAvailableTimesForReschedule(token, date);
        if ('hasBookingThatDay' in res && res.hasBookingThatDay) {
          setError('Ya tenés un turno para ese día. Solo permitimos un turno por cliente por día.');
          setAvailableTimes([]);
        } else {
          setAvailableTimes(res.availableTimes || []);
        }
      } catch {
        setError('No se pudieron cargar los horarios.');
      } finally {
        setIsLoadingTimes(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setError('');
    const res = await reschedulePublicBooking(token, selectedDate, selectedTime);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Ocurrió un error inesperado.');
      setIsSubmitting(false);
    }
  };

  if (isRescheduling) {
    return (
      <div className="mt-6 p-5 border border-gray-200 bg-gray-50 rounded-xl space-y-4">
        <div className="text-center">
          <p className="font-semibold text-gray-800">Reprogramar turno</p>
          <p className="text-sm text-gray-600 mt-1">Elegí una nueva fecha y horario.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center bg-white p-2 rounded border border-red-100">{error}</p>
        )}

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              disabled={isSubmitting}
              // Minimum date is today in the client's local time, as a fallback (server validates strictly)
              min={initialDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {isLoadingTimes && (
            <p className="text-sm text-gray-500 text-center">Buscando horarios...</p>
          )}

          {!isLoadingTimes && selectedDate && availableTimes.length === 0 && (
            <p className="text-sm text-gray-500 text-center">No hay horarios disponibles para esta fecha.</p>
          )}

          {!isLoadingTimes && availableTimes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Horario</label>
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    disabled={isSubmitting}
                    className={`py-2 text-sm rounded-lg border font-medium transition-colors ${
                      selectedTime === time
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={() => setIsRescheduling(false)}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsRescheduling(true)}
      className="text-gray-600 font-medium text-sm hover:text-gray-900 hover:underline px-4 py-2"
    >
      Reprogramar turno
    </button>
  );
}
