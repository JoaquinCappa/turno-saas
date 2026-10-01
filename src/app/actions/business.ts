'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateBusiness(data: { 
  name: string; 
  timezone: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para configurar el negocio' };
  }

  const { name, timezone, description, phone, email, address, logoUrl, coverImageUrl } = data;

  if (!name || name.trim() === '') {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  if (!timezone || timezone.trim() === '') {
    return { success: false, error: 'El timezone es obligatorio' };
  }

  if (email && email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return { success: false, error: 'Email inválido' };
  }

  try {
    // Basic timezone validation using Intl
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { success: false, error: 'Timezone inválido' };
  }

  try {
    const cleanStr = (s?: string | null) => s && s.trim() !== '' ? s.trim() : null;

    await prisma.business.update({
      where: { id: session.user.businessId },
      data: { 
        name: name.trim(), 
        timezone: timezone.trim(),
        description: cleanStr(description),
        phone: cleanStr(phone),
        email: cleanStr(email),
        address: cleanStr(address),
        logoUrl: cleanStr(logoUrl),
        coverImageUrl: cleanStr(coverImageUrl)
      }
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error updating business:', error);
    return { success: false, error: 'Error al actualizar el negocio' };
  }
}
