import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import SidebarNav from './SidebarNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedContext();

  if (!session || !session.user || !session.user.businessId) {
    redirect('/login');
  }

  // Obtenemos el negocio real desde PostgreSQL
  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
  });

  if (!business) {
    redirect('/login');
  }

  const businessName = business.name;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-200 font-sans flex flex-col md:flex-row selection:bg-gray-700 selection:text-white">
      
      {/* SIDEBAR */}
      <SidebarNav businessName={businessName} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
