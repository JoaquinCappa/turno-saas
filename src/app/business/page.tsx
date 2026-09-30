import Link from 'next/link';

export default function BusinessLandingPage() {
  return (
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mb-6">
          Gestioná tu negocio desde un solo lugar.
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
          Organizá tus turnos, servicios y equipo. Dale a tus clientes una forma simple de reservar online.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-200 transition-colors text-center">
            Crear mi negocio
          </Link>
          <Link href="/login" className="w-full sm:w-auto bg-[#1A1A1C] text-white border border-gray-700 px-8 py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors text-center">
            Iniciar sesión
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">
        <p className="text-lg">
          Todo lo que necesitás para gestionar tu negocio, diseñado para potenciar tu crecimiento.
        </p>
      </section>
    </>
  );
}
