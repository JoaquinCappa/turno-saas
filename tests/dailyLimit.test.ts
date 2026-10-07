import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAvailableTimes, createPublicBooking } from '../src/app/actions/publicBooking';

const { mockGetEffectiveAvailability, mockPrisma, mockTx } = vi.hoisted(() => {
  const mockTx = {
    business: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    professional: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  };
  return {
    mockGetEffectiveAvailability: vi.fn(),
    mockTx,
    mockPrisma: {
      business: { findUnique: vi.fn() },
      service: { findUnique: vi.fn() },
      booking: { findMany: vi.fn(), findFirst: vi.fn() },
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) => await cb(mockTx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications', () => ({
  sendBookingCreatedEmail: vi.fn(async () => ({ success: true })),
  sendBookingCreatedAdminEmail: vi.fn(async () => ({ success: true })),
  sendBookingRescheduledEmail: vi.fn(async () => ({ success: true })),
  sendBookingRescheduledAdminEmail: vi.fn(async () => ({ success: true })),
  sendBookingCancelledAdminEmail: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/lib/availability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/availability')>();
  return { ...actual, getEffectiveAvailability: mockGetEffectiveAvailability };
});

const businessId = 'biz-1';
const serviceId = 'srv-1';
const professionalId = 'prof-1';
const email = 'juan@test.com';
const localDate = '2030-10-10';

type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
const ALL_STATUSES: Status[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
const BLOCKING: Status[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];
const NON_BLOCKING: Status[] = ['NO_SHOW', 'CANCELLED'];

/**
 * Simula la base de datos para la query del limite diario: aplica el filtro
 * `where.status.in` REAL que arma el codigo sobre un turno existente del cliente.
 * Si el codigo vuelve a incluir un estado indebido, estos tests fallan.
 */
function seedExistingBookingWithStatus(status: Status) {
  const existing = {
    status,
    startAt: new Date('2030-10-10T13:00:00Z'),
    endAt: new Date('2030-10-10T14:00:00Z'),
    service: { name: 'Corte' },
    professional: { name: 'Lucas' },
  };
  const dbLike = vi.fn(async (args: { where: { status?: { in?: string[] } } }) => {
    const allowed = args.where.status?.in;
    return !allowed || allowed.includes(existing.status) ? existing : null;
  });
  mockPrisma.booking.findFirst.mockImplementation(dbLike);
  mockTx.booking.findFirst.mockImplementation(dbLike);
}

describe('Limite diario por cliente - getAvailableTimes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'America/Argentina/Buenos_Aires', isActive: true });
    mockPrisma.service.findUnique.mockResolvedValue({ id: serviceId, duration: 60 });
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: [],
    });
  });

  it.each(BLOCKING)('%s encontrado -> hasBookingThatDay=true (bloquea)', async (status) => {
    seedExistingBookingWithStatus(status);

    const res = await getAvailableTimes(businessId, serviceId, professionalId, localDate, undefined, email);

    expect(res.hasBookingThatDay).toBe(true);
    expect(res.availableTimes).toEqual([]);
    expect('existingBooking' in res && res.existingBooking?.professionalName).toBe('Lucas');
  });

  it.each(NON_BLOCKING)('%s encontrado -> hasBookingThatDay=false (no bloquea) y muestra horarios', async (status) => {
    seedExistingBookingWithStatus(status);

    const res = await getAvailableTimes(businessId, serviceId, professionalId, localDate, undefined, email);

    expect(res.hasBookingThatDay).toBe(false);
    expect(res.availableTimes!.length).toBeGreaterThan(0);
  });

  it('el filtro de status de la query es exactamente PENDING/CONFIRMED/COMPLETED', async () => {
    seedExistingBookingWithStatus('NO_SHOW');

    await getAvailableTimes(businessId, serviceId, professionalId, localDate, undefined, email);

    const where = mockPrisma.booking.findFirst.mock.calls[0][0].where;
    expect(where.status.in).toEqual(BLOCKING);
  });
});

describe('Limite diario por cliente - createPublicBooking (los 5 estados)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.business.findUnique.mockResolvedValue({ id: businessId, timezone: 'America/Argentina/Buenos_Aires', isActive: true });
    mockTx.business.findUnique.mockResolvedValue({ id: businessId, timezone: 'America/Argentina/Buenos_Aires', isActive: true });
    mockTx.service.findUnique.mockResolvedValue({ id: serviceId, businessId, isActive: true, duration: 60, name: 'Corte', price: 1000 });
    mockTx.professional.findUnique.mockResolvedValue({ id: professionalId, businessId, isActive: true, name: 'Lucas' });
    mockTx.booking.findMany.mockResolvedValue([]);
    mockTx.customer.findFirst.mockResolvedValue({ id: 'cust-1', businessId, email, isActive: true });
    mockTx.customer.findUnique.mockResolvedValue({ id: 'cust-1', businessId, email, isActive: true });
    mockTx.customer.create.mockResolvedValue({ id: 'cust-1', businessId, email, isActive: true });
    mockTx.booking.create.mockResolvedValue({ id: 'new-booking' });
    mockGetEffectiveAvailability.mockResolvedValue({
      hours: [{ startMinute: 540, endMinute: 1080 }],
      blocks: [],
    });
  });

  const attempt = () =>
    createPublicBooking({
      slug: 'mi-negocio',
      serviceId,
      professionalId,
      localDate,
      localTime: '15:00',
      customerName: 'Juan',
      customerEmail: email,
      customerPhone: '123',
    });

  it.each(BLOCKING)('%s previo -> rechaza con limit_exceeded', async (status) => {
    seedExistingBookingWithStatus(status);

    const result = await attempt();

    expect(result.success).toBe(false);
    expect('reason' in result && result.reason).toBe('limit_exceeded');
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it.each(NON_BLOCKING)('%s previo -> NO bloquea, permite reservar el mismo dia', async (status) => {
    seedExistingBookingWithStatus(status);

    const result = await attempt();

    expect(result.success).toBe(true);
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it('regresion E2E: cliente con turno NO_SHOW puede volver a reservar ese mismo dia', async () => {
    seedExistingBookingWithStatus('NO_SHOW');

    const result = await attempt();

    expect(result.success).toBe(true);
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it('cubre los 5 estados de la regla (guarda contra estados nuevos sin clasificar)', () => {
    expect([...BLOCKING, ...NON_BLOCKING].sort()).toEqual([...ALL_STATUSES].sort());
  });
});
