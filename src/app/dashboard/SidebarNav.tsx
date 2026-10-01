'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

export default function SidebarNav({ businessName, userRole }: { businessName: string; userRole: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Resumen', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { href: '/dashboard/turnos', label: 'Turnos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { href: '/dashboard/calendario', label: 'Calendario', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { href: '/dashboard/servicios', label: 'Servicios', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
    { href: '/dashboard/profesionales', label: 'Profesionales', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { href: '/dashboard/clientes', label: 'Clientes', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
  ];

  if (userRole === 'OWNER') {
    navItems.push({
      href: '/dashboard/equipo',
      label: 'Equipo',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    });
  }

  return (
    <aside className="w-full md:w-64 bg-[#111113] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col flex-shrink-0">
      <div className="p-6">
        <Link href="/" className="text-xl font-black tracking-tighter text-white block mb-6">
          TURNOS
        </Link>
        <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-white">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white truncate">{businessName}</div>
            <div className="text-xs text-gray-500">Negocio</div>
          </div>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto hidden md:block space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile Nav Horizon */}
      <nav className="flex md:hidden overflow-x-auto px-4 pb-4 gap-2 no-scrollbar">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 hidden md:block space-y-1">
        <Link href="/dashboard/configuracion" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === '/dashboard/configuracion' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configuración
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
