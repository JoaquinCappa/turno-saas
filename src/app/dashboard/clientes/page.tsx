import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import ClientesClient from './ClientesClient';
import { Customer } from '@prisma/client';

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);

  let customers: Customer[] = [];
  let businessName = '';
  if (session?.user?.businessId) {
    customers = await prisma.customer.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { createdAt: 'desc' },
    });
    
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { name: true }
    });
    businessName = business?.name || '';
  }

  return (
    <>
      <DashboardHeader title="Clientes" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clientes</h1>
            <p className="text-gray-400">Consultá y administrá tus clientes.</p>
          </div>
          <ClientesClient 
            initialCustomers={customers} 
            userRole={session?.user?.role || 'STAFF'} 
            businessName={businessName}
          />
        </div>
      </div>
    </>
  );
}
