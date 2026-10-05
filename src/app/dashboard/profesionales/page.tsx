import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';
import ProfesionalesClient from './ProfesionalesClient';



export default async function ProfesionalesPage() {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return <div>No autorizado</div>;
  }

  const businessId = session.user.businessId;

  const professionals = await prisma.professional.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });

  const businessHours = await prisma.businessHour.findMany({
    where: { businessId },
  });

  return (
    <>
      <DashboardHeader title="Profesionales" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profesionales</h1>
            <p className="text-gray-400">Administrá las personas que trabajan en tu negocio.</p>
          </div>
          <ProfesionalesClient 
            initialProfessionals={professionals} 
            businessHours={businessHours}
            userRole={session?.user?.role || 'STAFF'} 
          />
        </div>
      </div>
    </>
  );
}
