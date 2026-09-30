'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createCustomer(data: { name: string; email?: string; phone?: string; notes?: string; isActive?: boolean }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para crear clientes' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio y debe ser un texto válido' };
  }

  if (data.email !== undefined && data.email !== null && typeof data.email !== 'string') {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.phone !== undefined && data.phone !== null && typeof data.phone !== 'string') {
    return { success: false, error: 'El teléfono es inválido' };
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    return { success: false, error: 'Las notas son inválidas' };
  }

  try {
    await prisma.customer.create({
      data: {
        businessId: session.user.businessId,
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        notes: data.notes ? data.notes.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { success: false, error: 'Error al crear el cliente' };
  }
}

export async function updateCustomer(id: string, data: { name: string; email?: string; phone?: string; notes?: string }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para editar clientes' };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio y debe ser un texto válido' };
  }

  if (data.email !== undefined && data.email !== null && typeof data.email !== 'string') {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.phone !== undefined && data.phone !== null && typeof data.phone !== 'string') {
    return { success: false, error: 'El teléfono es inválido' };
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    return { success: false, error: 'Las notas son inválidas' };
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!customer || customer.businessId !== session.user.businessId) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        notes: data.notes ? data.notes.trim() : null,
      },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: 'Error al actualizar el cliente' };
  }
}

export async function toggleCustomerStatus(id: string, isActive: boolean) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para modificar clientes' };
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { businessId: true }
    });

    if (!customer || customer.businessId !== session.user.businessId) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error toggling customer status:', error);
    return { success: false, error: 'Error al cambiar el estado del cliente' };
  }
}
