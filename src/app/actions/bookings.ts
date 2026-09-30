'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createBusinessDate, getBusinessDayAndMinute, calculateEndAt } from '@/lib/date-utils';

export async function createBooking(data: {
  customerId: string;
  serviceId: string;
  professionalId: string;
  localDate: string; // "YYYY-MM-DD"
  localTime: string; // "HH:mm"
  notes?: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  const businessId = session.user.businessId;

  // Basic validations
  if (!data.customerId || !data.serviceId || !data.professionalId || !data.localDate || !data.localTime) {
    return { success: false, error: 'Faltan datos obligatorios' };
  }

  try {
    // 1. Obtener entidades y validar pertenencia y estado
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true, isActive: true }
    });

    if (!business || !business.isActive) return { success: false, error: 'Negocio inválido o inactivo' };

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.businessId !== businessId || !customer.isActive) {
      return { success: false, error: 'Cliente inválido' };
    }

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || service.businessId !== businessId || !service.isActive) {
      return { success: false, error: 'Servicio inválido' };
    }

    const professional = await prisma.professional.findUnique({ where: { id: data.professionalId } });
    if (!professional || professional.businessId !== businessId || !professional.isActive) {
      return { success: false, error: 'Profesional inválido' };
    }

    // 2. Calcular instantes de tiempo UTC exactos
    const startAt = createBusinessDate(data.localDate, data.localTime, business.timezone);
    const endAt = calculateEndAt(startAt, service.duration);
    const now = new Date();

    if (startAt < now) {
      return { success: false, error: 'No podés reservar un turno en el pasado' };
    }

    // 3. Validar disponibilidad básica (Horarios de negocio)
    const { dayOfWeek, minuteOfDay: startMinute } = getBusinessDayAndMinute(startAt, business.timezone);
    const { minuteOfDay: endMinute } = getBusinessDayAndMinute(endAt, business.timezone);
    
    // Si cruza la medianoche (endMinute < startMinute), en esta iteración lo rechazaremos por simplicidad.
    if (endMinute <= startMinute) {
      return { success: false, error: 'El turno no puede cruzar la medianoche' };
    }

    const businessHours = await prisma.businessHour.findMany({
      where: { businessId, dayOfWeek }
    });

    const isWithinHours = businessHours.some(h => startMinute >= h.startMinute && endMinute <= h.endMinute);
    if (!isWithinHours) {
      return { success: false, error: 'El horario seleccionado está fuera del horario de atención' };
    }

    // 4. Concurrencia y Solapamiento (Postgres Advisory Lock)
    // El bloqueo consultivo por profesional encola las peticiones simultáneas, 
    // evitando race conditions y falsos positivos de Serializable.
    const booking = await prisma.$transaction(async (tx) => {
      
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.professionalId}));`;

      // Chequear BlockedTimes (excepciones de fecha completa o intervalo)
      const exactDate = new Date(`${data.localDate}T00:00:00Z`); // Asumimos que guardamos el date a las 00:00 UTC
      const blocks = await tx.blockedTime.findMany({
        where: { businessId, date: exactDate }
      });
      
      const isBlocked = blocks.some(b => {
        return Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute);
      });

      if (isBlocked) {
        throw new Error('El horario está bloqueado excepcionalmente');
      }

      // Chequear solapamientos de turnos
      const overlappingBookings = await tx.booking.findMany({
        where: {
          businessId,
          professionalId: data.professionalId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          AND: [
            { startAt: { lt: endAt } },
            { endAt: { gt: startAt } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
        throw new Error('El profesional ya tiene un turno en ese horario');
      }

      // Crear Booking
      return await tx.booking.create({
        data: {
          businessId,
          customerId: data.customerId,
          serviceId: data.serviceId,
          professionalId: data.professionalId,
          startAt,
          endAt,
          serviceName: service.name,
          serviceDuration: service.duration,
          servicePrice: service.price,
          notes: data.notes || null,
          status: 'CONFIRMED' // Para esta iteración, se confirma automáticamente
        }
      });
    });

    revalidatePath('/dashboard/turnos');
    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al procesar el turno' };
  }
}

export async function cancelBooking(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para cancelar turnos' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    revalidatePath('/dashboard/turnos');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Error al cancelar' };
  }
}

export async function completeBooking(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para completar turnos' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    revalidatePath('/dashboard/turnos');
    return { success: true };
  } catch (error) {
    console.error('Error completing booking:', error);
    return { success: false, error: 'Error al completar' };
  }
}
