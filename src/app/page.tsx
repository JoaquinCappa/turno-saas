import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
      <main className="max-w-2xl bg-white p-12 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-6">
          Turnos SaaS
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Sistema de gestión de reservas multi-tenant para negocios de servicios.
        </p>
        <div className="flex gap-4 justify-center">
          <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
            Next.js App Router
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-700/10">
            Tailwind CSS
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10">
            Prisma + PostgreSQL
          </span>
        </div>
      </main>
    </div>
  );
}
