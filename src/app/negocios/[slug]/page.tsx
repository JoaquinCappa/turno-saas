import { notFound } from 'next/navigation';
import { getPublicBusiness, getPublicServices, getPublicProfessionals } from '@/app/actions/publicBooking';
import PublicBookingClient from './PublicBookingClient';

export default async function PublicBusinessPage({ params }: { params: { slug: string } }) {
  const business = await getPublicBusiness(params.slug);

  if (!business) {
    notFound();
  }

  const services = await getPublicServices(business.id);
  const professionals = await getPublicProfessionals(business.id);

  if (services.length === 0 || professionals.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
          <p className="text-gray-400">Este negocio aún no está listo para recibir reservas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{business.name}</h1>
          <p className="text-gray-400">Reserva tu turno online</p>
        </div>

        <PublicBookingClient 
          business={business}
          services={services}
          professionals={professionals}
        />
      </div>
    </div>
  );
}
