'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DayOfWeek } from '@prisma/client';

export async function createBusinessHour(data: { dayOfWeek: DayOfWeek; startMinute: number; endMinute: number }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para configurar horarios' };
  }

  const { dayOfWeek, startMinute, endMinute } = data;

  if (typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Horarios inválidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es inválido' };
  }

  try {
    // Validar solapamiento
    const existingHours = await prisma.businessHour.findMany({
      where: {
        businessId: session.user.businessId,
        dayOfWeek
      }
    });

    const hasOverlap = existingHours.some(h => {
      // Check if the new interval overlaps with existing interval
      return Math.max(startMinute, h.startMinute) < Math.min(endMinute, h.endMinute);
    });

    if (hasOverlap) {
      return { success: false, error: 'El horario se solapa con otro intervalo existente' };
    }

    await prisma.businessHour.create({
      data: {
        businessId: session.user.businessId,
        dayOfWeek,
        startMinute,
        endMinute,
      },
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error creating business hour:', error);
    return { success: false, error: 'Error al crear el horario' };
  }
}

export async function deleteBusinessHour(id: string) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para eliminar horarios' };
  }

  try {
    const hour = await prisma.businessHour.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!hour || hour.businessId !== session.user.businessId) {
      return { success: false, error: 'Horario no encontrado' };
    }

    await prisma.businessHour.delete({
      where: { id },
    });

    revalidatePath('/dashboard/configuracion');
    return { success: true };
  } catch (error) {
    console.error('Error deleting business hour:', error);
    return { success: false, error: 'Error al eliminar el horario' };
  }
}
