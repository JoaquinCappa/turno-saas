import { describe, it, expect, vi } from 'vitest';
import { getEffectiveAvailability, isTimeWithinHours, isTimeBlocked } from '../src/lib/availability';
import { DayOfWeek } from '@prisma/client';

describe('Availability Engine (getEffectiveAvailability)', () => {
  const businessId = 'biz-1';
  const professionalId = 'prof-1';
  const dayOfWeek = DayOfWeek.MONDAY;
  const exactDateAtMidnight = new Date('2026-10-05T00:00:00Z');

  const createMockTx = (data: {
    isCustomHoursEnabled?: boolean;
    businessHours?: { startMinute: number; endMinute: number }[];
    professionalHours?: { startMinute: number; endMinute: number }[];
    blockedTimes?: { startMinute: number; endMinute: number }[];
    professionalBlockedTimes?: { startMinute: number; endMinute: number }[];
  }) => {
    return {
      professional: {
        findUnique: vi.fn().mockImplementation(async (args) => {
          if (args.where.id === professionalId) {
            return {
              id: professionalId,
              businessId,
              isCustomHoursEnabled: data.isCustomHoursEnabled ?? false,
            };
          }
          return null;
        }),
      },
      businessHour: {
        findMany: vi.fn().mockImplementation(async (args) => {
          if (args.where.businessId === businessId && args.where.dayOfWeek === dayOfWeek) {
            return data.businessHours || [];
          }
          return [];
        }),
      },
      blockedTime: {
        findMany: vi.fn().mockImplementation(async (args) => {
          if (args.where.businessId === businessId && args.where.date === exactDateAtMidnight) {
            return data.blockedTimes || [];
          }
          return [];
        }),
      },
      professionalHour: {
        findMany: vi.fn().mockImplementation(async (args) => {
          if (args.where.professionalId === professionalId && args.where.dayOfWeek === dayOfWeek) {
            return data.professionalHours || [];
          }
          return [];
        }),
      },
      professionalBlockedTime: {
        findMany: vi.fn().mockImplementation(async (args) => {
          if (args.where.professionalId === professionalId && args.where.date === exactDateAtMidnight) {
            return data.professionalBlockedTimes || [];
          }
          return [];
        }),
      },
    } as unknown as typeof import('../src/lib/prisma').default;
  };

  it('4. TEST: HORARIO GLOBAL (customHoursEnabled = false)', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: false,
      businessHours: [{ startMinute: 540, endMinute: 1080 }], // 09:00 - 18:00
      professionalHours: [{ startMinute: 600, endMinute: 720 }] // Ignored
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([{ startMinute: 540, endMinute: 1080 }]);
    expect(tx.professionalHour.findMany).not.toHaveBeenCalled();
  });

  it('5. TEST: HORARIO PERSONALIZADO (customHoursEnabled = true)', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: true,
      businessHours: [{ startMinute: 540, endMinute: 1080 }], // 09:00 - 18:00
      professionalHours: [{ startMinute: 600, endMinute: 960 }] // 10:00 - 16:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([{ startMinute: 600, endMinute: 960 }]);
  });

  it('6. TEST: INTERSECCION PARCIAL', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: true,
      businessHours: [{ startMinute: 540, endMinute: 1080 }], // 09:00 - 18:00
      professionalHours: [{ startMinute: 900, endMinute: 1200 }] // 15:00 - 20:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([{ startMinute: 900, endMinute: 1080 }]); // 15:00 - 18:00
  });

  it('7. TEST: PROFESSIONAL HOUR FUERA DEL NEGOCIO', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: true,
      businessHours: [{ startMinute: 540, endMinute: 720 }], // 09:00 - 12:00
      professionalHours: [{ startMinute: 780, endMinute: 1080 }] // 13:00 - 18:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([]);
  });

  it('8. TEST: CUSTOM SIN PROFESSIONAL HOURS', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: true,
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      professionalHours: []
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([]);
  });

  it('9. TEST: BLOCKED TIME GLOBAL', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: false,
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      blockedTimes: [{ startMinute: 780, endMinute: 900 }] // 13:00 - 15:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.hours).toEqual([{ startMinute: 540, endMinute: 1080 }]);
    expect(result.blocks).toEqual([{ startMinute: 780, endMinute: 900 }]);
  });

  it('10. TEST: PROFESSIONAL BLOCKED TIME (customHoursEnabled = false)', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: false,
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      professionalBlockedTimes: [{ startMinute: 780, endMinute: 900 }] // 13:00 - 15:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.blocks).toEqual([{ startMinute: 780, endMinute: 900 }]);
  });

  it('11. TEST: UNION DE BLOQUEOS', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: false, // O true, la regla aplica igual
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      blockedTimes: [{ startMinute: 600, endMinute: 660 }], // 10:00 - 11:00
      professionalBlockedTimes: [{ startMinute: 840, endMinute: 900 }] // 14:00 - 15:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    expect(result.blocks).toContainEqual({ startMinute: 600, endMinute: 660 });
    expect(result.blocks).toContainEqual({ startMinute: 840, endMinute: 900 });
    expect(result.blocks.length).toBe(2);
  });

  it('12. TEST: AMBOS BLOQUEOS SOLAPADOS', async () => {
    const tx = createMockTx({
      isCustomHoursEnabled: false,
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      blockedTimes: [{ startMinute: 600, endMinute: 780 }], // 10:00 - 13:00
      professionalBlockedTimes: [{ startMinute: 720, endMinute: 900 }] // 12:00 - 15:00
    });

    const result = await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    // El motor actual no fusiona los intervalos, simplemente devuelve ambos
    expect(result.blocks).toEqual([
      { startMinute: 600, endMinute: 780 },
      { startMinute: 720, endMinute: 900 }
    ]);
  });

  it('13. TEST: PROFESSIONAL BLOCK DE OTRO PROFESIONAL', async () => {
    // Si pasamos un professionalId diferente, el mock (que simula la query real) no deberia devolver los bloques
    // Creamos el tx configurado para "prof-1", pero pedimos disponibilidad para "prof-2"
    const tx = createMockTx({
      isCustomHoursEnabled: false,
      businessHours: [{ startMinute: 540, endMinute: 1080 }],
      professionalBlockedTimes: [{ startMinute: 780, endMinute: 900 }]
    });

    // Simulamos que el professional existe en la DB pero los bloques eran de otro. 
    // Para simplificar, simplemente verificamos que findMany reciba el professionalId correcto.
    const getSpy = vi.spyOn(tx.professionalBlockedTime, 'findMany');
    
    await getEffectiveAvailability(tx, businessId, professionalId, dayOfWeek, exactDateAtMidnight);
    
    expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ professionalId })
    }));
  });
});

describe('Availability Pure Functions', () => {
  describe('isTimeWithinHours', () => {
    const hours = [{ startMinute: 540, endMinute: 1080 }]; // 09:00 - 18:00

    it('A. intervalo completamente dentro -> true', () => {
      expect(isTimeWithinHours(600, 660, hours)).toBe(true); // 10:00 - 11:00
    });

    it('B. intervalo exactamente igual al horario -> true', () => {
      expect(isTimeWithinHours(540, 1080, hours)).toBe(true); // 09:00 - 18:00
    });

    it('C. empieza antes -> false', () => {
      expect(isTimeWithinHours(480, 600, hours)).toBe(false); // 08:00 - 10:00
    });

    it('D. termina despues -> false', () => {
      expect(isTimeWithinHours(1000, 1140, hours)).toBe(false); // 16:40 - 19:00
    });
  });

  describe('isTimeBlocked', () => {
    const blocks = [{ startMinute: 600, endMinute: 660 }]; // 10:00 - 11:00

    it('E. overlap parcial con bloqueo -> true', () => {
      expect(isTimeBlocked(570, 630, blocks)).toBe(true); // 09:30 - 10:30
      expect(isTimeBlocked(630, 690, blocks)).toBe(true); // 10:30 - 11:30
    });

    it('F. sin overlap -> false', () => {
      expect(isTimeBlocked(540, 600, blocks)).toBe(false); // 09:00 - 10:00
      expect(isTimeBlocked(660, 720, blocks)).toBe(false); // 11:00 - 12:00
    });

    it('G. intervalo exactamente igual al bloqueo -> true', () => {
      expect(isTimeBlocked(600, 660, blocks)).toBe(true); // 10:00 - 11:00
    });
    
    it('H. bloqueo engloba todo el intervalo -> true', () => {
      expect(isTimeBlocked(615, 645, blocks)).toBe(true); // 10:15 - 10:45
    });
  });
});
