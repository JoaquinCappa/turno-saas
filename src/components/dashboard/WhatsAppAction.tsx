'use client';

import { useState } from 'react';
import Modal from './Modal';

type WhatsAppActionProps = {
  clientName: string;
  clientPhone?: string;
  businessName: string;
  turnoInfo?: {
    time: string;
    service: string;
  };
  variant?: 'icon' | 'text' | 'button';
};

export default function WhatsAppAction({ clientName, clientPhone, businessName, turnoInfo, variant = 'text' }: WhatsAppActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'recordar' | 'reservar' | 'custom' | null>(null);
  const [customText, setCustomText] = useState('');

  const cleanPhone = clientPhone ? clientPhone.replace(/[^0-9]/g, '') : '';

  const textRecordar = turnoInfo 
    ? `Hola ${clientName}, te escribimos de ${businessName}.\nTe recordamos tu turno de hoy a las ${turnoInfo.time} para ${turnoInfo.service}.`
    : '';
  const textReservar = `Hola ${clientName}, te escribimos de ${businessName}.\n¿Querés reservar nuevamente tu turno?`;

  const handleSend = () => {
    if (!cleanPhone || !customText.trim()) return;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customText)}`;
    window.open(url, '_blank');
    setIsOpen(false);
    setSelectedOption(null);
  };

  const handleSelect = (option: 'recordar' | 'reservar' | 'custom') => {
    setSelectedOption(option);
    if (option === 'recordar') setCustomText(textRecordar);
    if (option === 'reservar') setCustomText(textReservar);
    if (option === 'custom') setCustomText('');
  };

  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <button 
          onClick={() => setIsOpen(true)}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="Contactar por WhatsApp"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      );
    }
    if (variant === 'button') {
      return (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#1A1A1C] text-gray-300 border border-gray-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-colors"
        >
          WhatsApp
        </button>
      );
    }
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
      >
        WhatsApp
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setSelectedOption(null); }} title="Contactar por WhatsApp">
        {!cleanPhone ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-6">Este cliente no tiene un número de teléfono registrado.</p>
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200">Cerrar</button>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col w-full">
            <div className="space-y-3">
              {turnoInfo && (
                <button 
                  onClick={() => handleSelect('recordar')}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between ${selectedOption === 'recordar' ? 'bg-[#222225] border-gray-600' : 'bg-[#1A1A1C] border-gray-800 hover:border-gray-700'}`}
                >
                  <div>
                    <div className="font-bold text-white mb-0.5 text-sm">Recordar turno</div>
                    <div className="text-xs text-gray-500">Recordale al cliente su turno de hoy</div>
                  </div>
                  {selectedOption === 'recordar' && (
                    <div className="w-4 h-4 rounded-full border-4 border-gray-300"></div>
                  )}
                </button>
              )}
              <button 
                onClick={() => handleSelect('reservar')}
                className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between ${selectedOption === 'reservar' ? 'bg-[#222225] border-gray-600' : 'bg-[#1A1A1C] border-gray-800 hover:border-gray-700'}`}
              >
                <div>
                  <div className="font-bold text-white mb-0.5 text-sm">Volver a reservar</div>
                  <div className="text-xs text-gray-500">Invitalo a reservar nuevamente</div>
                </div>
                {selectedOption === 'reservar' && (
                  <div className="w-4 h-4 rounded-full border-4 border-gray-300"></div>
                )}
              </button>
              <button 
                onClick={() => handleSelect('custom')}
                className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between ${selectedOption === 'custom' ? 'bg-[#222225] border-gray-600' : 'bg-[#1A1A1C] border-gray-800 hover:border-gray-700'}`}
              >
                <div>
                  <div className="font-bold text-white mb-0.5 text-sm">Mensaje personalizado</div>
                  <div className="text-xs text-gray-500">Escribí tu propio mensaje desde cero</div>
                </div>
                {selectedOption === 'custom' && (
                  <div className="w-4 h-4 rounded-full border-4 border-gray-300"></div>
                )}
              </button>
            </div>

            {selectedOption && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Previsualización del mensaje</label>
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Escribí tu mensaje..."
                    className="w-full h-32 bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg p-3 focus:outline-none focus:border-gray-600 resize-none text-sm leading-relaxed"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setIsOpen(false); setSelectedOption(null); }} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={!customText.trim()}
                    className="px-4 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-sm font-bold hover:bg-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Abrir WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
