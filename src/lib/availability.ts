import prisma from './prisma';
import type { Prisma, DayOfWeek } from '@prisma/client';

export async function getEffectiveAvailability(
  tx: Prisma.TransactionClient | typeof prisma,
  businessId: string,
  professionalId: string,
  dayOfWeek: DayOfWeek,
  exactDateAtMidnight: Date
) {
  const professional = await tx.professional.findUnique({
    where: { id: professionalId }
  });

  if (!professional || professional.businessId !== businessId) {
    throw new Error('Profesional invlido');
  }

  const businessHours = await tx.businessHour.findMany({
    where: { businessId, dayOfWeek }
  });

  const blockedTimes = await tx.blockedTime.findMany({
    where: { businessId, date: exactDateAtMidnight }
  });

  if (!professional.isCustomHoursEnabled) {
    return {
      hours: businessHours.map(h => ({ startMinute: h.startMinute, endMinute: h.endMinute })),
      blocks: blockedTimes.map(b => ({ startMinute: b.startMinute, endMinute: b.endMinute }))
    };
  }

  const professionalHours = await tx.professionalHour.findMany({
    where: { professionalId, dayOfWeek }
  });

  const professionalBlocks = await tx.professionalBlockedTime.findMany({
    where: { professionalId, date: exactDateAtMidnight }
  });

  // Interseccin de horarios (BusinessHour ∩ ProfessionalHour)
  const hours: { startMinute: number, endMinute: number }[] = [];
  for (const bh of businessHours) {
    for (const ph of professionalHours) {
      const startMinute = Math.max(bh.startMinute, ph.startMinute);
      const endMinute = Math.min(bh.endMinute, ph.endMinute);
      if (startMinute < endMinute) {
        hours.push({ startMinute, endMinute });
      }
    }
  }

  // Unin de bloqueos (BlockedTime ∪ ProfessionalBlockedTime)
  const blocks = [
    ...blockedTimes.map(b => ({ startMinute: b.startMinute, endMinute: b.endMinute })),
    ...professionalBlocks.map(b => ({ startMinute: b.startMinute, endMinute: b.endMinute }))
  ];

  return { hours, blocks };
}

export function isTimeWithinHours(startMinute: number, endMinute: number, hours: { startMinute: number, endMinute: number }[]) {
  return hours.some(h => startMinute >= h.startMinute && endMinute <= h.endMinute);
}

export function isTimeBlocked(startMinute: number, endMinute: number, blocks: { startMinute: number, endMinute: number }[]) {
  return blocks.some(b => Math.max(startMinute, b.startMinute) < Math.min(endMinute, b.endMinute));
}
