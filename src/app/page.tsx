import Link from 'next/link';
import Image from 'next/image';

const MOCK_BUSINESSES = [
  { id: 1, name: 'Distrito Barber', category: 'Barbería', location: 'Mendoza', rating: '4,9', img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80', tag: 'Destacado' },
  { id: 2, name: 'Studio 22', category: 'Peluquería', location: 'Godoy Cruz', rating: '4,8', img: 'https://images.unsplash.com/photo-1521590832167-7bfc17484d20?w=800&q=80', tag: 'Nuevo' },
  { id: 3, name: 'Black Barber', category: 'Barbería', location: 'Luján de Cuyo', rating: '4,7', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80' },
  { id: 4, name: 'Estudio Alma', category: 'Estética', location: 'Guaymallén', rating: '5,0', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80' },
  { id: 5, name: 'Urban Nails', category: 'Uñas', location: 'Ciudad', rating: '4,6', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex-1 flex items-center">
            <Link href="/" className="text-2xl font-extrabold tracking-tighter text-black">
              TURNOS
            </Link>
          </div>
          
          <nav className="hidden md:flex flex-1 justify-center">
            <button className="text-sm font-semibold text-gray-900 cursor-not-allowed">Explorar</button>
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

      <main className="pb-24">
        {/* SEARCH SECTION (HERO) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 flex flex-col items-center">
          <div className="w-full max-w-3xl bg-white border border-gray-200 shadow-lg shadow-gray-200/50 rounded-full flex flex-col md:flex-row items-center p-2 relative mt-4">
            
            <div className="flex-1 w-full px-6 py-2 hover:bg-gray-50 rounded-full transition-colors cursor-text group">
              <label className="block text-xs font-extrabold text-black tracking-wide">¿Qué servicio buscás?</label>
              <input 
                type="text" 
                placeholder="Barbería, uñas, masaje..." 
                className="w-full bg-transparent border-none p-0 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 truncate"
                disabled
              />
            </div>
            
            <div className="hidden md:block w-px h-10 bg-gray-200"></div>
            
            <div className="flex-1 w-full px-6 py-2 hover:bg-gray-50 rounded-full transition-colors cursor-text group">
              <label className="block text-xs font-extrabold text-black tracking-wide">¿Dónde?</label>
              <input 
                type="text" 
                placeholder="Ej. Mendoza" 
                className="w-full bg-transparent border-none p-0 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 truncate"
                disabled
              />
            </div>

            <button disabled className="mt-2 md:mt-0 w-full md:w-auto bg-black text-white p-4 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:bg-gray-300 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="md:hidden ml-2 font-semibold">Buscar</span>
            </button>
          </div>
          <div className="mt-6 text-sm font-medium text-gray-400">
            Próximamente disponible
          </div>
        </section>

        {/* MARKETPLACE CAROUSELS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <CarouselSection title="Negocios destacados" businesses={MOCK_BUSINESSES} />
          <CarouselSection title="Barberías populares" businesses={[...MOCK_BUSINESSES].reverse()} />
          <CarouselSection title="Estética y bienestar" businesses={[MOCK_BUSINESSES[3], MOCK_BUSINESSES[4], MOCK_BUSINESSES[1], MOCK_BUSINESSES[2], MOCK_BUSINESSES[0]]} />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tight text-black">
            TURNOS
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-black transition-colors">Explorar</Link>
            <Link href="/login" className="hover:text-black transition-colors">Iniciar sesión</Link>
            <Link href="/business" className="hover:text-black transition-colors">Para negocios</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// COMPONENTES AUXILIARES

function CarouselSection({ title, businesses }: { title: string, businesses: typeof MOCK_BUSINESSES }) {
  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      
      <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {businesses.map((biz, idx) => (
          <div key={`${biz.id}-${idx}`} className="flex-none w-[280px] md:w-[300px] snap-start group cursor-pointer">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gray-100">
              <Image 
                src={biz.img} 
                alt={biz.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized // So it works statically with Unsplash
              />
              {biz.tag && (
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-black text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {biz.tag}
                </div>
              )}
              <button className="absolute top-3 right-3 p-2 text-white hover:scale-110 transition-transform">
                <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between items-start px-1">
              <div>
                <h3 className="font-semibold text-gray-900 truncate">{biz.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{biz.category}</p>
                <p className="text-sm text-gray-500">{biz.location}</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium mt-0.5">
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {biz.rating}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
