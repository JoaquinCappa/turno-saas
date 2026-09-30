'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';
import WhatsAppAction from '@/components/dashboard/WhatsAppAction';

export default function TurnosClient() {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const turnosDemo = [
    { id: 1, time: '09:00', client: 'Juan Pérez', phone: '+5491112345678', service: 'Corte de pelo', prof: 'Demo', status: 'Confirmado' },
    { id: 2, time: '10:30', client: 'Martín López', phone: '+5491198765432', service: 'Barba', prof: 'Demo', status: 'Confirmado' },
    { id: 3, time: '11:00', client: 'Sofía García', phone: '+5491144445555', service: 'Corte + Barba', prof: 'Demo', status: 'Pendiente' },
    { id: 4, time: '12:30', client: 'Pedro Gómez', phone: '', service: 'Corte', prof: 'Demo', status: 'Cancelado' },
  ];

  const filtered = turnosDemo.filter(t => 
    (filter === 'Todos' || t.status === filter) &&
    t.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 bg-[#111113] border border-gray-800 rounded-lg p-1">
          {['Todos', 'Confirmado', 'Pendiente', 'Cancelado'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {f === 'Confirmado' ? 'Confirmados' : f === 'Pendiente' ? 'Pendientes' : f === 'Cancelado' ? 'Cancelados' : 'Todos'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-[#111113] border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 transition-colors"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="whitespace-nowrap bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            + Nuevo turno
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Hora</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Servicio</th>
                <th className="px-6 py-4 font-semibold">Profesional</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron turnos.
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="hover:bg-[#1A1A1C] transition-colors">
                    <td className="px-6 py-4 text-white font-mono font-bold">{t.time}</td>
                    <td className="px-6 py-4 text-gray-300 font-medium">{t.client}</td>
                    <td className="px-6 py-4 text-gray-400">{t.service}</td>
                    <td className="px-6 py-4 text-gray-400">{t.prof}</td>
                    <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 text-gray-400">
                        <WhatsAppAction 
                          clientName={t.client} 
                          clientPhone={t.phone} 
                          businessName="Distrito Barber"
                          turnoInfo={{ time: t.time, service: t.service }}
                          variant="icon"
                        />
                        <button className="hover:text-white transition-colors" title="Ver">Ver</button>
                        <button className="hover:text-white transition-colors" title="Editar">Editar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Turno">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
            <input type="text" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" placeholder="Nombre del cliente" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
              <input type="date" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Hora</label>
              <input type="time" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Servicio</label>
            <select className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 appearance-none">
              <option>Corte de pelo</option>
              <option>Perfilado de barba</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200">Guardar turno</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
