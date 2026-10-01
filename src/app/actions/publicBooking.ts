'use server';

import prisma from '@/lib/prisma';
import { getBusinessDayAndMinute, createBusinessDate, calculateEndAt } from '@/lib/date-utils';
import { executeBooking, internalCancelBooking } from './bookings';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getPublicBusiness(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      isActive: true,
      description: true,
      phone: true,
      email: true,
      address: true,
      logoUrl: true,
      coverImageUrl: true
    }
  });
  if (!business || !business.isActive) return null;
  return business;
}

export async function getPublicServices(businessId: string) {
  return await prisma.service.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, duration: true, price: true }
  });
}

export async function getPublicProfessionals(businessId: string) {
  return await prisma.professional.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true }
  });
}

export async function getAvailableTimes(
  businessId: string,
  serviceId: string,
  professionalId: string,
  localDate: string,
  excludeBookingId?: string
) {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { timezone: true, isActive: true } });
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!business || !business.isActive || !service) return [];

  // Assuming localDate is "YYYY-MM-DD"
  // Create a UTC date at local midnight to find DayOfWeek
  const exactDateAtMidnight = new Date(`${localDate}T00:00:00Z`);
  // Wait, getBusinessDayAndMinute expects the local midnight in UTC but it was written for full dateTime.
  // Actually, we can just use the exactDateAtMidnight directly if we parse it carefully, or just create it with 12:00 to get the day safely.
  const dummyDate = createBusinessDate(localDate, "12:00", business.timezone);
  const day = getBusinessDayAndMinute(dummyDate, business.timezone).dayOfWeek;

  const businessHours = await prisma.businessHour.findMany({
    where: { businessId, dayOfWeek: day }
  });

  const blockedTimes = await prisma.blockedTime.findMany({
    where: { businessId, date: exactDateAtMidnight }
  });

  // Calculate day boundaries to get overlapping bookings
  const dayStart = createBusinessDate(localDate, "00:00", business.timezone);
  const dayEnd = createBusinessDate(localDate, "23:59", business.timezone);

  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      professionalId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startAt: { gte: dayStart, lte: dayEnd },
      id: excludeBookingId ? { not: excludeBookingId } : undefined
    }
  });

  const availableTimes: string[] = [];
  const now = new Date();

  for (const hour of businessHours) {
    // We step by service.duration or a default 30 mins
    const step = service.duration < 30 ? service.duration : 30;

    for (let min = hour.startMinute; min + service.duration <= hour.endMinute; min += step) {
      const startMinute = min;
      const endMinute = min + service.duration;

      // format local time
      const hStr = Math.floor(startMinute / 60).toString().padStart(2, '0');
      const mStr = (startMinute % 60).toString().padStart(2, '0');
      const localTime = `${hStr}:${mStr}`;

      const startAt = createBusinessDate(localDate, localTime, business.timezone);
      const endAt = calculateEndAt(startAt, service.duration);

      if (startAt < now) continue; // Past

      // Check blocks
      const isBlocked = blockedTimes.some(b => Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute));
      if (isBlocked) continue;

      // Check bookings
      const hasOverlap = existingBookings.some(b => {
        return startAt < b.endAt && endAt > b.startAt;
      });
      if (hasOverlap) continue;

      availableTimes.push(localTime);
    }
  }

  // Remove duplicates and sort
  return Array.from(new Set(availableTimes)).sort();
}

export async function createPublicBooking(data: {
  slug: string;
  serviceId: string;
  professionalId: string;
  localDate: string;
  localTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
    select: { id: true, isActive: true }
  });

  if (!business || !business.isActive) return { success: false, error: 'Negocio inválido o inactivo' };

  if (!data.customerName || !data.customerEmail) {
    return { success: false, error: 'Nombre y email son obligatorios' };
  }

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { businessId: business.id, email: data.customerEmail, isActive: true }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
      }
    });
  }

  // Call the core logic
  return await executeBooking(business.id, {
    customerId: customer.id,
    serviceId: data.serviceId,
    professionalId: data.professionalId,
    localDate: data.localDate,
    localTime: data.localTime,
    notes: data.notes
  });
}

export async function cancelPublicBooking(token: string) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'El enlace de gestión no es válido.' };
  }

  const managementTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const booking = await prisma.booking.findUnique({
      where: { managementTokenHash },
      select: { id: true, status: true }
    });

    if (!booking) {
      return { success: false, error: 'El enlace de gestión no es válido.' };
    }

    // Call the internal cancellation logic (which guarantees atomicity and sends email)
    const result = await internalCancelBooking(booking.id);

    if (result.success) {
      revalidatePath(`/mi-turno/${token}`);
    }

    return result;
  } catch (error) {
    console.error('Error in cancelPublicBooking:', error);
    return { success: false, error: 'Error al procesar la cancelación.' };
  }
}

export async function getAvailableTimesForReschedule(token: string, localDate: string) {
  if (!token || typeof token !== 'string') return [];
  const managementTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const booking = await prisma.booking.findUnique({
    where: { managementTokenHash },
    select: { id: true, businessId: true, serviceId: true, professionalId: true, status: true }
  });

  if (!booking) return [];
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return [];

  return getAvailableTimes(booking.businessId, booking.serviceId, booking.professionalId, localDate, booking.id);
}

import { sendBookingRescheduledEmail } from '@/lib/notifications';

export async function reschedulePublicBooking(token: string, localDate: string, localTime: string) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'El enlace de gestión no es válido.' };
  }

  const managementTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { managementTokenHash },
        include: { business: true }
      });

      if (!booking) throw new Error('El enlace de gestión no es válido.');
      if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
        throw new Error('Este turno ya no puede reprogramarse.');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.professionalId}));`;

      const startAt = createBusinessDate(localDate, localTime, booking.business.timezone);
      const endAt = calculateEndAt(startAt, booking.serviceDuration);
      const now = new Date();
      if (startAt < now) throw new Error('El horario no puede ser en el pasado.');

      const exactDate = new Date(`${localDate}T00:00:00Z`);
      const blocks = await tx.blockedTime.findMany({
        where: { businessId: booking.businessId, date: exactDate }
      });
      const [hour, minute] = localTime.split(':').map(Number);
      const startMinute = hour * 60 + minute;
      const endMinute = startMinute + booking.serviceDuration;
      const isBlocked = blocks.some(b => Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute));

      if (isBlocked) throw new Error('El horario está bloqueado excepcionalmente.');

      const overlaps = await tx.booking.findMany({
        where: {
          businessId: booking.businessId,
          professionalId: booking.professionalId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          id: { not: booking.id },
          startAt: { lt: endAt },
          endAt: { gt: startAt }
        }
      });

      if (overlaps.length > 0) {
        throw new Error('Este horario acaba de ser ocupado. Elegí otro.');
      }

      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        data: { startAt, endAt }
      });

      if (updated.count !== 1) {
        throw new Error('Este turno ya no puede reprogramarse.');
      }

      return { id: booking.id };
    });

    try {
      await sendBookingRescheduledEmail(result.id, token);
    } catch (e) {
      console.error('Error no bloqueante al despachar notificación de reprogramación:', e);
    }

    revalidatePath(`/mi-turno/${token}`);
    return { success: true };
  } catch (error) {
    console.error('Error in reschedulePublicBooking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al procesar la reprogramación.' };
  }
}
