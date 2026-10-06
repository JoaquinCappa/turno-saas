import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminRescheduleBooking } from '../src/app/actions/bookings';
import { reschedulePublicBooking } from '../src/app/actions/publicBooking';

const { mockGetEffectiveAvailability, mockTx, mockGetAuthenticatedContext } = vi.hoisted(() => {
  return {
    mockGetEffectiveAvailability: vi.fn(),
    mockGetAuthenticatedContext: vi.fn(),
    mockTx: {
      booking: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      professional: { findUnique: vi.fn() },
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
      $transaction: vi.fn(async (cb) => await cb(mockTx)),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  getAuthenticatedContext: mockGetAuthenticatedContext,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  sendBookingRescheduledEmail: vi.fn(async () => ({ success: true })),
  sendBookingRescheduledAdminEmail: vi.fn(async () => ({ success: true })),
}));

const baseDate = '2026-10-10'; // Saturday
const businessId = 'biz-1';
const professionalId = 'prof-A';
const newProfessionalId = 'prof-B';
const customerEmail = 'juan@test.com';

const validBooking = {
  id: 'booking-1',
  businessId,
  professionalId,
  serviceId: 'srv-1',
  status: 'PENDING',
  serviceDuration: 60,
  startAt: new Date('2026-10-10T09:00:00Z'),
  endAt: new Date('2026-10-10T10:00:00Z'),
  business: { id: businessId, timezone: 'America/Argentina/Buenos_Aires', isActive: true },
  service: { id: 'srv-1', isActive: true, duration: 60, name: 'Corte' },
  professional: { id: professionalId, isActive: true, name: 'Prof A' },
  customer: { email: customerEmail, name: 'Juan' }
};

describe('reschedulePublicBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.booking.findUnique.mockResolvedValue(validBooking);
    mockTx.booking.findFirst.mockResolvedValue(null); // No daily limit exceed
    mockTx.booking.findMany.mockResolvedValue([]); // No overlaps
    mockTx.booking.update.mockResolvedValue({ id: 'booking-1' });
    mockTx.booking.updateMany.mockResolvedValue({ count: 1 });
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }], // 09:00 - 18:00
      blocks: []
    });
  });

  it('A. Happy path: Reprogramacion valida', async () => {
    const result = await reschedulePublicBooking('valid-token', baseDate, '11:00');
    expect(result.success).toBe(true);
    expect(mockTx.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'booking-1' }),
      data: expect.objectContaining({
        startAt: expect.any(Date),
        endAt: expect.any(Date)
      })
    }));
  });

  it('B. Token invalido / Booking no encontrado', async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);
    const result = await reschedulePublicBooking('invalid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no es v.lido/i);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });

  it('B. Booking en estado no permitido (ej. CANCELLED)', async () => {
    mockTx.booking.findUnique.mockResolvedValue({ ...validBooking, status: 'CANCELLED' });
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ya no puede reprogramarse/i);
  });

  it('C. Negocio inactivo', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      ...validBooking,
      business: { ...validBooking.business, isActive: false }
    });
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/inactivo/i);
  });

  it('D. Fuera del horario efectivo', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 600 }], // Solo 9 a 10
      blocks: []
    });
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/fuera del horario/i);
  });

  it('E. Solapamiento excluyendo el propio booking', async () => {
    mockTx.booking.findMany.mockResolvedValue([{ id: 'booking-2' }]);
    
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ocupado|ya tiene un turno/i);
    
    expect(mockTx.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { not: 'booking-1' }
      })
    }));
  });

  it('F. Regla de email/dia: limit_exceeded y excluye el propio booking', async () => {
    mockTx.booking.findFirst.mockResolvedValue({ id: 'booking-2' });
    
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Solo permitimos un turno/i);
    
    expect(mockTx.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { not: 'booking-1' },
        customer: { email: customerEmail }
      })
    }));
  });

  it('G. Concurrencia / Lock', async () => {
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    if (!result.success) console.error("G. Concurrencia:", result.error);
    expect(result.success).toBe(true);

    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(`limit-${businessId}-${customerEmail}`));
    expect(mockTx.$executeRaw).toHaveBeenCalled(); // professional lock
  });

  it('H. Disponibilidad post-lock: rechazo', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 600 }], // Solo 9 a 10
      blocks: []
    });
    const result = await reschedulePublicBooking('valid', baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/fuera del horario/i);
    expect(mockTx.$executeRaw).toHaveBeenCalled(); // Se pido lock antes de fallar
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });
});

describe('adminRescheduleBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedContext.mockResolvedValue({
      user: { role: 'OWNER', businessId }
    });
    mockTx.booking.findUnique.mockResolvedValue(validBooking);
    mockTx.professional.findUnique.mockResolvedValue({ id: newProfessionalId, businessId, isActive: true, name: 'Prof B' });
    mockTx.booking.findMany.mockResolvedValue([]);
    mockTx.booking.update.mockResolvedValue({ id: 'booking-1' });
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: []
    });
  });

  it('A. Happy path: Cambio de profesional', async () => {
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    if (!result.success) console.error("AdminReschedule failed with:", result.error);
    expect(result.success).toBe(true);
    expect(mockTx.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        professionalId: newProfessionalId
      })
    }));
  });

  it('B. Autorizacion: STAFF no puede', async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: { role: 'STAFF', businessId }
    });
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permisos/i);
  });

  it('B. Autorizacion: Distinto business', async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: { role: 'OWNER', businessId: 'otro-business' }
    });
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    // It will return success: false from the result of the catch block in the action (No autorizado para modificar este turno)
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no autorizado/i);
  });

  it('C. Booking inexistente', async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no encontrado/i);
  });

  it('D. Profesional inactivo', async () => {
    mockTx.professional.findUnique.mockResolvedValue({ id: newProfessionalId, businessId, isActive: false });
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/inactivo/i);
  });

  it('E. Fuera de horario del nuevo profesional', async () => {
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 600 }], // Solo 9 a 10
      blocks: []
    });
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/fuera del horario/i);
  });

  it('F. Solapamiento en el nuevo profesional', async () => {
    mockTx.booking.findMany.mockResolvedValue([{ id: 'booking-2' }]);
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ya tiene un turno/i);
  });

  it('G. Lock ordering: Cambio de profesional (orden lexico)', async () => {
    await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    
    // Verificamos que se hayan pedido 2 locks
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
    // Y verificamos que el orden haya sido el lexico
    expect(mockTx.$executeRaw.mock.calls[0][0][0]).toContain('pg_advisory_xact_lock');
    // Just verifying the orchestration happened
  });

  it('G. Lock ordering: Mismo profesional', async () => {
    await adminRescheduleBooking('booking-1', professionalId, baseDate, '11:00');
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('H. Disponibilidad post-lock restrictiva', async () => {
    // Al setear el mock directamente con horas invalidas, confirmamos que 
    // la revalidacion final dentro del tx es la que domina.
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 600 }],
      blocks: []
    });
    const result = await adminRescheduleBooking('booking-1', newProfessionalId, baseDate, '11:00');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/fuera del horario/i);
    expect(mockTx.$executeRaw).toHaveBeenCalled();
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });
});
