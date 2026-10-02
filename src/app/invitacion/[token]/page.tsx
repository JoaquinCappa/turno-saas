import { getInvitationDetails } from '@/app/actions/teamInvitations';
import AcceptInvitationClient from './AcceptInvitationClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const { token } = await params;
  
  if (!token) {
    notFound();
  }

  const res = await getInvitationDetails(token);

  if (!res.success) {
    let message = 'Invitación inválida o no encontrada.';
    if (res.error === 'accepted') message = 'Esta invitación ya fue aceptada.';
    if (res.error === 'revoked') message = 'Esta invitación ha sido revocada.';
    if (res.error === 'expired') message = 'Esta invitación ha expirado.';

    return (
      <div className="min-h-screen bg-[#0A0A0B] text-gray-200 font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111113] border border-gray-800 rounded-2xl p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Invitación no válida</h1>
          <p className="text-gray-400">{message}</p>
          <div className="pt-4">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = res.data!;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-200 font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111113] border border-gray-800 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Unite al equipo</h1>
          <p className="text-gray-400">
            Has sido invitado a unirte a <strong className="text-white">{data.businessName}</strong> como <strong className="text-white">{data.role}</strong>.
          </p>
        </div>

        <AcceptInvitationClient 
          token={token} 
          email={data.email} 
        />
      </div>
    </div>
  );
}
