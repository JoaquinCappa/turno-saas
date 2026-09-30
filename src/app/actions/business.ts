'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateBusiness(data: { name: string; timezone: string }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para configurar el negocio' };
  }

  const { name, timezone } = data;

  if (!name || name.trim() === '') {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  if (!timezone || timezone.trim() === '') {
    return { success: false, error: 'El timezone es obligatorio' };
  }

  try {
    // Basic timezone validation using Intl
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { success: false, error: 'Timezone inválido' };
  }

  try {
    await prisma.business.update({
      where: { id: session.user.businessId },
      data: { name: name.trim(), timezone: timezone.trim() }
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error updating business:', error);
    return { success: false, error: 'Error al actualizar el negocio' };
  }
}
