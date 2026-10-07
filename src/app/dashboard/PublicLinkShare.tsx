'use client';

import { useState } from 'react';

export default function PublicLinkShare({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/negocios/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar: ', err);
    }
  };

  const handleOpen = () => {
    const url = `${window.location.origin}/negocios/${slug}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Desktop View */}
      <div className="px-4 pb-4 hidden md:block mt-auto pt-4">
        <div className="bg-[#1A1A1C] border border-gray-800 rounded-xl p-3 shadow-lg">
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tu página pública</div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? '¡Copiado!' : 'Copiar link'}
            </button>
            <button 
              onClick={handleOpen}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-transparent border border-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:text-white hover:border-gray-500 transition-colors"
            >
              Ver página
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile View (Horizontal bar item) */}
      <div className="md:hidden px-4 pb-4">
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '¡Copiado!' : 'Link público'}
          </button>
        </div>
      </div>
    </>
  );
}
