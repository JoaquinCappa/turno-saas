import { getAuthenticatedContext } from '@/lib/auth';
import DashboardHeader from '../DashboardHeader';
import EquipoClient from './EquipoClient';
import { listTeamMembers } from '@/app/actions/team';
import { listTeamInvitations } from '@/app/actions/teamInvitations';
import { redirect } from 'next/navigation';

export default async function EquipoPage() {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId || session.user.role !== 'OWNER') {
    redirect('/dashboard');
  }

  const [membersRes, invitesRes] = await Promise.all([
    listTeamMembers(),
    listTeamInvitations()
  ]);
  
  if (!membersRes.success || !membersRes.data) {
    return <div>Error al cargar el equipo: {membersRes.error}</div>;
  }

  const initialMembers = membersRes.data as unknown as { id: string; name: string | null; email: string; role: 'OWNER' | 'ADMIN' | 'STAFF'; isActive: boolean; createdAt: Date }[];
  const initialInvites = (invitesRes.success && invitesRes.data ? invitesRes.data : []) as unknown as { id: string; email: string; role: 'ADMIN' | 'STAFF'; expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null; createdAt: Date }[];

  return (
    <>
      <DashboardHeader title="Equipo" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white mb-2">Miembros del equipo</h2>
              <p className="text-gray-400">Administrá los usuarios que tienen acceso a tu negocio.</p>
            </div>
            <EquipoClient 
              initialMembers={initialMembers} 
              initialInvites={initialInvites}
              currentUserId={session.user.id} 
            />
          </div>
        </div>
      </div>
    </>
  );
}
