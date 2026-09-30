'use client';

import { useState } from 'react';
import Modal from '@/components/dashboard/Modal';
import StatusBadge from '@/components/dashboard/StatusBadge';

export default function ProfesionalesClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const profesionalesDemo = [
    { id: 1, name: 'Juan Pérez', spec: 'Barbero', status: 'Activo' },
    { id: 2, name: 'Martín López', spec: 'Barbero', status: 'Activo' },
    { id: 3, name: 'Sofía García', spec: 'Barbera', status: 'Activo' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="whitespace-nowrap bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
        >
          + Agregar profesional
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profesionalesDemo.map(p => (
          <div key={p.id} className="bg-[#111113] border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-colors flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xl font-bold text-white mb-4">
              {p.name.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{p.spec}</p>
            <div className="mb-6">
              <StatusBadge status={p.status} />
            </div>
            <div className="flex gap-2 w-full">
              <button className="flex-1 bg-[#1A1A1C] border border-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Editar</button>
              <button className="flex-1 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">Desactivar</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Profesional">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre completo</label>
            <input type="text" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" placeholder="Ej: Lucas Martínez" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Especialidad</label>
            <input type="text" className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500" placeholder="Ej: Barbero Senior" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <select className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-gray-500 appearance-none">
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200">Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
