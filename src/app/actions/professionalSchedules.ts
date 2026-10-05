'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DayOfWeek } from '@prisma/client';

export async function setProfessionalCustomHours(professionalId: string, enabled: boolean) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para modificar esta configuracin' };

  try {
    return await prisma.$transaction(async (tx) => {
      const professional = await tx.professional.findUnique({
        where: { id: professionalId }
      });

      if (!professional || professional.businessId !== session.user.businessId) {
        throw new Error('Profesional no encontrado');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      await tx.professional.update({
        where: { id: professionalId },
        data: { isCustomHoursEnabled: enabled }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al actualizar configuracin' };
  }
}

// ----------------------------------------------------------------------
// PROFESSIONAL HOURS
// ----------------------------------------------------------------------

export async function getProfessionalHours(professionalId: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  try {
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId }
    });

    if (!professional || professional.businessId !== session.user.businessId) {
      return { success: false, error: 'Profesional no encontrado' };
    }

    const hours = await prisma.professionalHour.findMany({
      where: { professionalId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }]
    });

    return { success: true, hours };
  } catch {
    return { success: false, error: 'Error al obtener horarios' };
  }
}

export async function createProfessionalHour(data: { professionalId: string; dayOfWeek: DayOfWeek; startMinute: number; endMinute: number }) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para configurar horarios' };

  const { professionalId, dayOfWeek, startMinute, endMinute } = data;

  if (!professionalId || !dayOfWeek || typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Datos invlidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es invlido' };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const professional = await tx.professional.findUnique({
        where: { id: professionalId }
      });

      if (!professional || professional.businessId !== session.user.businessId) {
        throw new Error('Profesional no encontrado');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      const existingHours = await tx.professionalHour.findMany({
        where: { professionalId, dayOfWeek }
      });

      const hasOverlap = existingHours.some(h => {
        return h.startMinute < endMinute && h.endMinute > startMinute;
      });

      if (hasOverlap) {
        throw new Error('El horario se solapa con otro intervalo existente');
      }

      const hour = await tx.professionalHour.create({
        data: {
          professionalId,
          dayOfWeek,
          startMinute,
          endMinute
        }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true, hour };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al crear el horario' };
  }
}

export async function updateProfessionalHour(id: string, data: { dayOfWeek: DayOfWeek; startMinute: number; endMinute: number }) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para configurar horarios' };

  const { dayOfWeek, startMinute, endMinute } = data;

  if (!dayOfWeek || typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Datos invlidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es invlido' };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const targetHour = await tx.professionalHour.findUnique({
        where: { id },
        include: { professional: true }
      });

      if (!targetHour || targetHour.professional.businessId !== session.user.businessId) {
        throw new Error('Horario no encontrado o no autorizado');
      }

      const professionalId = targetHour.professionalId;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      const existingHours = await tx.professionalHour.findMany({
        where: { professionalId, dayOfWeek, id: { not: id } }
      });

      const hasOverlap = existingHours.some(h => {
        return h.startMinute < endMinute && h.endMinute > startMinute;
      });

      if (hasOverlap) {
        throw new Error('El horario se solapa con otro intervalo existente');
      }

      const updated = await tx.professionalHour.update({
        where: { id },
        data: { dayOfWeek, startMinute, endMinute }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true, hour: updated };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al actualizar el horario' };
  }
}

export async function deleteProfessionalHour(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para eliminar horarios' };

  try {
    return await prisma.$transaction(async (tx) => {
      const targetHour = await tx.professionalHour.findUnique({
        where: { id },
        include: { professional: true }
      });

      if (!targetHour || targetHour.professional.businessId !== session.user.businessId) {
        throw new Error('Horario no encontrado o no autorizado');
      }

      const professionalId = targetHour.professionalId;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      await tx.professionalHour.delete({
        where: { id }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al eliminar el horario' };
  }
}

// ----------------------------------------------------------------------
// PROFESSIONAL BLOCKED TIMES
// ----------------------------------------------------------------------

export async function getProfessionalBlockedTimes(professionalId: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  try {
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId }
    });

    if (!professional || professional.businessId !== session.user.businessId) {
      return { success: false, error: 'Profesional no encontrado' };
    }

    const blockedTimes = await prisma.professionalBlockedTime.findMany({
      where: { professionalId },
      orderBy: [{ date: 'asc' }, { startMinute: 'asc' }]
    });

    return { success: true, blockedTimes };
  } catch {
    return { success: false, error: 'Error al obtener bloqueos' };
  }
}

export async function createProfessionalBlockedTime(data: { professionalId: string; localDate: string; startMinute: number; endMinute: number; title?: string }) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para configurar bloqueos' };

  const { professionalId, localDate, startMinute, endMinute, title } = data;

  if (!professionalId || !localDate || typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Datos invlidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es invlido' };
  }

  try {
    const exactDate = new Date(`${localDate}T00:00:00Z`);

    return await prisma.$transaction(async (tx) => {
      const professional = await tx.professional.findUnique({
        where: { id: professionalId }
      });

      if (!professional || professional.businessId !== session.user.businessId) {
        throw new Error('Profesional no encontrado');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      const existingBlocks = await tx.professionalBlockedTime.findMany({
        where: { professionalId, date: exactDate }
      });

      const hasOverlap = existingBlocks.some(b => {
        return b.startMinute < endMinute && b.endMinute > startMinute;
      });

      if (hasOverlap) {
        throw new Error('El bloqueo se solapa con otro bloqueo existente');
      }

      const blocked = await tx.professionalBlockedTime.create({
        data: {
          professionalId,
          date: exactDate,
          startMinute,
          endMinute,
          title: title?.trim() || null
        }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true, blockedTime: blocked };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al crear el bloqueo' };
  }
}

export async function updateProfessionalBlockedTime(id: string, data: { localDate: string; startMinute: number; endMinute: number; title?: string }) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para configurar bloqueos' };

  const { localDate, startMinute, endMinute, title } = data;

  if (!localDate || typeof startMinute !== 'number' || typeof endMinute !== 'number') {
    return { success: false, error: 'Datos invlidos' };
  }

  if (startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { success: false, error: 'El intervalo de tiempo es invlido' };
  }

  try {
    const exactDate = new Date(`${localDate}T00:00:00Z`);

    return await prisma.$transaction(async (tx) => {
      const targetBlock = await tx.professionalBlockedTime.findUnique({
        where: { id },
        include: { professional: true }
      });

      if (!targetBlock || targetBlock.professional.businessId !== session.user.businessId) {
        throw new Error('Bloqueo no encontrado o no autorizado');
      }

      const professionalId = targetBlock.professionalId;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      const existingBlocks = await tx.professionalBlockedTime.findMany({
        where: { professionalId, date: exactDate, id: { not: id } }
      });

      const hasOverlap = existingBlocks.some(b => {
        return b.startMinute < endMinute && b.endMinute > startMinute;
      });

      if (hasOverlap) {
        throw new Error('El bloqueo se solapa con otro bloqueo existente');
      }

      const updated = await tx.professionalBlockedTime.update({
        where: { id },
        data: {
          date: exactDate,
          startMinute,
          endMinute,
          title: title?.trim() || null
        }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true, blockedTime: updated };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al actualizar el bloqueo' };
  }
}

export async function deleteProfessionalBlockedTime(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };
  if (session.user.role === 'STAFF') return { success: false, error: 'No tens permisos para eliminar bloqueos' };

  try {
    return await prisma.$transaction(async (tx) => {
      const targetBlock = await tx.professionalBlockedTime.findUnique({
        where: { id },
        include: { professional: true }
      });

      if (!targetBlock || targetBlock.professional.businessId !== session.user.businessId) {
        throw new Error('Bloqueo no encontrado o no autorizado');
      }

      const professionalId = targetBlock.professionalId;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}));`;

      await tx.professionalBlockedTime.delete({
        where: { id }
      });

      revalidatePath("/dashboard/configuracion");
      return { success: true };
    });
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : "Error desconocido") || 'Error al eliminar el bloqueo' };
  }
}
