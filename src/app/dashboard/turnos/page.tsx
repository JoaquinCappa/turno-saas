import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import TurnosClient from './TurnosClient';
import { Prisma } from '@prisma/client';
import { getBusinessDayBounds } from '@/lib/date-utils';

export default async function TurnosPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;

  const sp = await searchParams;
  
  const page = parseInt(sp.page || '1', 10);
  const pageSize = 20;

  // Filtros
  const statusFilter = sp.status || '';
  const profFilter = sp.prof || '';
  const serviceFilter = sp.service || '';
  const dateFilter = sp.date || '';
  const searchFilter = sp.q || '';

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, timezone: true }
  });

  if (!business) return <div>Negocio no encontrado</div>;

  // Where Clause
  const whereClause: Prisma.BookingWhereInput = { businessId };

  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter as Prisma.EnumBookingStatusFilter | undefined;
  }
  
  if (profFilter) {
    whereClause.professionalId = profFilter;
  }

  if (serviceFilter) {
    whereClause.serviceId = serviceFilter;
  }

  if (dateFilter) {
    const bounds = getBusinessDayBounds(dateFilter, business.timezone);
    whereClause.startAt = { gte: bounds.startAt, lte: bounds.endAt };
  }

  if (searchFilter) {
    whereClause.customer = {
      OR: [
        { name: { contains: searchFilter, mode: 'insensitive' } },
        { email: { contains: searchFilter, mode: 'insensitive' } },
        { phone: { contains: searchFilter, mode: 'insensitive' } }
      ]
    };
  }

  // Fetch only active entities for the dropdowns
  const customers = await prisma.customer.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, phone: true }
  });

  const services = await prisma.service.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, duration: true, price: true }
  });

  const professionals = await prisma.professional.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true }
  });

  const total = await prisma.booking.count({ where: whereClause });

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      professional: { select: { name: true } }
    },
    orderBy: { startAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  // Convert decimal to number for client component
  const safeServices = services.map(s => ({ ...s, price: s.price.toNumber() }));

  const safeBookings = bookings.map(b => ({
    ...b,
    servicePrice: b.servicePrice.toNumber()
  }));

  return (
    <>
      <DashboardHeader title="Turnos" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Turnos</h1>
            <p className="text-gray-400">Gestioná las reservas de tu negocio.</p>
          </div>
          
          <TurnosClient 
            initialBookings={safeBookings}
            customers={customers}
            services={safeServices}
            professionals={professionals}
            businessTimezone={business.timezone}
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            userRole={session.user.role}
            filters={{
              status: statusFilter,
              prof: profFilter,
              service: serviceFilter,
              date: dateFilter,
              q: searchFilter
            }}
          />
        </div>
      </div>
    </>
  );
}
