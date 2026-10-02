import { notFound } from 'next/navigation';
import { getPublicBusiness, getPublicServices, getPublicProfessionals } from '@/app/actions/publicBooking';
import PublicBookingClient from './PublicBookingClient';
import { toZonedTime, format } from 'date-fns-tz';

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);

  if (!business) {
    notFound();
  }

  const rawServices = await getPublicServices(business.id);
  const services = rawServices.map(s => ({ id: s.id, name: s.name, duration: s.duration, price: Number(s.price) }));
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Portada */}
      {business.coverImageUrl ? (
        <div 
          className="h-48 sm:h-64 w-full bg-cover bg-center" 
          style={{ backgroundImage: `url(${business.coverImageUrl})` }}
        />
      ) : (
        <div className="h-24 sm:h-32 w-full bg-gradient-to-r from-gray-800 to-gray-900" />
      )}

      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 -mt-12 sm:-mt-16">
        <div className="max-w-2xl mx-auto">
          {/* Header del Negocio */}
          <div className="text-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
            {business.logoUrl && (
              <img 
                src={business.logoUrl} 
                alt={`Logo de ${business.name}`} 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md mx-auto -mt-16 sm:-mt-20 mb-4 object-cover bg-white"
              />
            )}
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{business.name}</h1>
            {business.description && <p className="text-gray-600 mb-4">{business.description}</p>}
            
            {(business.address || business.phone || business.email) && (
              <div className="flex flex-col items-center gap-2 text-sm text-gray-500 mt-4 border-t border-gray-100 pt-4">
                {business.address && <div>📍 {business.address}</div>}
                {business.phone && <div>📞 {business.phone}</div>}
                {business.email && <div>✉️ {business.email}</div>}
              </div>
            )}
          </div>

        <PublicBookingClient 
          business={business}
          services={services}
          professionals={professionals}
          initialDate={initialDate}
        />
        </div>
      </div>
    </div>
  );
}
