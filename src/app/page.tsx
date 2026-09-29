import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* HEADER */}
      <header className="w-full border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black tracking-tight text-gray-900">
              Turnos
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <span className="text-sm font-medium text-gray-500 cursor-not-allowed">Explorar</span>
              <a href="#negocios" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Para negocios
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="hidden sm:inline-flex text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-32 text-center flex flex-col items-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 max-w-4xl mb-6">
            Encontrá y reservá tu próximo turno.
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-12">
            Barberías, peluquerías, estética, uñas, masajes y más. Elegí dónde querés ir y reservá en pocos pasos.
          </p>

          {/* FAKE SEARCH BOX */}
          <div className="w-full max-w-3xl bg-white p-2 rounded-2xl md:rounded-full border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-center gap-2 relative">
            <div className="w-full md:flex-1 flex flex-col items-start px-4 py-2 border-b md:border-b-0 md:border-r border-gray-100">
              <label className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1">
                ¿Qué servicio estás buscando?
              </label>
              <input 
                type="text" 
                placeholder="Ej: Barbería, Uñas..." 
                className="w-full text-sm text-gray-600 placeholder-gray-400 bg-transparent focus:outline-none"
                disabled
              />
            </div>
            
            <div className="w-full md:flex-1 flex flex-col items-start px-4 py-2">
              <label className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1">
                ¿Dónde?
              </label>
              <input 
                type="text" 
                placeholder="Ej: Mendoza" 
                className="w-full text-sm text-gray-600 placeholder-gray-400 bg-transparent focus:outline-none"
                disabled
              />
            </div>

            <button 
              disabled
              className="w-full md:w-auto mt-2 md:mt-0 bg-black text-white px-8 py-4 md:py-3 rounded-xl md:rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buscar
            </button>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-400">
              (Búsqueda disponible próximamente)
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="bg-gray-50/50 py-24 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-10">¿Qué estás buscando?</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {['Barberías', 'Peluquerías', 'Estética', 'Uñas', 'Masajes', 'Spa', 'Fitness'].map((cat) => (
                <div 
                  key={cat} 
                  className="px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm opacity-80 cursor-not-allowed hover:border-gray-300 transition-colors"
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* B2B SECTION */}
        <section id="negocios" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="bg-black rounded-3xl p-10 md:p-20 text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              ¿Tenés un negocio?
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10">
              Gestioná tus turnos, servicios y equipo desde un solo lugar. Simple, rápido y diseñado para potenciar tu crecimiento.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link 
                href="/register" 
                className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors text-center"
              >
                Crear mi negocio
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto bg-gray-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-700 transition-colors text-center"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tight text-gray-900">
            Turnos
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#negocios" className="hover:text-gray-900 transition-colors">Para negocios</a>
            <Link href="/login" className="hover:text-gray-900 transition-colors">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">Crear mi negocio</Link>
          </div>
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Turnos SaaS
          </div>
        </div>
      </footer>
    </div>
  );
}
