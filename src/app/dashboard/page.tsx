import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch business securely from server using the session businessId
  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: { name: true }
  });

  if (!business) {
    // Failsafe in case business was deleted but session persists
    return (
      <div className="min-h-screen p-8 text-center">
        <h1 className="text-red-600 text-2xl font-bold">Error de cuenta</h1>
        <p>El negocio asociado a esta cuenta ya no existe.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
        <div className="text-sm text-gray-600 flex items-center gap-4">
          <span>{session.user.name} ({session.user.role})</span>
          <Link href="/api/auth/signout" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded transition-colors">
            Cerrar Sesión
          </Link>
        </div>
      </header>
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-2">¡Bienvenido al área de gestión de tu negocio!</p>
            <p className="text-sm text-gray-500">
              Esta es un área protegida. Por ahora es un placeholder.
              Las funcionalidades internas del negocio se desarrollarán aquí.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
