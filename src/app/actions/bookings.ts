'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createBusinessDate, getBusinessDayAndMinute, calculateEndAt } from '@/lib/date-utils';
import { BookingStatus, Prisma } from '@prisma/client';
import {
  sendBookingCreatedEmail,
  sendBookingCancelledEmail,
  sendBookingCreatedAdminEmail,
  sendBookingRescheduledEmail,
  sendBookingRescheduledAdminEmail
} from '@/lib/notifications';
import crypto from 'crypto';

function canTransition(current: BookingStatus, next: BookingStatus): boolean {
  if (current === 'PENDING') {
    return ['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(next);
  }
  if (current === 'CONFIRMED') {
    return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(next);
  }
  return false;
}

export async function executeBooking(
  businessId: string,
  data: {
    customerId: string;
    serviceId: string;
    professionalId: string;
    localDate: string;
    localTime: string;
    notes?: string;
  },
  txParam?: Prisma.TransactionClient
) {
  try {
    const db = txParam || prisma;
    // 1. Obtener entidades y validar pertenencia y estado
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { timezone: true, isActive: true }
    });

    if (!business || !business.isActive) return { success: false, error: 'Negocio inválido o inactivo' };

    const customer = await db.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.businessId !== businessId || !customer.isActive) {
      return { success: false, error: 'Cliente inválido' };
    }

    const service = await db.service.findUnique({ where: { id: data.serviceId } });
    if (!service || service.businessId !== businessId || !service.isActive) {
      return { success: false, error: 'Servicio inválido' };
    }

    const professional = await db.professional.findUnique({ where: { id: data.professionalId } });
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

    const businessHours = await db.businessHour.findMany({
      where: { businessId, dayOfWeek }
    });

    const isWithinHours = businessHours.some(h => startMinute >= h.startMinute && endMinute <= h.endMinute);
    if (!isWithinHours) {
      return { success: false, error: 'El horario seleccionado está fuera del horario de atención' };
    }

    // 4. Concurrencia y Solapamiento (Postgres Advisory Lock)
    // El bloqueo consultivo por profesional encola las peticiones simultáneas,
    // evitando race conditions y falsos positivos de Serializable.
    const runTransaction = async (tx: Prisma.TransactionClient) => {

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

      const managementToken = crypto.randomBytes(32).toString('hex');
      const managementTokenHash = crypto.createHash('sha256').update(managementToken).digest('hex');

      // Crear Booking
      const booking = await tx.booking.create({
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
          managementTokenHash,
          status: 'CONFIRMED' // Para esta iteración, se confirma automáticamente
        }
      });

      return { booking, managementToken };
    };

    const result = txParam ? await runTransaction(txParam) : await prisma.$transaction(runTransaction);

    // Enviar notificación después de crear la reserva.
    // Se utiliza await para asegurar su ejecución en Next.js (serverless),
    // pero el try/catch aísla cualquier error del proveedor para no revertir la reserva.
    try {
      await sendBookingCreatedEmail(result.booking.id, result.managementToken);
    } catch (e) {
      console.error('Error no bloqueante al despachar notificación:', e);
    }

    try {
      await sendBookingCreatedAdminEmail(result.booking.id);
    } catch (e) {
      console.error('Error no bloqueante al despachar notificación administrativa:', e);
    }

    return { success: true, bookingId: result.booking.id };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error instanceof Error ? (error as Error).message : 'Error al procesar el turno' };
  }
}

export async function createBooking(data: {
  customerId: string;
  serviceId: string;
  professionalId: string;
  localDate: string; // "YYYY-MM-DD"
  localTime: string; // "HH:mm"
  notes?: string;
}) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId) {
    return { success: false, error: 'No autorizado' };
  }

  const businessId = session.user.businessId;

  // Basic validations
  if (!data.customerId || !data.serviceId || !data.professionalId || !data.localDate || !data.localTime) {
    return { success: false, error: 'Faltan datos obligatorios' };
  }

  const res = await executeBooking(businessId, data);
  if (res.success) {
    revalidatePath('/dashboard/turnos');
  }
  return res;
}

export async function internalCancelBooking(id: string) {
  // Garantizar atomicidad comprobando el estado en la misma consulta de actualización
  const updated = await prisma.booking.updateMany({
    where: {
      id,
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    data: { status: 'CANCELLED' }
  });

  if (updated.count === 0) {
    return { success: false, error: 'Este turno ya no puede cancelarse o acaba de cambiar de estado. Actualizá la página.' };
  }

  // Enviar notificación después de cancelar la reserva
  try {
    await sendBookingCancelledEmail(id);
  } catch (e) {
    console.error('Error no bloqueante al despachar notificación de cancelación:', e);
  }

  return { success: true };
}

export async function cancelBooking(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para cancelar turnos' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    const res = await internalCancelBooking(id);
    if (res.success) {
      revalidatePath('/dashboard/turnos');
    }
    return res;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Error al cancelar' };
  }
}

export async function completeBooking(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para completar turnos' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true, status: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    if (!canTransition(booking.status, 'COMPLETED')) {
      return { success: false, error: 'El turno no puede cambiar a este estado desde su estado actual.' };
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

export async function confirmBooking(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para confirmar turnos' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true, status: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    if (!canTransition(booking.status, 'CONFIRMED')) {
      return { success: false, error: 'El turno no puede cambiar a este estado desde su estado actual.' };
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });

    revalidatePath('/dashboard/turnos');
    return { success: true };
  } catch (error) {
    console.error('Error confirming booking:', error);
    return { success: false, error: 'Error al confirmar' };
  }
}

export async function noShowBooking(id: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para marcar ausencias' };
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, select: { businessId: true, status: true } });
    if (!booking || booking.businessId !== session.user.businessId) {
      return { success: false, error: 'Turno no encontrado' };
    }

    if (!canTransition(booking.status, 'NO_SHOW')) {
      return { success: false, error: 'El turno no puede cambiar a este estado desde su estado actual.' };
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'NO_SHOW' }
    });

    revalidatePath('/dashboard/turnos');
    return { success: true };
  } catch (error) {
    console.error('Error marking no show:', error);
    return { success: false, error: 'Error al procesar' };
  }
}



export async function adminRescheduleBooking(
  bookingId: string,
  newProfessionalId: string,
  localDate: string,
  localTime: string
) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.businessId) return { success: false, error: 'No autorizado' };

  if (session.user.role === 'STAFF') {
    return { success: false, error: 'No tenés permisos para reprogramar turnos' };
  }

  const businessId = session.user.businessId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener el Booking por bookingId
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { business: true, service: true, professional: true, customer: true }
      });

      if (!booking) throw new Error('Turno no encontrado');

      // 2. Validar pertenencia
      if (booking.businessId !== businessId) {
        throw new Error('No autorizado para modificar este turno');
      }

      // 3. Validar estado PENDING o CONFIRMED
      if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
        throw new Error('Este turno ya no puede reprogramarse');
      }

      // 4. Obtener Business (ya incluido) para timezone
      if (!booking.business.isActive) throw new Error('El negocio está inactivo');

      // 5. Obtener Service (ya incluido)
      if (!booking.service.isActive) throw new Error('El servicio está inactivo');

      // 6. Obtener Professional destino
      const newProfessional = await tx.professional.findUnique({
        where: { id: newProfessionalId }
      });
      if (!newProfessional || newProfessional.businessId !== businessId || !newProfessional.isActive) {
        throw new Error('Profesional destino inválido o inactivo');
      }

      // ORDEN DE LOCKS DETERMINISTA
      // Si el profesional cambió, ordenamos lexicográficamente para evitar deadlocks
      if (booking.professionalId !== newProfessionalId) {
        const profs = [booking.professionalId, newProfessionalId].sort();
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profs[0]}));`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profs[1]}));`;
      } else {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${newProfessionalId}));`;
      }

      // Calcular nueva fecha y hora UTC
      const startAt = createBusinessDate(localDate, localTime, booking.business.timezone);
      const endAt = calculateEndAt(startAt, booking.serviceDuration);
      const now = new Date();

      if (startAt < now) {
        throw new Error('El horario no puede estar en el pasado');
      }

      const { dayOfWeek, minuteOfDay: startMinute } = getBusinessDayAndMinute(startAt, booking.business.timezone);
      const { minuteOfDay: endMinute } = getBusinessDayAndMinute(endAt, booking.business.timezone);

      if (endMinute <= startMinute) {
        throw new Error('El turno no puede cruzar la medianoche');
      }

      // Validar BusinessHours
      const businessHours = await tx.businessHour.findMany({
        where: { businessId, dayOfWeek }
      });

      const isWithinHours = businessHours.some(h => startMinute >= h.startMinute && endMinute <= h.endMinute);
      if (!isWithinHours) {
        throw new Error('El horario seleccionado está fuera del horario de atención');
      }

      // Validar BlockedTime
      const exactDate = new Date(`${localDate}T00:00:00Z`);
      const blocks = await tx.blockedTime.findMany({
        where: { businessId, date: exactDate }
      });

      const isBlocked = blocks.some(b => Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute));
      if (isBlocked) throw new Error('El horario está bloqueado excepcionalmente');

      // Validar Overlap excluyendo el id actual
      const overlaps = await tx.booking.findMany({
        where: {
          businessId,
          professionalId: newProfessionalId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          id: { not: booking.id },
          startAt: { lt: endAt },
          endAt: { gt: startAt }
        }
      });

      if (overlaps.length > 0) {
        throw new Error('El profesional ya tiene un turno en ese horario');
      }

      // Update
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          professionalId: newProfessionalId,
          startAt,
          endAt
        }
      });

      return { success: true, updatedBooking, oldStartAt: booking.startAt, oldEndAt: booking.endAt, oldProfessionalName: booking.professional.name, newProfessionalName: newProfessional.name };
    });

    if (result.success) {
      // Emails
            // If we don't pass it, the email just doesn't include the management link. This is fine.

      const emailCli = await sendBookingRescheduledEmail(bookingId, undefined, result.oldProfessionalName !== result.newProfessionalName ? result.oldProfessionalName : undefined).catch(() => null);
      const emailAdm = await sendBookingRescheduledAdminEmail(bookingId, result.oldStartAt, result.oldEndAt, result.oldProfessionalName !== result.newProfessionalName ? result.oldProfessionalName : undefined).catch(() => null);

      if (!emailCli?.success) console.warn('Email cliente fallo:', emailCli);
      if (!emailAdm?.success) console.warn('Email admin fallo:', emailAdm);

      revalidatePath('/dashboard/calendario');
      revalidatePath('/dashboard/turnos');
      return { success: true };
    }
  } catch (error: unknown) {
    console.error('Error en adminRescheduleBooking:', error);
    return { success: false, error: (error as Error).message || 'Error desconocido' };
  }
}
