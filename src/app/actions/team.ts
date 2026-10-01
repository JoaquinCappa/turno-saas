'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function listTeamMembers() {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role !== 'OWNER') {
    return { success: false, error: 'No tenés permisos para ver el equipo' };
  }

  try {
    const users = await prisma.user.findMany({
      where: { businessId: session.user.businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { name: 'asc' }
      ]
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('Error listing team members:', error);
    return { success: false, error: 'Error al obtener el equipo' };
  }
}

export async function createTeamMember(data: { name: string; email: string; role: 'ADMIN' | 'STAFF'; password: string }) {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role !== 'OWNER') {
    return { success: false, error: 'No tenés permisos para crear miembros del equipo' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  if (!data.email || data.email.trim().length === 0 || !data.email.includes('@')) {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.role !== 'ADMIN' && data.role !== 'STAFF') {
    return { success: false, error: 'Rol inválido' };
  }

  if (!data.password || data.password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return { success: false, error: 'El email ya está en uso' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        businessId: session.user.businessId,
        name: data.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: data.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    revalidatePath('/dashboard/equipo');
    return { success: true, data: user };
  } catch (error) {
    console.error('Error creating team member:', error);
    return { success: false, error: 'Error al crear el miembro del equipo' };
  }
}

export async function setTeamMemberActive(id: string, isActive: boolean) {
  const session = await getAuthenticatedContext();
  
  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  if (session.user.role !== 'OWNER') {
    return { success: false, error: 'No tenés permisos para modificar miembros del equipo' };
  }

  if (session.user.id === id) {
    return { success: false, error: 'No podés desactivar tu propia cuenta' };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { businessId: true, role: true }
    });

    if (!targetUser || targetUser.businessId !== session.user.businessId) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Check if we are deactivating the last active OWNER of the business
    if (targetUser.role === 'OWNER' && !isActive) {
      const activeOwners = await prisma.user.count({
        where: {
          businessId: session.user.businessId,
          role: 'OWNER',
          isActive: true,
          id: { not: id }
        }
      });

      if (activeOwners === 0) {
        return { success: false, error: 'No podés dejar el negocio sin ningún OWNER activo' };
      }
    }

    await prisma.user.update({
      where: { id },
      data: { isActive }
    });

    revalidatePath('/dashboard/equipo');
    return { success: true };
  } catch (error) {
    console.error('Error updating team member status:', error);
    return { success: false, error: 'Error al actualizar el estado del miembro' };
  }
}
