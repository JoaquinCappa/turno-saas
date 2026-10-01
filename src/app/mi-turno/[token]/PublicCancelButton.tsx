'use client';

import { useState } from 'react';
import { cancelPublicBooking } from '@/app/actions/publicBooking';

interface PublicCancelButtonProps {
  token: string;
}

export default function PublicCancelButton({ token }: PublicCancelButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">Tu turno fue cancelado correctamente.</p>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="mt-6 p-5 border border-red-200 bg-red-50 rounded-xl space-y-4">
        <div className="text-center">
          <p className="font-semibold text-red-800">¿Querés cancelar este turno?</p>
          <p className="text-sm text-red-600 mt-1">Esta acción no se puede deshacer.</p>
        </div>
        
        {error && (
          <p className="text-sm text-red-600 text-center bg-white p-2 rounded border border-red-100">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setIsConfirming(false)}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={async () => {
              setIsCancelling(true);
              setError('');
              const res = await cancelPublicBooking(token);
              if (res.success) {
                setSuccess(true);
              } else {
                setError(res.error || 'Ocurrió un error inesperado.');
                setIsCancelling(false);
              }
            }}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex justify-center items-center"
          >
            {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 text-center">
      <button
        onClick={() => setIsConfirming(true)}
        className="text-red-600 font-medium text-sm hover:text-red-800 hover:underline px-4 py-2"
      >
        Cancelar turno
      </button>
    </div>
  );
}
