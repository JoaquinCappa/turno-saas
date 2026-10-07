import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicListableBusinesses } from '../src/lib/publicBusinesses';

describe('getPublicListableBusinesses', () => {
  const mockDb = {
    business: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runWithBusinesses = async (businesses: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    mockDb.business.findMany.mockResolvedValue(businesses);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getPublicListableBusinesses(mockDb as any);
  };

  it('1. Business activo + OWNER con email -> aparece', async () => {
    const result = await runWithBusinesses([
      {
        id: 'biz-1',
        name: 'Biz 1',
        users: [{ email: 'owner@test.com' }],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('biz-1');
  });

  it('2. Business activo + OWNER sin email -> no aparece', async () => {
    const result = await runWithBusinesses([
      {
        id: 'biz-1',
        name: 'Biz 1',
        users: [{ email: null }],
      },
      {
        id: 'biz-2',
        name: 'Biz 2',
        users: [{ email: undefined }],
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('3. Business activo + solamente ADMIN con email -> no aparece (rechazado por la query)', async () => {
    // La DB (findMany simulada) deberia filtrar por role: 'OWNER'. Si por alguna
    // razon Prisma devolviera a un admin aqui, el test actual fallaria a nivel filtro JS
    // asumiendo que findMany devuelve los registros. Pero el contrato es que findMany
    // YA habra filtrado y solo incluye 'OWNER' en la lista de users devuelta debido
    // al select interno. 
    // Para ser estrictos con la intencion del test: asumiendo que la query devolvio
    // users vacios porque ningun owner cumplio el select:
    const result = await runWithBusinesses([
      {
        id: 'biz-1',
        name: 'Biz 1',
        users: [], // sin users porque era ADMIN y no matcheo el select de OWNER
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('4. Business inactivo + OWNER con email -> no aparece', async () => {
    // Esto es manejado por la query `isActive: true`, no por el filtro de JavaScript,
    // pero simulamos el resultado de la DB vacia por ese filtro.
    // O si probamos la asuncion JS, deberiamos probar un business con isActive: false.
    // Sin embargo la funcion getPublicListableBusinesses delega a Prisma el `isActive: true`.
    // Validaremos que Prisma reciba los argumentos correctos.
    await runWithBusinesses([]);
    
    expect(mockDb.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          users: {
            some: expect.objectContaining({
              role: 'OWNER',
              email: { not: '' }
            })
          }
        })
      })
    );
  });

  it('5. OWNER con email vacio/whitespace -> no aparece', async () => {
    const result = await runWithBusinesses([
      {
        id: 'biz-1',
        name: 'Biz 1',
        users: [{ email: '' }],
      },
      {
        id: 'biz-2',
        name: 'Biz 2',
        users: [{ email: '   ' }],
      },
      {
        id: 'biz-3',
        name: 'Biz 3',
        users: [{ email: ' \n \t ' }],
      }
    ]);
    expect(result).toHaveLength(0);
  });

  it('el email no es devuelto al cliente (tenant isolation)', async () => {
    const result = await runWithBusinesses([
      {
        id: 'biz-1',
        name: 'Biz 1',
        users: [{ email: 'owner@test.com' }],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('users');
    // @ts-expect-error property does not exist
    expect(result[0].users).toBeUndefined();
  });
});
