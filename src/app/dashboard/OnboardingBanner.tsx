import Link from 'next/link';

export default function OnboardingBanner({
  isServicesReady,
  isProfessionalsReady,
  isHoursReady,
  isPublicPageReady,
}: {
  isServicesReady: boolean;
  isProfessionalsReady: boolean;
  isHoursReady: boolean;
  isPublicPageReady: boolean;
}) {
  const steps = [
    {
      id: 'publicPage',
      label: 'Página pública',
      isReady: isPublicPageReady,
      href: '/dashboard/configuracion',
    },
    {
      id: 'services',
      label: 'Servicios',
      isReady: isServicesReady,
      href: '/dashboard/servicios',
    },
    {
      id: 'professionals',
      label: 'Profesionales',
      isReady: isProfessionalsReady,
      href: '/dashboard/profesionales',
    },
    {
      id: 'hours',
      label: 'Horarios',
      isReady: isHoursReady,
      href: '/dashboard/configuracion',
    },
  ];

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 flex items-center justify-center rounded-full flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-yellow-500 mb-2">Completá tu configuración</h2>
          <p className="text-gray-300 mb-6 text-sm">
            Tu página de reservas todavía necesita algunos datos antes de estar lista para recibir turnos. Hacé clic en los pasos pendientes para completarlos.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {steps.map(step => (
              <Link 
                key={step.id} 
                href={step.href}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  step.isReady 
                    ? 'bg-green-500/10 border-green-500/20 opacity-70 cursor-default' 
                    : 'bg-[#1A1A1C] border-gray-700 hover:border-yellow-500/50 hover:bg-gray-800 cursor-pointer'
                }`}
                onClick={(e) => {
                  if (step.isReady) e.preventDefault();
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.isReady ? 'bg-green-500 text-black' : 'border-2 border-gray-600 text-transparent'
                }`}>
                  {step.isReady && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-semibold ${step.isReady ? 'text-green-400' : 'text-gray-200'}`}>
                  {step.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
