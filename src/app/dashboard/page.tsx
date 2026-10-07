import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from './DashboardHeader';
import WhatsAppAction from '@/components/dashboard/WhatsAppAction';
import Link from 'next/link';
import { getBusinessDayBounds, formatBusinessDate } from '@/lib/date-utils';
import OnboardingBanner from './OnboardingBanner';

export default async function DashboardResumenPage() {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;
  const userName = session.user.name || 'Usuario';

  // Get business for timezone
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true, name: true, slug: true }
  });

  if (!business) {
    return <div>Negocio no encontrado</div>;
  }

  // Cálculos de fecha
  const nowUTC = new Date();
  const todayLocalString = formatBusinessDate(nowUTC, business.timezone, 'yyyy-MM-dd');
  const todayBounds = getBusinessDayBounds(todayLocalString, business.timezone);

  // Consultas concurrentes sin cruzar tenants
  const [
    turnosHoyCount,
    proximosCount,
    clientesCount,
    profesionalesCount,
    proximosTurnos,
    serviciosCount,
    businessHoursData
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        businessId,
        startAt: { gte: todayBounds.startAt, lte: todayBounds.endAt },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      }
    }),
    prisma.booking.count({
      where: {
        businessId,
        startAt: { gte: nowUTC },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      }
    }),
    prisma.customer.count({
      where: { businessId, isActive: true }
    }),
    prisma.professional.count({
      where: { businessId, isActive: true }
    }),
    prisma.booking.findMany({
      where: {
        businessId,
        startAt: { gte: nowUTC },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      },
      orderBy: { startAt: 'asc' },
      take: 5,
      include: {
        customer: { select: { name: true, phone: true } },
      }
    }),
    prisma.service.count({
      where: { businessId, isActive: true }
    }),
    prisma.businessHour.findFirst({
      where: { businessId },
      select: { id: true }
    })
  ]);

  const isPublicPageReady = !!business.slug;
  const isServicesReady = serviciosCount > 0;
  const isProfessionalsReady = profesionalesCount > 0;
  const isHoursReady = !!businessHoursData;

  const isOnboardingComplete = isPublicPageReady && isServicesReady && isProfessionalsReady && isHoursReady;

  return (
    <>
      <DashboardHeader title="Resumen" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Buenos días, {userName}</h1>
            <p className="text-gray-400">Acá tenés un resumen de tu negocio.</p>
          </div>

          {!isOnboardingComplete && (
            <OnboardingBanner 
              isServicesReady={isServicesReady}
              isProfessionalsReady={isProfessionalsReady}
              isHoursReady={isHoursReady}
              isPublicPageReady={isPublicPageReady}
            />
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <MetricCard title="Turnos de hoy" value={turnosHoyCount.toString()} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} />
            <MetricCard title="Próximos turnos" value={proximosCount.toString()} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />} />
            <MetricCard title="Clientes activos" value={clientesCount.toString()} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />} />
            <MetricCard title="Profesionales" value={profesionalesCount.toString()} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Próximos turnos</h3>
                <Link href="/dashboard/turnos" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                  Ver todos &rarr;
                </Link>
              </div>
              
              <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Día y Hora</th>
                        <th className="px-6 py-4 font-semibold">Cliente</th>
                        <th className="px-6 py-4 font-semibold">Servicio</th>
                        <th className="px-6 py-4 font-semibold text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {proximosTurnos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No hay turnos próximos.
                          </td>
                        </tr>
                      ) : (
                        proximosTurnos.map(t => {
                          const dateStr = formatBusinessDate(t.startAt, business.timezone, 'dd/MM/yyyy');
                          const timeStr = formatBusinessDate(t.startAt, business.timezone, 'HH:mm');
                          const displayTime = dateStr === todayLocalString ? `Hoy ${timeStr}` : `${dateStr} ${timeStr}`;
                          return (
                            <TableRow 
                              key={t.id}
                              time={displayTime} 
                              client={t.customer.name} 
                              phone={t.customer.phone} 
                              service={t.serviceName} 
                              status={t.status === 'CONFIRMED' ? 'Confirmado' : t.status === 'PENDING' ? 'Pendiente' : t.status === 'COMPLETED' ? 'Completado' : t.status} 
                              businessName={business.name}
                            />
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">Acciones rápidas</h3>
              <div className="bg-[#111113] border border-gray-800 rounded-2xl p-4 space-y-3">
                <QuickActionLink href="/dashboard/turnos" label="Nuevo turno" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />} />
                <QuickActionLink href="/dashboard/clientes" label="Nuevo cliente" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />} />
                <QuickActionLink href="/dashboard/servicios" label="Nuevo servicio" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />} />
                <QuickActionLink href="/dashboard/profesionales" label="Agregar profesional" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-medium text-gray-400">{title}</div>
        <div className="text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function TableRow({ time, client, phone, service, status, businessName }: { time: string, client: string, phone: string | null, service: string, status: string, businessName: string }) {
  const isConfirmed = status === 'Confirmado';
  const isCompleted = status === 'Completado';
  
  let statusClass = 'bg-yellow-500/10 text-yellow-400'; // pending default
  if (isConfirmed) statusClass = 'bg-green-500/10 text-green-400';
  if (isCompleted) statusClass = 'bg-blue-500/10 text-blue-400';

  return (
    <tr className="hover:bg-[#1A1A1C] transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-white font-mono font-bold">{time}</td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-medium">{client}</td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{service}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
          {status}
        </span>
        {phone && (
          <WhatsAppAction 
            clientName={client} 
            clientPhone={phone} 
            businessName={businessName}
            turnoInfo={{ time, service }}
            variant="icon"
          />
        )}
      </td>
    </tr>
  );
}

function QuickActionLink({ label, icon, href }: { label: string, icon: React.ReactNode, href: string }) {
  return (
    <Link href={href} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-800 bg-[#1A1A1C] text-left text-sm font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group">
      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      {label}
    </Link>
  );
}

