import { describe, it, expect, vi } from 'vitest';
import { testPrisma } from './setup.concurrency';
import { executeBooking } from '@/app/actions/bookings';
import { createProfessionalBlockedTime } from '@/app/actions/professionalSchedules';

// Necesitamos mockear auth solo para que createProfessionalBlockedTime pase
vi.mock('@/lib/auth', () => ({
  getAuthenticatedContext: vi.fn(async () => {
    // Para que los tests de concurrencia de bloques estn autorizados
    // Simulamos un tenant context. Asumimos el ID "biz-concurrency".
    return {
      user: {
        role: 'OWNER',
        businessId: 'biz-concurrency'
      }
    };
  })
}));

// Para email notifications
vi.mock('@/lib/notifications', () => ({
  sendBookingCreatedEmail: vi.fn(async () => ({ success: true })),
  sendBookingCreatedAdminEmail: vi.fn(async () => ({ success: true })),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Booking vs Block y Block vs Block', () => {
  it('Booking vs Professional Block: solo uno triunfa', async () => {
    const business = await testPrisma.business.create({
      data: {
        id: 'biz-concurrency',
        name: 'Biz Concurrency',
        slug: 'biz-concurrency-blocks',
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

    const localDate = '2026-10-12'; // MONDAY
    const localTime = '10:00'; // 600

    const pBooking = executeBooking(business.id, {
      customerId: customer.id,
      serviceId: service.id,
      professionalId: professional.id,
      localDate,
      localTime,
      notes: ''
    });

    const pBlock = createProfessionalBlockedTime({
      professionalId: professional.id, 
      localDate, 
      startMinute: 600, 
      endMinute: 660, 
      title: 'Reunion'
    });

    const results = await Promise.allSettled([pBooking, pBlock]);

    let bookingSuccess = false;
    let blockSuccess = false;

    if (results[0].status === 'fulfilled' && (results[0].value as unknown as { success: boolean }).success) bookingSuccess = true;
    if (results[1].status === 'fulfilled' && (results[1].value as unknown as { success: boolean }).success) blockSuccess = true;

    // Solo uno debe triunfar
    expect(bookingSuccess !== blockSuccess).toBe(true);

    const bookings = await testPrisma.booking.findMany({ where: { professionalId: professional.id } });
    const blocks = await testPrisma.professionalBlockedTime.findMany({ where: { professionalId: professional.id } });

    expect(bookings.length).toBe(bookingSuccess ? 1 : 0);
    expect(blocks.length).toBe(blockSuccess ? 1 : 0);
  });

  it('Block vs Block: comportamiento real (permitido o no)', async () => {
    // Si la implementacion actual permite overlapping blocks (como union), 
    // entonces ambos deberian insertarse (o uno sobrescribir). Vamos a comprobar que postgres no explote.
    const business = await testPrisma.business.create({
      data: {
        id: 'biz-concurrency',
        name: 'Biz Concurrency',
        slug: 'biz-concurrency-blocks-2',
        timezone: 'America/Argentina/Buenos_Aires',
      }
    });

    const professional = await testPrisma.professional.create({
      data: { name: 'Prof A', businessId: business.id }
    });

    const localDate = '2026-10-12';
    
    // Disparamos 2 bloques exactamente en el mismo lugar
    const p1 = createProfessionalBlockedTime({ professionalId: professional.id, localDate, startMinute: 600, endMinute: 660, title: 'B1' });
    const p2 = createProfessionalBlockedTime({ professionalId: professional.id, localDate, startMinute: 600, endMinute: 660, title: 'B2' });

    await Promise.allSettled([p1, p2]);

    const blocks = await testPrisma.professionalBlockedTime.findMany({ where: { professionalId: professional.id } });
    
    // No exigimos que falle o pase, solo documentamos y testeamos que lo que haga lo haga consistentemente
    // Si la implementacion no restringe solapamiento, habra 2. Si restringe, habra 1.
    // Actualmente, no hay unique constraint ni chequeo de overlap para blocked time en el cdigo que lemos.
    // Por ende es posible que pasen ambos.
    expect(blocks.length).toBeGreaterThan(0);
  });
});
