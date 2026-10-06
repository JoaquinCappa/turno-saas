import { describe, it, expect, vi } from 'vitest';
import { testPrisma } from './setup.concurrency';
import { adminRescheduleBooking } from '@/app/actions/bookings';
import { createBusinessDate } from '@/lib/date-utils';

vi.mock('@/lib/auth', () => ({
  getAuthenticatedContext: vi.fn(async () => {
    return {
      user: {
        role: 'OWNER',
        businessId: 'biz-concurrency'
      }
    };
  })
}));

vi.mock('@/lib/notifications', () => ({
  sendBookingRescheduledEmail: vi.fn(async () => ({ success: true })),
  sendBookingRescheduledAdminEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Reschedule vs Reschedule', () => {
  it('Dos bookings compiten por el mismo nuevo horario', async () => {
    const business = await testPrisma.business.create({
      data: {
        id: 'biz-concurrency',
        name: 'Biz Concurrency',
        slug: 'biz-reschedule',
        timezone: 'America/Argentina/Buenos_Aires',
        businessHours: {
          create: { dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 }
        }
      }
    });

    const professional = await testPrisma.professional.create({
      data: { name: 'Prof A', businessId: business.id }
    });

    const service = await testPrisma.service.create({
      data: { name: 'Servicio 1', duration: 60, price: 1000, businessId: business.id }
    });

    const customer = await testPrisma.customer.create({
      data: { name: 'C1', email: 'c1@test.com', businessId: business.id }
    });

    const d = '2026-10-12'; // Lunes

    // Booking 1 a las 09:00
    const b1 = await testPrisma.booking.create({
      data: {
        businessId: business.id,
        professionalId: professional.id,
        serviceId: service.id,
        customerId: customer.id,
        serviceName: service.name,
        serviceDuration: service.duration,
        servicePrice: service.price,
        startAt: createBusinessDate(d, '09:00', business.timezone),
        endAt: createBusinessDate(d, '10:00', business.timezone)
      }
    });

    // Booking 2 a las 14:00
    const b2 = await testPrisma.booking.create({
      data: {
        businessId: business.id,
        professionalId: professional.id,
        serviceId: service.id,
        customerId: customer.id,
        serviceName: service.name,
        serviceDuration: service.duration,
        servicePrice: service.price,
        startAt: createBusinessDate(d, '14:00', business.timezone),
        endAt: createBusinessDate(d, '15:00', business.timezone)
      }
    });

    // Compiten ambos para moverse a las 10:00
    const p1 = adminRescheduleBooking(b1.id, professional.id, d, '10:00');
    const p2 = adminRescheduleBooking(b2.id, professional.id, d, '10:00');

    const results = await Promise.allSettled([p1, p2]);

    let successCount = 0;
    for (const res of results) {
      if (res.status === 'fulfilled' && (res.value as unknown as { success: boolean }).success) successCount++;
    }

    expect(successCount).toBe(1);

    const bookings = await testPrisma.booking.findMany({
      where: { professionalId: professional.id },
      orderBy: { startAt: 'asc' }
    });

    // Uno est en las 10:00, el otro est en su horario original (09:00 o 14:00)
    const at10 = bookings.filter(b => b.startAt.toISOString() === createBusinessDate(d, '10:00', business.timezone).toISOString());
    expect(at10.length).toBe(1);
  });

  it('Swap A <-> B (Deadlock Test)', async () => {
    // Escenario crtico: evitar deadlock inter-lock
    const business = await testPrisma.business.create({
      data: {
        id: 'biz-concurrency', // Para machear el mock
        name: 'Biz Concurrency',
        slug: 'biz-swap',
        timezone: 'America/Argentina/Buenos_Aires',
        businessHours: {
          create: { dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 }
        }
      }
    });

    const profA = await testPrisma.professional.create({ data: { name: 'Prof A', businessId: business.id } });
    const profB = await testPrisma.professional.create({ data: { name: 'Prof B', businessId: business.id } });

    const service = await testPrisma.service.create({ data: { name: 'Servicio 1', duration: 60, price: 1000, businessId: business.id } });
    const customer = await testPrisma.customer.create({ data: { name: 'C1', email: 'c1@test.com', businessId: business.id } });

    const d = '2026-10-12';

    // Booking 1 con ProfA a las 10:00
    const b1 = await testPrisma.booking.create({
      data: {
        businessId: business.id, professionalId: profA.id, serviceId: service.id, customerId: customer.id,
        serviceName: service.name, serviceDuration: service.duration, servicePrice: service.price,
        startAt: createBusinessDate(d, '10:00', business.timezone), endAt: createBusinessDate(d, '11:00', business.timezone)
      }
    });

    // Booking 2 con ProfB a las 11:00 (Ojo: usamos 11:00 para no chocar lógicamente, queremos probar que NO HAY DEADLOCK DE LOCKS, 
    // y para asegurar que ambas tienen exito lgbico. Si usaramos 10:00 igual al final podrian fallar por overlap logico, 
    // pero lo ms seguro es que tengan existo logico ambos).
    const b2 = await testPrisma.booking.create({
      data: {
        businessId: business.id, professionalId: profB.id, serviceId: service.id, customerId: customer.id,
        serviceName: service.name, serviceDuration: service.duration, servicePrice: service.price,
        startAt: createBusinessDate(d, '11:00', business.timezone), endAt: createBusinessDate(d, '12:00', business.timezone)
      }
    });

    // Swap cruzado (b1 -> B a las 10:00) y (b2 -> A a las 11:00)
    // Con Promis.all para forzar que ambas transacciones tomen BEGIN casi al unsono.
    // Timeout de Vitest cortara si hay deadlock crtico, o PG lanzar "deadlock detected".
    const p1 = adminRescheduleBooking(b1.id, profB.id, d, '10:00');
    const p2 = adminRescheduleBooking(b2.id, profA.id, d, '11:00');

    const results = await Promise.allSettled([p1, p2]);

    let successCount = 0;
    for (const res of results) {
      if (res.status === 'fulfilled' && (res.value as unknown as { success: boolean }).success) successCount++;
    }

    // Ambas deberian triunfar porque los espacios de destino (B a las 10:00 y A a las 11:00) estn libres
    expect(successCount).toBe(2);

    // Validar en DB
    const finalB1 = await testPrisma.booking.findUnique({ where: { id: b1.id } });
    const finalB2 = await testPrisma.booking.findUnique({ where: { id: b2.id } });

    expect(finalB1?.professionalId).toBe(profB.id);
    expect(finalB2?.professionalId).toBe(profA.id);
  });
});
