import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import ServiciosClient from './ServiciosClient';
import { Service as PrismaService } from '@prisma/client';

export default async function ServiciosPage() {
  const session = await getAuthenticatedContext();

  let services: (Omit<PrismaService, 'price'> & { price: number })[] = [];
  if (session?.user?.businessId) {
    const rawServices = await prisma.service.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    services = rawServices.map((s) => ({
      ...s,
      price: s.price.toNumber(), // Convert Decimal to Number for Client Component
    })) as typeof services;
  }

  return (
    <>
      <DashboardHeader title="Servicios" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Servicios</h1>
            <p className="text-gray-400">Administrá los servicios que ofrece tu negocio.</p>
          </div>
          <ServiciosClient 
            initialServices={services} 
            userRole={session?.user?.role || 'STAFF'} 
          />
        </div>
      </div>
    </>
  );
}
