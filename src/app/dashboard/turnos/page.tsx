import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import TurnosClient from './TurnosClient';

export default async function TurnosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;

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

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, timezone: true }
  });

  // Fetch recent bookings (limit to 100 for now, ideally paginated)
  const bookings = await prisma.booking.findMany({
    where: { businessId },
    include: {
      customer: { select: { name: true, phone: true } },
      professional: { select: { name: true } }
    },
    orderBy: { startAt: 'desc' },
    take: 100
  });

  // Convert decimal to number for client component
  const safeServices = services.map(s => ({ ...s, price: s.price.toNumber() }));

  return (
    <>
      <DashboardHeader title="Turnos" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Turnos</h1>
            <p className="text-gray-400">Gestioná las reservas de tu negocio.</p>
          </div>
          <TurnosClient 
            initialBookings={bookings}
            customers={customers}
            services={safeServices}
            professionals={professionals}
            businessName={business?.name || ''}
            businessTimezone={business?.timezone || 'America/Argentina/Buenos_Aires'}
            userRole={session.user.role}
          />
        </div>
      </div>
    </>
  );
}
