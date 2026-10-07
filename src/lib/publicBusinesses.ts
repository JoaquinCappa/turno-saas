import type { PrismaClient } from '@prisma/client';

/**
 * Negocios listables en la home publica.
 *
 * Regla: el Business debe estar activo y tener al menos un User con role OWNER y email real.
 * - User.email es `String @unique` (no nullable) en el schema, por lo que "email no nulo" se expresa como
 *   `email: { not: '' }` (un `not: null` no es valido en Prisma para un campo requerido).
 * - Prisma no soporta trim() en filtros: los emails compuestos solo por espacios se descartan despues de la
 *   consulta, sobre los emails de los OWNER. Los emails NUNCA se devuelven al caller.
 * - No recibe ningun parametro del cliente: el criterio es fijo, no hay forma de cruzar tenants.
 */
export async function getPublicListableBusinesses(db: Pick<PrismaClient, 'business'>) {
  const businesses = await db.business.findMany({
    where: {
      isActive: true,
      users: {
        some: {
          role: 'OWNER',
          email: { not: '' }
        }
      }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      services: {
        where: { isActive: true },
        select: { id: true, name: true, price: true, duration: true },
        take: 3
      },
      // Solo para validar el email del OWNER; se elimina antes de devolver.
      users: {
        where: { role: 'OWNER' },
        select: { email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return businesses
    .filter(biz => biz.users.some(owner => typeof owner.email === 'string' && owner.email.trim().length > 0))
    .map(({ users: _owners, ...publicBusiness }) => {
      void _owners;
      return publicBusiness;
    });
}
