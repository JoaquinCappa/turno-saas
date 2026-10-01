'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createProfessional(data: { name: string; email?: string; phone?: string; isActive?: boolean }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para crear profesionales' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio y debe ser un texto válido' };
  }
  
  if (data.email && typeof data.email !== 'string') {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.phone && typeof data.phone !== 'string') {
    return { success: false, error: 'El teléfono es inválido' };
  }

  try {
    await prisma.professional.create({
      data: {
        businessId: session.user.businessId,
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    revalidatePath('/dashboard/profesionales');
    return { success: true };
  } catch (error) {
    console.error('Error creating professional:', error);
    return { success: false, error: 'Error al crear el profesional' };
  }
}

export async function updateProfessional(id: string, data: { name: string; email?: string; phone?: string }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para editar profesionales' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio y debe ser un texto válido' };
  }

  if (data.email && typeof data.email !== 'string') {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.phone && typeof data.phone !== 'string') {
    return { success: false, error: 'El teléfono es inválido' };
  }

  try {
    const professional = await prisma.professional.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!professional || professional.businessId !== session.user.businessId) {
      return { success: false, error: 'Profesional no encontrado' };
    }

    await prisma.professional.update({
      where: { id },
      data: {
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
      },
    });

    revalidatePath('/dashboard/profesionales');
    return { success: true };
  } catch (error) {
    console.error('Error updating professional:', error);
    return { success: false, error: 'Error al actualizar el profesional' };
  }
}

export async function toggleProfessionalStatus(id: string, isActive: boolean) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para modificar profesionales' };
  }

  try {
    const professional = await prisma.professional.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!professional || professional.businessId !== session.user.businessId) {
      return { success: false, error: 'Profesional no encontrado' };
    }

    await prisma.professional.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/dashboard/profesionales');
    return { success: true };
  } catch (error) {
    console.error('Error toggling professional status:', error);
    return { success: false, error: 'Error al cambiar el estado del profesional' };
  }
}
