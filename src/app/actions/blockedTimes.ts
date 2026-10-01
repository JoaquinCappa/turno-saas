'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createBlockedTime(data: { localDate: string; startMinute: number; endMinute: number; title?: string }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para configurar bloqueos' };
  }

  const { localDate, startMinute, endMinute, title } = data;

  if (!localDate || typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Datos inválidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es inválido' };
  }

  try {
    // Parse the localDate string into a UTC midnight Date object 
    // because that's how BlockedTime.date is stored in the database according to architecture
    const exactDate = new Date(`${localDate}T00:00:00Z`);

    // Verify overlaps
    const existingBlocks = await prisma.blockedTime.findMany({
      where: {
        businessId: session.user.businessId,
        date: exactDate
      }
    });

    const hasOverlap = existingBlocks.some(b => {
      return Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute);
    });

    if (hasOverlap) {
      return { success: false, error: 'El bloqueo se solapa con otro bloqueo existente' };
    }

    await prisma.blockedTime.create({
      data: {
        businessId: session.user.businessId,
        date: exactDate,
        startMinute,
        endMinute,
        title: title?.trim() || null
      }
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error creating blocked time:', error);
    return { success: false, error: 'Error al crear el bloqueo' };
  }
}

export async function deleteBlockedTime(id: string) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para eliminar bloqueos' };
  }

  try {
    const block = await prisma.blockedTime.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!block || block.businessId !== session.user.businessId) {
      return { success: false, error: 'Bloqueo no encontrado' };
    }

    await prisma.blockedTime.delete({
      where: { id },
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    return { success: false, error: 'Error al eliminar el bloqueo' };
  }
}
