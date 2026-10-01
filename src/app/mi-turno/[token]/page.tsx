import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { toZonedTime, format } from 'date-fns-tz';
import PublicCancelButton from './PublicCancelButton';
import PublicRescheduleButton from './PublicRescheduleButton';

export default async function PublicBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  if (!token || typeof token !== 'string') {
    notFound();
  }

  const managementTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const booking = await prisma.booking.findUnique({
    where: { managementTokenHash },
    select: {
      serviceName: true,
      serviceDuration: true,
      startAt: true,
      endAt: true,
      status: true,
      business: {
        select: {
          name: true,
          address: true,
          timezone: true
        }
      },
      customer: {
        select: {
          name: true
        }
      },
      professional: {
        select: {
          name: true
        }
      }
    }
  });

  if (!booking) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-gray-500">El enlace proporcionado no es válido o ya no se encuentra disponible.</p>
        </div>
      </main>
    );
  }

  const { business, customer, professional } = booking;
  const zonedStart = toZonedTime(booking.startAt, business.timezone);
  const zonedEnd = toZonedTime(booking.endAt, business.timezone);
  
  const dateStr = format(zonedStart, 'dd/MM/yyyy');
  const timeStartStr = format(zonedStart, 'HH:mm');
  const timeEndStr = format(zonedEnd, 'HH:mm');

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">{business.name}</h1>
          <p className="text-gray-400 text-sm">Resumen de tu turno</p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-medium text-gray-900">Hola, {customer.name}</h2>
            
            {/* Status Badge */}
            <div className="mt-4">
              {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Turno Confirmado
                </span>
              ) : booking.status === 'CANCELLED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Este turno está cancelado
                </span>
              ) : booking.status === 'COMPLETED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Turno completado
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Ausente
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Servicio</p>
                <p className="text-gray-900 font-medium mt-1">{booking.serviceName}</p>
                <p className="text-gray-500 text-sm">{booking.serviceDuration} min</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Profesional</p>
                <p className="text-gray-900 font-medium mt-1">{professional.name}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fecha y Hora</p>
              <p className="text-gray-900 font-medium mt-1">
                {dateStr}
              </p>
              <p className="text-gray-600">
                {timeStartStr} - {timeEndStr}
              </p>
            </div>

            {business.address && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Dirección</p>
                <p className="text-gray-900 mt-1">{business.address}</p>
              </div>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-500 pt-2">
            <p>Para cualquier consulta, comunicate con el negocio.</p>
          </div>

          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <div className="flex justify-center gap-4 mt-6">
              <PublicRescheduleButton token={token} initialDate={format(toZonedTime(new Date(), business.timezone), 'yyyy-MM-dd')} />
              <PublicCancelButton token={token} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
