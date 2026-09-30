export default function BusinessProductoPage() {
  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Todo tu negocio, en un solo lugar.</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Gestioná turnos, servicios, profesionales y clientes. Habilitá reservas online las 24 horas del día.
        </p>
      </div>

      {/* DASHBOARD MOCKUP */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="bg-[#111113] border border-gray-800 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl shadow-black/50 overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-gray-800 pb-6 mb-6">
            <div className="text-xl font-bold text-white">Distrito Barber</div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700"></div>
              <div className="hidden sm:block text-sm text-gray-400">Juan (OWNER)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">Próximos turnos</h3>
                  <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-md">Hoy: 12</span>
                </div>
                <div className="space-y-3">
                  {[
                    { time: '09:00', name: 'Juan Pérez', service: 'Corte', status: 'Confirmado' },
                    { time: '10:30', name: 'Martín López', service: 'Barba', status: 'Confirmado' },
                    { time: '11:00', name: 'Sofía García', service: 'Corte + Barba', status: 'Pendiente' },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[#222225] border border-gray-700/50">
                      <div className="flex items-center gap-4">
                        <span className="text-white font-mono font-bold">{t.time}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.service}</div>
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${t.status === 'Confirmado' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {t.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Tus servicios</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Corte de pelo', price: '$8.000', duration: '45m' },
                    { name: 'Perfilado de barba', price: '$5.000', duration: '30m' },
                    { name: 'Corte + Barba', price: '$11.000', duration: '1h 15m' },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-start pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium text-white">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.duration}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-300">{s.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
