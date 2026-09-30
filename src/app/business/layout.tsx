import Link from 'next/link';
import { ReactNode } from 'react';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-300 font-sans selection:bg-gray-700 selection:text-white flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/business" className="text-2xl font-extrabold tracking-tighter text-white">
              TURNOS
            </Link>
            <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-md hidden sm:block">
              Para negocios
            </span>
          </div>
          
          <nav className="hidden md:flex flex-1 justify-center gap-8">
            <Link href="/business/producto" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Producto</Link>
            <Link href="/business/funciones" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Funciones</Link>
            <Link href="/business/precios" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Precios</Link>
          </nav>

          <div className="flex items-center justify-end gap-6">
            <Link href="/" className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Explorar Turnos
            </Link>
            <Link href="/login" className="text-sm font-semibold text-white hover:text-gray-300 transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-transform active:scale-95">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 bg-[#0A0A0B] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tight text-white">
            TURNOS
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Explorar</Link>
            <Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/business" className="hover:text-white transition-colors">Para negocios</Link>
          </div>
          <div className="text-sm text-gray-600 font-medium">
            &copy; {new Date().getFullYear()} TURNOS
          </div>
        </div>
      </footer>
    </div>
  );
}
