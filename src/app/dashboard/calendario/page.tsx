import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import CalendarioClient from './CalendarioClient';
import { getBusinessDayBounds, getBusinessWeekBounds, formatBusinessDate } from '@/lib/date-utils';
import { Prisma } from '@prisma/client';

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;

  // Get business for timezone
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true, name: true }
  });

  if (!business) {
    return <div>Negocio no encontrado</div>;
  }

  const sp = await searchParams;
  
  // Si no hay fecha, usamos hoy (local al negocio)
  const todayLocal = formatBusinessDate(new Date(), business.timezone, 'yyyy-MM-dd');
  const view = sp.view === 'Semana' ? 'Semana' : 'Día';
  const targetDate = sp.date || todayLocal;
  const professionalId = sp.prof || '';

  // Determinar bounds en UTC
  let startAtUTC: Date;
  let endAtUTC: Date;
  if (view === 'Semana') {
    const bounds = getBusinessWeekBounds(targetDate, business.timezone);
    startAtUTC = bounds.startAt;
    endAtUTC = bounds.endAt;
  } else {
    const bounds = getBusinessDayBounds(targetDate, business.timezone);
    startAtUTC = bounds.startAt;
    endAtUTC = bounds.endAt;
  }

  // Obtener profesionales para el filtro
  const professionals = await prisma.professional.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true }
  });

  // Query Booking
  const whereClause: Prisma.BookingWhereInput = {
    businessId,
    startAt: { gte: startAtUTC, lte: endAtUTC }
  };

  if (professionalId) {
    whereClause.professionalId = professionalId;
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      professional: { select: { id: true, name: true } },
    },
    orderBy: { startAt: 'asc' }
  });

  // Convert decimal to number for serialization
  const serializedBookings = bookings.map(b => ({
    ...b,
    servicePrice: b.servicePrice.toNumber(),
  }));

  return (
    <>
      <DashboardHeader title="Calendario" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <CalendarioClient 
            initialBookings={serializedBookings}
            professionals={professionals}
            businessTimezone={business.timezone}
            currentDate={targetDate}
            currentView={view}
            currentProf={professionalId}
          />
        </div>
      </div>
    </>
  );
}
