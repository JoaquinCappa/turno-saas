import { notFound } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../../DashboardHeader';
import ClienteDetailClient from './ClienteDetailClient';

export default async function ClienteDetailPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | undefined }> 
}) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const { id } = await params;
  const sp = await searchParams;
  
  const businessId = session.user.businessId;

  // 1. OBTENER CLIENTE AISLADO POR TENANT (TENANT ISOLATION)
  const customer = await prisma.customer.findFirst({
    where: { 
      id,
      // CRITICAL: Prevent IDOR. Make sure this customer belongs to the authenticated business.
      businessId 
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      isActive: true,
      createdAt: true
    }
  });

  if (!customer) {
    // Si el cliente no existe o pertenece a otro tenant, devolvemos 404 para no filtrar información.
    notFound();
  }

  // Obtener Timezone del Negocio
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true }
  });

  const businessTimezone = business?.timezone || 'America/Argentina/Buenos_Aires';

  // 2. MÉTRICAS (TOTAL, COMPLETADOS, CANCELADOS, NO_SHOWS)
  // Realizamos un groupBy rpido para los estados
  const statsGroup = await prisma.booking.groupBy({
    by: ['status'],
    where: {
      businessId,
      customerId: id
    },
    _count: {
      id: true
    }
  });

  let total = 0;
  let completed = 0;
  let cancelled = 0;
  let noShows = 0;

  statsGroup.forEach(group => {
    total += group._count.id;
    if (group.status === 'COMPLETED') completed += group._count.id;
    if (group.status === 'CANCELLED') cancelled += group._count.id;
    if (group.status === 'NO_SHOW') noShows += group._count.id;
  });

  // 3. PRÓXIMOS TURNOS (Limitado a 5, startAt > now, PENDING/CONFIRMED)
  const now = new Date();
  const upcomingRaw = await prisma.booking.findMany({
    where: {
      businessId,
      customerId: id,
      startAt: { gt: now },
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    orderBy: { startAt: 'asc' },
    take: 5,
    select: {
      id: true,
      startAt: true,
      endAt: true,
      serviceName: true,
      servicePrice: true,
      status: true,
      professional: { select: { name: true } }
    }
  });

  // Safe mapping - managementTokenHash is completely excluded from the initial query and mapping
  const upcomingBookings = upcomingRaw.map(b => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    serviceName: b.serviceName,
    servicePrice: b.servicePrice.toNumber(),
    status: b.status,
    professionalName: b.professional.name
  }));

  // 4. HISTORIAL PAGINADO
  const page = parseInt(sp.page || '1', 10) || 1;
  const safePage = page > 0 ? page : 1;
  const pageSize = 10;

  const totalHistoryItems = await prisma.booking.count({
    where: {
      businessId,
      customerId: id
    }
  });

  const totalHistoryPages = Math.ceil(totalHistoryItems / pageSize) || 1;
  const actualPage = Math.min(safePage, totalHistoryPages);

  const historyRaw = await prisma.booking.findMany({
    where: {
      businessId,
      customerId: id
    },
    orderBy: { startAt: 'desc' },
    skip: (actualPage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      startAt: true,
      endAt: true,
      serviceName: true,
      servicePrice: true,
      status: true,
      professional: { select: { name: true } }
    }
  });

  const historyBookings = historyRaw.map(b => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    serviceName: b.serviceName,
    servicePrice: b.servicePrice.toNumber(),
    status: b.status,
    professionalName: b.professional.name
  }));

  const customerDetail = {
    ...customer,
    createdAt: customer.createdAt.toISOString()
  };

  return (
    <>
      <DashboardHeader title="Detalle del Cliente" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <ClienteDetailClient 
          customer={customerDetail}
          stats={{ total, completed, cancelled, noShows }}
          upcomingBookings={upcomingBookings}
          historyBookings={historyBookings}
          businessTimezone={businessTimezone}
          currentPage={actualPage}
          totalHistoryPages={totalHistoryPages}
        />
      </div>
    </>
  );
}
