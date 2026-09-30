'use server';

import prisma from '@/lib/prisma';
import { getBusinessDayAndMinute, createBusinessDate, calculateEndAt } from '@/lib/date-utils';
import { executeBooking } from './bookings'; // Note: I need to export executeBooking!

export async function getPublicBusiness(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, timezone: true, isActive: true }
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
  localDate: string
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
      startAt: { gte: dayStart, lte: dayEnd }
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
