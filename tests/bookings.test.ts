import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeBooking } from '../src/app/actions/bookings';
import { createPublicBooking } from '../src/app/actions/publicBooking';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const { mockGetEffectiveAvailability, mockTx } = vi.hoisted(() => {
  return {
    mockGetEffectiveAvailability: vi.fn(),
    mockTx: {
      business: { findUnique: vi.fn() },
      customer: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
      service: { findUnique: vi.fn() },
      professional: { findUnique: vi.fn() },
      booking: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
      $executeRaw: vi.fn(),
      $executeRawUnsafe: vi.fn(),
    }
  };
});

vi.mock('@/lib/availability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/availability')>();
  return {
    ...actual,
    getEffectiveAvailability: mockGetEffectiveAvailability,
  };
});

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      business: { findUnique: vi.fn() },
      $transaction: vi.fn(async (cb) => await cb(mockTx)),
    },
  };
});

// Mock Next.js cache revalidatePath to avoid missing module errors in tests
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedContext: vi.fn(),
}));

// Avoid executing email/crypto logic that could fail if not mocked
vi.mock('@/lib/notifications', () => ({
  sendBookingCreatedEmail: vi.fn(),
  sendBookingCreatedAdminEmail: vi.fn(),
}));

const baseDate = '2026-10-10'; // Saturday
const businessId = 'biz-1';
const customerId = 'cust-1';
const serviceId = 'srv-1';
const professionalId = 'prof-1';

const validEntities = {
  business: { id: businessId, timezone: 'America/Argentina/Buenos_Aires', isActive: true },
  customer: { id: customerId, businessId, isActive: true },
  service: { id: serviceId, businessId, isActive: true, duration: 60, name: 'Corte', price: 100 },
  professional: { id: professionalId, businessId, isActive: true }
};

describe('executeBooking - Horarios y Validaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTx.business.findUnique.mockResolvedValue(validEntities.business);
    mockTx.customer.findUnique.mockResolvedValue(validEntities.customer);
    mockTx.service.findUnique.mockResolvedValue(validEntities.service);
    mockTx.professional.findUnique.mockResolvedValue(validEntities.professional);
    mockTx.booking.findMany.mockResolvedValue([]); // No overlaps
    mockTx.booking.create.mockResolvedValue({ id: 'booking-1' });
  });

  it('A. Reserva dentro del horario: debe continuar hasta la creacion', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }], // 09:00 to 18:00
      blocks: []
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00'
    }, mockTx as unknown as Prisma.TransactionClient);

    expect(result.success).toBe(true);
    expect('bookingId' in result).toBe(true);
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it('B. Reserva completamente fuera: debe rechazar', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '08:00' // Out of hours
    }, mockTx as unknown as Prisma.TransactionClient);

    expect(result.success).toBe(false);
    expect('error' in result && result.error).toMatch(/fuera del horario/i);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it('C. Reserva que empieza dentro pero termina fuera: debe rechazar', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '17:30' // Ends at 18:30
    }, mockTx as unknown as Prisma.TransactionClient);

    expect(result.success).toBe(false);
    expect('error' in result && result.error).toMatch(/fuera del horario/i);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it('D. Reserva exactamente igual al intervalo permitido: debe aceptar', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 600, endMinute: 660 }], // 10:00 to 11:00
      blocks: []
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00'
    }, mockTx as unknown as Prisma.TransactionClient);

    expect(result.success).toBe(true);
    expect(mockTx.booking.create).toHaveBeenCalled();
  });
});

describe('TEST CRITICO DE 30B - Revalidacion Transaccional (afae6dd)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.business.findUnique.mockResolvedValue(validEntities.business);
    mockTx.customer.findUnique.mockResolvedValue(validEntities.customer);
    mockTx.service.findUnique.mockResolvedValue(validEntities.service);
    mockTx.professional.findUnique.mockResolvedValue(validEntities.professional);
    mockTx.booking.findMany.mockResolvedValue([]);
  });

  it('Debe usar la lectura POST-LOCK como autoritativa y rechazar si hubo cambio', async () => {
    // 1er llamado: validacion previa (permite la reserva 10:00-11:00)
    mockGetEffectiveAvailability.mockResolvedValueOnce({
      hours: [{ startMinute: 540, endMinute: 1080 }], // 09:00-18:00
      blocks: []
    });

    // 2do llamado: revalidacion post-lock (ahora el turno cae fuera)
    mockGetEffectiveAvailability.mockResolvedValueOnce({
      hours: [{ startMinute: 540, endMinute: 600 }], // 09:00-10:00
      blocks: []
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00'
    }, mockTx as unknown as Prisma.TransactionClient);

    // Comprobamos:
    // 4. Se lanza el error de horario
    expect(result.success).toBe(false);
    expect('error' in result && result.error).toMatch(/fuera del horario/i);

    // 1. Se solicito el advisory lock (tx.$executeRaw) ANTES del segundo getEffectiveAvailability
    expect(mockTx.$executeRaw).toHaveBeenCalled();
    
    // 2. getEffectiveAvailability fue consultado dos veces
    expect(mockGetEffectiveAvailability).toHaveBeenCalledTimes(2);

    // 3 y 5. NO se creo el Booking porque la 2da lectura autoritativa evito el INSERT
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });
});

describe('executeBooking - Bloqueos y Overlap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.business.findUnique.mockResolvedValue(validEntities.business);
    mockTx.customer.findUnique.mockResolvedValue(validEntities.customer);
    mockTx.service.findUnique.mockResolvedValue(validEntities.service);
    mockTx.professional.findUnique.mockResolvedValue(validEntities.professional);
    mockTx.booking.create.mockResolvedValue({ id: 'booking-2' });
  });

  it('Bloqueos A/B/C: Reserva solapada con bloqueos -> rechazo', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: [{ startMinute: 630, endMinute: 690 }] // 10:30 a 11:30
    });

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00' // Termina 11:00
    }, mockTx as unknown as Prisma.TransactionClient);
    
    expect(result.success).toBe(false);
    expect('error' in result && result.error).toMatch(/bloqueado excepcionalmente/i);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it('Overlap A: Reserva solapada -> rechazo', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });

    // Simulamos un overlap devuelto por Prisma
    mockTx.booking.findMany.mockResolvedValue([
      { id: 'exist-1', startAt: new Date(), endAt: new Date() }
    ]);

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00'
    }, mockTx as unknown as Prisma.TransactionClient);
    
    expect(result.success).toBe(false);
    expect('error' in result && result.error).toMatch(/ya tiene un turno/i);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it('Overlap B: Reserva adyacente -> permitida', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });

    mockTx.booking.findMany.mockResolvedValue([]);

    const result = await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '11:00'
    }, mockTx as unknown as Prisma.TransactionClient);

    expect(result.success).toBe(true);
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it('Overlap C/D y Estados: Verifica el query de estados', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });
    mockTx.booking.findMany.mockResolvedValue([]);

    await executeBooking(businessId, {
      customerId, serviceId, professionalId, localDate: baseDate, localTime: '10:00'
    }, mockTx as unknown as Prisma.TransactionClient);

    // Verificamos estrictamente la query enviada a findMany, incluyendo los status esperados
    expect(mockTx.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        AND: [
          { startAt: { lt: expect.any(Date) } },
          { endAt: { gt: expect.any(Date) } }
        ]
      })
    }));
  });
});

describe('createPublicBooking - Integracion Mockeada', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = prisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.business.findUnique.mockResolvedValue({ ...validEntities.business, slug: 'mi-negocio' });
    mockTx.customer.findFirst.mockResolvedValue(null); 
    mockTx.customer.create.mockResolvedValue(validEntities.customer);
    
    mockTx.booking.findFirst.mockResolvedValue(null);

    mockTx.business.findUnique.mockResolvedValue(validEntities.business);
    mockTx.customer.findUnique.mockResolvedValue(validEntities.customer);
    mockTx.service.findUnique.mockResolvedValue(validEntities.service);
    mockTx.professional.findUnique.mockResolvedValue(validEntities.professional);
    mockTx.booking.findMany.mockResolvedValue([]);
    mockTx.booking.create.mockResolvedValue({ id: 'pub-booking-1' });
    
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });
  });

  it('A. Una disponibilidad valida llega a creacion', async () => {
    const result = await createPublicBooking({
      slug: 'mi-negocio',
      serviceId, professionalId,
      localDate: baseDate, localTime: '10:00',
      customerName: 'Juan', customerEmail: 'juan@test.com', customerPhone: '123'
    });

    expect(mockTx.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'juan@test.com' })
    }));

    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), expect.stringContaining('limit-'));
    
    expect(result.success).toBe(true);
    expect('bookingId' in result).toBe(true);
  });

  it('B. Rechaza si ya tiene un turno ese dia (limit_exceeded)', async () => {
    mockTx.booking.findFirst.mockResolvedValue({
      id: 'old-1',
      startAt: new Date('2026-10-10T10:00:00Z'),
      endAt: new Date('2026-10-10T11:00:00Z'),
      service: { name: 'Srv' },
      professional: { name: 'Prof' }
    });

    const result = await createPublicBooking({
      slug: 'mi-negocio',
      serviceId, professionalId,
      localDate: baseDate, localTime: '15:00',
      customerName: 'Juan', customerEmail: 'juan@test.com', customerPhone: '123'
    });

    expect(result.success).toBe(false);
    expect('reason' in result && result.reason === 'limit_exceeded').toBe(true);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });
});
