import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import HorariosClient from './HorariosClient';
import BusinessClient from './BusinessClient';
import BloqueosClient from './BloqueosClient';

export default async function ConfiguracionPage() {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) return <div>Negocio no encontrado</div>;

  const hours = await prisma.businessHour.findMany({
    where: { businessId }
  });

  const blocks = await prisma.blockedTime.findMany({
    where: { businessId },
    orderBy: { date: 'asc' }
  });

  const userRole = session.user.role;

  return (
    <>
      <DashboardHeader title="Configuración" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
            <p className="text-gray-400">Configurá los datos y preferencias operativas de tu negocio.</p>
          </div>
          
          <div className="space-y-8">
            
            <BusinessClient 
              initialName={business.name}
              initialSlug={business.slug}
              initialTimezone={business.timezone}
              initialDescription={business.description}
              initialPhone={business.phone}
              initialEmail={business.email}
              initialAddress={business.address}
              initialLogoUrl={business.logoUrl}
              initialCoverImageUrl={business.coverImageUrl}
              userRole={userRole}
            />

            <HorariosClient 
              initialHours={hours} 
              userRole={userRole} 
            />

            <BloqueosClient 
              initialBlocks={blocks}
              userRole={userRole}
            />

          </div>
        </div>
      </div>
    </>
  );
}

