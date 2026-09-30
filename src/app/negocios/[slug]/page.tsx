import { notFound } from 'next/navigation';
import { getPublicBusiness, getPublicServices, getPublicProfessionals } from '@/app/actions/publicBooking';
import PublicBookingClient from './PublicBookingClient';
import { toZonedTime, format } from 'date-fns-tz';

export default async function PublicBusinessPage({ params }: { params: { slug: string } }) {
  const business = await getPublicBusiness(params.slug);

  if (!business) {
    notFound();
  }

  const services = await getPublicServices(business.id);
  const professionals = await getPublicProfessionals(business.id);

  if (services.length === 0 || professionals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
          <p className="text-gray-500">Este negocio aún no está listo para recibir reservas.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const zonedDate = toZonedTime(now, business.timezone);
  const initialDate = format(zonedDate, 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-gray-900 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{business.name}</h1>
          <p className="text-gray-500">Reservá tu turno online de forma rápida y sencilla</p>
        </div>

        <PublicBookingClient 
          business={business}
          services={services}
          professionals={professionals}
          initialDate={initialDate}
        />
      </div>
    </div>
  );
}
