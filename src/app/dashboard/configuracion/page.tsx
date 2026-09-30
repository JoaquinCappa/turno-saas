import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardHeader from '../DashboardHeader';

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  
  const business = await prisma.business.findUnique({
    where: { id: session?.user?.businessId },
  });

  const userName = session?.user?.name || 'Usuario';
  const userEmail = session?.user?.email || 'demo@ejemplo.com';
  const userRole = session?.user?.role || 'STAFF';
  const businessName = business?.name || 'Negocio';

  return (
    <>
      <DashboardHeader title="Configuración" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
            <p className="text-gray-400">Configurá los datos y preferencias de tu negocio.</p>
          </div>
          
          <div className="space-y-6">
            
            {/* INFORMACION DEL NEGOCIO */}
            <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Información del negocio</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Nombre</div>
                  <div className="sm:col-span-2 text-white font-medium">{businessName}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Slug</div>
                  <div className="sm:col-span-2 text-gray-400 font-mono">
                    {businessName.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Estado</div>
                  <div className="sm:col-span-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400">Activo</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#1A1A1C] border-t border-gray-800 flex justify-end">
                <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">Editar información</button>
              </div>
            </div>

            {/* CUENTA */}
            <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Cuenta</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Nombre de usuario</div>
                  <div className="sm:col-span-2 text-white font-medium">{userName}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Email</div>
                  <div className="sm:col-span-2 text-gray-300">{userEmail}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm font-medium text-gray-400">Rol</div>
                  <div className="sm:col-span-2 text-gray-300 font-mono text-xs">{userRole}</div>
                </div>
              </div>
            </div>

            {/* PREFERENCIAS */}
            <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Preferencias</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Notificaciones por email</h4>
                    <p className="text-sm text-gray-400">Recibir avisos de nuevos turnos.</p>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Reservas online</h4>
                    <p className="text-sm text-gray-400">Permitir que los clientes reserven desde la web pública.</p>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
