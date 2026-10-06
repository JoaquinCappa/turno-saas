import { describe, it, expect } from 'vitest';
import { testPrisma } from './setup.concurrency';
import { executeBooking } from '@/app/actions/bookings';

describe('Booking vs Booking', () => {
  it('Debe permitir exactamente 1 booking cuando 2 operaciones concurrentes compiten', async () => {
    // 1. Preparar DB (Business, Professional, Service, Customer)
    const business = await testPrisma.business.create({
      data: {
        name: 'Biz Concurrency',
        slug: 'biz-concurrency',
        timezone: 'America/Argentina/Buenos_Aires',
        businessHours: {
          create: {
            dayOfWeek: 'MONDAY',
            startMinute: 540, // 09:00
            endMinute: 1080 // 18:00
          }
        }
      }
    });

    const professional = await testPrisma.professional.create({
      data: { name: 'Prof A', businessId: business.id }
    });

    const service = await testPrisma.service.create({
      data: { name: 'Servicio 1', duration: 60, price: 1000, businessId: business.id }
    });

    const customer1 = await testPrisma.customer.create({
      data: { name: 'C1', email: 'c1@test.com', businessId: business.id }
    });

    const customer2 = await testPrisma.customer.create({
      data: { name: 'C2', email: 'c2@test.com', businessId: business.id }
    });

    // 2. Disparar operaciones concurrentes
    // Vamos a reservar el Lunes 2026-10-12 a las 10:00 (mismo horario)
    const localDate = '2026-10-12';
    const localTime = '10:00';

    const p1 = executeBooking(business.id, {
      customerId: customer1.id,
      serviceId: service.id,
      professionalId: professional.id,
      localDate,
      localTime,
      notes: ''
    });

    const p2 = executeBooking(business.id, {
      customerId: customer2.id,
      serviceId: service.id,
      professionalId: professional.id,
      localDate,
      localTime,
      notes: ''
    });

    const results = await Promise.allSettled([p1, p2]);

    // 3. Evaluar resultados
    // Tienen que ser un Exito (success: true) y un Fallo (success: false o exception)
    let successCount = 0;
    let failCount = 0;

    for (const res of results) {
      if (res.status === 'fulfilled') {
        if (res.value.success) successCount++;
        else failCount++;
      } else {
        failCount++;
      }
    }

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    // 4. Comprobar DB estado real
    const bookings = await testPrisma.booking.findMany({
      where: {
        businessId: business.id,
        professionalId: professional.id
      }
    });

    expect(bookings.length).toBe(1);
    expect(bookings[0].status).toBe('CONFIRMED'); // Estado inicial
  });
});
