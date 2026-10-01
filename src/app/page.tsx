import Link from 'next/link';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Prevent static generation with stale data

export default async function Home() {
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      services: {
        where: { isActive: true },
        select: { id: true, name: true, price: true, duration: true },
        take: 3
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex-1 flex items-center">
            <Link href="/" className="text-2xl font-extrabold tracking-tighter text-black hover:opacity-80 transition-opacity">
              TURNOS
            </Link>
          </div>
          
          <nav className="hidden md:flex flex-1 justify-center">
            <span className="text-sm font-semibold text-gray-900 px-3 py-2">Explorar negocios</span>
          </nav>

          <div className="flex-1 flex items-center justify-end gap-6">
            <Link href="/business" className="hidden md:block text-sm font-medium text-gray-500 hover:text-black transition-colors">
              Para negocios
            </Link>
            <Link href="/login" className="text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* SEARCH SECTION (HERO) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
            Encontrá y reservá tu próximo turno
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl">
            Descubrí los mejores profesionales y negocios en tu zona. Reservá al instante, sin llamadas ni demoras.
          </p>

          <div className="w-full max-w-3xl bg-white border border-gray-200 shadow-xl shadow-gray-200/40 rounded-3xl md:rounded-full flex flex-col md:flex-row items-center p-2 relative">
            
            <div className="flex-1 w-full px-6 py-3 md:py-2 bg-gray-50 md:bg-transparent rounded-2xl md:rounded-full md:hover:bg-gray-50 transition-colors cursor-not-allowed group mb-2 md:mb-0">
              <label className="block text-xs font-bold text-gray-400 tracking-wide uppercase mb-1">¿Qué buscás?</label>
              <input 
                type="text" 
                placeholder="Próximamente búsqueda avanzada..." 
                className="w-full bg-transparent border-none p-0 text-sm text-gray-400 placeholder-gray-400 focus:ring-0 truncate cursor-not-allowed"
                disabled
              />
            </div>
            
            <div className="hidden md:block w-px h-10 bg-gray-200 mx-2"></div>
            
            <div className="flex-1 w-full px-6 py-3 md:py-2 bg-gray-50 md:bg-transparent rounded-2xl md:rounded-full md:hover:bg-gray-50 transition-colors cursor-not-allowed group mb-2 md:mb-0">
              <label className="block text-xs font-bold text-gray-400 tracking-wide uppercase mb-1">¿Dónde?</label>
              <input 
                type="text" 
                placeholder="Cualquier ubicación" 
                className="w-full bg-transparent border-none p-0 text-sm text-gray-400 placeholder-gray-400 focus:ring-0 truncate cursor-not-allowed"
                disabled
              />
            </div>

            <button disabled className="w-full md:w-auto bg-gray-100 text-gray-400 p-4 md:w-12 md:h-12 rounded-2xl md:rounded-full flex items-center justify-center cursor-not-allowed flex-shrink-0 mt-2 md:mt-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="md:hidden ml-2 font-bold">Buscar</span>
            </button>
          </div>
        </section>

        {/* REAL BUSINESSES SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Negocios disponibles</h2>
          </div>

          {businesses.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Todavía no hay negocios disponibles</h3>
              <p className="text-gray-500">Estamos preparando los primeros comercios para vos. Volvé pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {businesses.map((biz) => (
                <Link 
                  href={`/negocios/${biz.slug}`} 
                  key={biz.id}
                  className="group bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-300 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col h-full relative"
                >
                  {/* Banner placeholder */}
                  <div className="h-32 bg-gray-100 relative">
                    {biz.coverImageUrl && (
                       <img src={biz.coverImageUrl} className="w-full h-full object-cover" alt="Portada" />
                    )}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col pt-8 relative">
                    {biz.logoUrl && (
                      <div className="absolute -top-6 left-6 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-white">
                        <img src={biz.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-gray-900 truncate mb-1 group-hover:text-black transition-colors">{biz.name}</h3>
                    <p className="text-sm text-gray-500 mb-2 font-medium">/{biz.slug}</p>
                    {biz.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{biz.description}</p>
                    )}
                    
                    <div className="flex-1">
                      {biz.services.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Servicios</div>
                          {biz.services.map(s => (
                            <div key={s.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 truncate mr-2">{s.name}</span>
                              <span className="text-gray-500 font-medium whitespace-nowrap">${s.price.toString()}</span>
                            </div>
                          ))}
                          {biz.services.length === 3 && (
                            <div className="text-xs text-gray-400 italic mt-2">+ más servicios</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">Consultar servicios</div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-50">
                      <span className="inline-flex w-full items-center justify-center bg-gray-50 text-gray-900 font-bold px-4 py-2.5 rounded-xl group-hover:bg-gray-900 group-hover:text-white transition-colors">
                        Ver disponibilidad
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tight text-black">
            TURNOS
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-black transition-colors">Inicio</Link>
            <Link href="/login" className="hover:text-black transition-colors">Iniciar sesión</Link>
            <Link href="/business" className="hover:text-black transition-colors">Para negocios</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
