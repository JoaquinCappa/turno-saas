'use client';

import { useState } from 'react';
import { updateBusiness } from '@/app/actions/business';

const FieldRow = ({ label, value, onChange, isEditing, type = "text", placeholder = "" }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
    <div className="text-sm font-medium text-gray-400">{label}</div>
    <div className="sm:col-span-2">
      {isEditing ? (
        type === "textarea" ? (
           <textarea 
             value={value} 
             onChange={e => onChange(e.target.value)} 
             placeholder={placeholder}
             rows={3}
             className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
           />
        ) : (
          <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
        )
      ) : (
        <span className="text-white font-medium">{value || <span className="text-gray-600 italic">No configurado</span>}</span>
      )}
    </div>
  </div>
);

export default function BusinessClient({
  initialName,
  initialSlug,
  initialTimezone,
  initialDescription,
  initialPhone,
  initialEmail,
  initialAddress,
  initialLogoUrl,
  initialCoverImageUrl,
  userRole
}: {
  initialName: string;
  initialSlug: string;
  initialTimezone: string;
  initialDescription?: string | null;
  initialPhone?: string | null;
  initialEmail?: string | null;
  initialAddress?: string | null;
  initialLogoUrl?: string | null;
  initialCoverImageUrl?: string | null;
  userRole: string;
}) {
  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [description, setDescription] = useState(initialDescription || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    
    const res = await updateBusiness({ 
      name, 
      timezone,
      description,
      phone,
      email,
      address,
      logoUrl,
      coverImageUrl
    });
    
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMsg('Información actualizada correctamente');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(res.error || 'Error al actualizar');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName(initialName);
    setTimezone(initialTimezone);
    setDescription(initialDescription || '');
    setPhone(initialPhone || '');
    setEmail(initialEmail || '');
    setAddress(initialAddress || '');
    setLogoUrl(initialLogoUrl || '');
    setCoverImageUrl(initialCoverImageUrl || '');
    setError('');
  };

  const commonTimezones = [
    'America/Argentina/Buenos_Aires',
    'America/Santiago',
    'America/Bogota',
    'America/Lima',
    'America/Mexico_City',
    'Europe/Madrid',
    'UTC'
  ];

  return (
    <div className="bg-[#111113] border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Información del negocio</h3>
        {successMsg && <span className="text-green-400 text-sm">{successMsg}</span>}
      </div>
      <div className="p-6 space-y-4">
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
        
        <FieldRow label="Nombre" value={name} onChange={setName} isEditing={isEditing} />
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="text-sm font-medium text-gray-400">Slug</div>
          <div className="sm:col-span-2 text-gray-400 font-mono text-sm">
            {initialSlug} <span className="text-xs text-gray-600 ml-2">(Solo lectura)</span>
          </div>
        </div>

        <FieldRow label="Descripción" value={description} onChange={setDescription} isEditing={isEditing} type="textarea" placeholder="Breve descripción del negocio" />
        <FieldRow label="Teléfono" value={phone} onChange={setPhone} isEditing={isEditing} placeholder="+54 9 11 1234-5678" />
        <FieldRow label="Email" value={email} onChange={setEmail} isEditing={isEditing} type="email" placeholder="contacto@negocio.com" />
        <FieldRow label="Dirección" value={address} onChange={setAddress} isEditing={isEditing} placeholder="Calle Falsa 123, CABA" />
        <FieldRow label="URL Logo" value={logoUrl} onChange={setLogoUrl} isEditing={isEditing} type="url" placeholder="https://..." />
        <FieldRow label="URL Portada" value={coverImageUrl} onChange={setCoverImageUrl} isEditing={isEditing} type="url" placeholder="https://..." />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="text-sm font-medium text-gray-400">Zona Horaria</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <select 
                value={timezone} 
                onChange={e => setTimezone(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              >
                {!commonTimezones.includes(initialTimezone) && (
                  <option value={initialTimezone}>{initialTimezone}</option>
                )}
                {commonTimezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            ) : (
              <span className="text-gray-300 font-mono text-sm">{timezone}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="text-sm font-medium text-gray-400">Estado</div>
          <div className="sm:col-span-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400">Activo</span>
          </div>
        </div>
      </div>
      
      {isAdmin && (
        <div className="px-6 py-4 bg-[#1A1A1C] border-t border-gray-800 flex justify-end gap-3">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">
              Editar información
            </button>
          )}
        </div>
      )}
    </div>
  );
}
