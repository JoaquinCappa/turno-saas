'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createService(data: { name: string; duration: number; price: number }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para crear servicios' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es inválido' };
  }

  if (!data.duration || typeof data.duration !== 'number' || data.duration <= 0 || data.duration > 720) {
    return { success: false, error: 'La duración es inválida' };
  }

  if (typeof data.price !== 'number' || data.price < 0) {
    return { success: false, error: 'El precio es inválido' };
  }

  try {
    await prisma.service.create({
      data: {
        businessId: session.user.businessId,
        name: data.name.trim(),
        duration: data.duration,
        price: data.price,
      },
    });

    revalidatePath('/dashboard/servicios');
    return { success: true };
  } catch (error) {
    console.error('Error creating service:', error);
    return { success: false, error: 'Error al crear el servicio' };
  }
}

export async function updateService(id: string, data: { name: string; duration: number; price: number }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para editar servicios' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es inválido' };
  }

  if (!data.duration || typeof data.duration !== 'number' || data.duration <= 0 || data.duration > 720) {
    return { success: false, error: 'La duración es inválida' };
  }

  if (typeof data.price !== 'number' || data.price < 0) {
    return { success: false, error: 'El precio es inválido' };
  }

  try {
    // Validar propiedad del servicio antes de actualizar
    const service = await prisma.service.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!service || service.businessId !== session.user.businessId) {
      return { success: false, error: 'Servicio no encontrado' };
    }

    await prisma.service.update({
      where: { id },
      data: {
        name: data.name.trim(),
        duration: data.duration,
        price: data.price,
      },
    });

    revalidatePath('/dashboard/servicios');
    return { success: true };
  } catch (error) {
    console.error('Error updating service:', error);
    return { success: false, error: 'Error al actualizar el servicio' };
  }
}

export async function toggleServiceStatus(id: string, isActive: boolean) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para modificar servicios' };
  }

  try {
    const service = await prisma.service.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!service || service.businessId !== session.user.businessId) {
      return { success: false, error: 'Servicio no encontrado' };
    }

    await prisma.service.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/dashboard/servicios');
    return { success: true };
  } catch (error) {
    console.error('Error toggling service status:', error);
    return { success: false, error: 'Error al cambiar estado del servicio' };
  }
}
