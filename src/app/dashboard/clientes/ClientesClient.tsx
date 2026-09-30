'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import WhatsAppAction from '@/components/dashboard/WhatsAppAction';

export default function ClientesClient() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<{name: string, phone: string, lastDate: string, total: number} | null>(null);

  const clientesDemo = [
    { id: 1, name: 'Juan Pérez', phone: '+5491112345678', lastDate: 'Hoy', total: 12 },
    { id: 2, name: 'Martín López', phone: '+5491198765432', lastDate: 'Ayer', total: 8 },
    { id: 3, name: 'Sofía García', phone: '+5491144445555', lastDate: '15/09/2026', total: 5 },
    { id: 4, name: 'Pedro Gómez', phone: '', lastDate: '01/09/2026', total: 1 },
  ];

  const filtered = clientesDemo.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex justify-between items-center gap-4">
        <input 
          type="text" 
          placeholder="Buscar cliente por nombre..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 bg-[#111113] border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 transition-colors"
        />
      </div>

      {/* TABLE */}
      <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1A1A1C] border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Teléfono</th>
                <th className="px-6 py-4 font-semibold">Último turno</th>
                <th className="px-6 py-4 font-semibold">Total de turnos</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[#1A1A1C] transition-colors">
                    <td className="px-6 py-4 text-white font-bold">{c.name}</td>
                    <td className="px-6 py-4 text-gray-400 font-mono">{c.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{c.lastDate}</td>
                    <td className="px-6 py-4 text-white font-medium">{c.total}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <WhatsAppAction 
                          clientName={c.name} 
                          clientPhone={c.phone} 
                          businessName="Distrito Barber" 
                          variant="text"
                        />
                        <button 
                          onClick={() => setSelectedClient(c)}
                          className="text-gray-400 hover:text-white transition-colors" 
                          title="Ver cliente"
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title="Información del Cliente">
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xl font-bold text-white">
                {selectedClient.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedClient.name}</h2>
                <p className="text-gray-400 font-mono">{selectedClient.phone}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Último Turno</div>
                <div className="text-lg font-bold text-white">{selectedClient.lastDate}</div>
              </div>
              <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Visitas</div>
                <div className="text-lg font-bold text-white">{selectedClient.total}</div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
              <button onClick={() => setSelectedClient(null)} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200">Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
