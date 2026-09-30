export default function BusinessFuncionesPage() {
  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Todo lo que necesitás</h1>
          <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">
            Herramientas profesionales sin la complejidad.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: 'Gestioná tus turnos', desc: 'Calendario inteligente, notificaciones automáticas y control total de tu agenda diaria.' },
            { title: 'Organizá tus servicios', desc: 'Creá un menú de servicios con duraciones y precios para que tus clientes elijan fácil.' },
            { title: 'Administrá tu equipo', desc: 'Asigná turnos a distintos profesionales y gestioná los horarios de cada uno.' },
            { title: 'Reservas online 24/7', desc: 'Dejá de contestar mensajes. Tus clientes reservan solos a cualquier hora.' },
          ].map((f, i) => (
            <div key={i} className="bg-[#111113] border border-gray-800 p-8 rounded-2xl hover:border-gray-600 transition-colors">
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
