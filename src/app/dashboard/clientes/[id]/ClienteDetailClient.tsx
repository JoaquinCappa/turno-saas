'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { formatBusinessDate } from '@/lib/date-utils';

type CustomerDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
};

type MetricStats = {
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
};

type BookingView = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  professionalName: string;
};

export default function ClienteDetailClient({
  customer,
  stats,
  upcomingBookings,
  historyBookings,
  businessTimezone,
  currentPage,
  totalHistoryPages,
}: {
  customer: CustomerDetail;
  stats: MetricStats;
  upcomingBookings: BookingView[];
  historyBookings: BookingView[];
  businessTimezone: string;
  currentPage: number;
  totalHistoryPages: number;
}) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalHistoryPages) return;
    router.push(`/dashboard/clientes/${customer.id}?page=${newPage}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900 rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard/clientes" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Volver
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">{customer.name}</h1>
            <StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos y Notas */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Datos de Contacto</h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <span className="block text-gray-500 mb-1">Email</span>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-blue-400 hover:underline">{customer.email}</a>
                ) : (
                  <span className="text-gray-600 italic">No especificado</span>
                )}
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Teléfono</span>
                {customer.phone ? (
                  <a href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{customer.phone}</a>
                ) : (
                  <span className="text-gray-600 italic">No especificado</span>
                )}
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Fecha de alta</span>
                {formatBusinessDate(new Date(customer.createdAt), businessTimezone, 'dd/MM/yyyy')}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Notas</h3>
            {customer.notes ? (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <span className="text-sm text-gray-600 italic">Sin notas</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
              <div className="text-sm text-gray-400 mb-1">Total Turnos</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
              <div className="text-sm text-gray-400 mb-1">Completados</div>
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            </div>
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
              <div className="text-sm text-gray-400 mb-1">Cancelados</div>
              <div className="text-2xl font-bold text-red-400">{stats.cancelled}</div>
            </div>
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
              <div className="text-sm text-gray-400 mb-1">No-Shows</div>
              <div className="text-2xl font-bold text-orange-400">{stats.noShows}</div>
            </div>
          </div>

          {/* Próximos Turnos */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Próximos Turnos</h3>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 italic">Sin Próximos turnos</div>
            ) : (
              <div className="divide-y divide-gray-700">
                {upcomingBookings.map(booking => (
                  <div key={booking.id} className="p-4 sm:p-6 hover:bg-gray-750 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-white mb-1">
                        {formatBusinessDate(new Date(booking.startAt), businessTimezone)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {booking.serviceName} con {booking.professionalName}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-300">{formatPrice(booking.servicePrice)}</div>
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Historial de Turnos</h3>
            </div>
            
            {historyBookings.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 italic">No hay historial para mostrar</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900/50 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Fecha</th>
                      <th className="px-6 py-4 font-medium">Servicio</th>
                      <th className="px-6 py-4 font-medium">Profesional</th>
                      <th className="px-6 py-4 font-medium">Precio</th>
                      <th className="px-6 py-4 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {historyBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-gray-750/50 transition-colors">
                        <td className="px-6 py-4 text-gray-300">
                          {formatBusinessDate(new Date(booking.startAt), businessTimezone)}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          {booking.serviceName}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {booking.professionalName}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {formatPrice(booking.servicePrice)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginacin */}
            {totalHistoryPages > 1 && (
              <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-900/30">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-400">
                  Página {currentPage} de {totalHistoryPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalHistoryPages}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
