import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <main className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-4">
            Turnos SaaS
          </h1>
          <p className="text-lg text-gray-600">
            Encontrá y reservá tu próximo turno fácilmente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Path: Cliente Final */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Para Clientes</h2>
            <p className="text-gray-600 mb-6 flex-1">
              Buscá negocios, mirá sus servicios y reservá tu turno en segundos. Sin necesidad de crear una cuenta.
            </p>
            <button 
              disabled 
              className="w-full bg-gray-100 text-gray-400 font-medium py-2 px-4 rounded-md cursor-not-allowed"
            >
              Explorar negocios (Próximamente)
            </button>
          </div>

          {/* Path: Negocio */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Para Negocios</h2>
            <p className="text-gray-600 mb-6 flex-1">
              Gestioná tu agenda, tus servicios y a tu equipo desde un panel de control exclusivo para vos.
            </p>
            <div className="w-full flex flex-col gap-3">
              <Link 
                href="/login" 
                className="w-full bg-black text-white font-medium py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link 
                href="/register" 
                className="w-full bg-white text-black border border-gray-300 font-medium py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
              >
                Crear mi negocio
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
