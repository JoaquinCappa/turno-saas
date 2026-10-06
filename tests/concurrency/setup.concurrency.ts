import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('ABORT: TEST_DATABASE_URL no est definida. Requerida para tests de concurrencia.');
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(testDatabaseUrl);
} catch {
  throw new Error('ABORT: TEST_DATABASE_URL no es una URL vlida.');
}

if (parsedUrl.pathname !== '/turnos_saas_test') {
  throw new Error(`ABORT: Base de datos no autorizada. Esperado /turnos_saas_test, recibido ${parsedUrl.pathname}`);
}

if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
  throw new Error(`ABORT: Host no autorizado. Esperado localhost o 127.0.0.1, recibido ${parsedUrl.hostname}`);
}

if (process.env.DATABASE_URL) {
  // Para evitar ambiguedad, si est definido DATABASE_URL y TEST_DATABASE_URL en el mismo proceso de tests de concurrencia, 
  // es preferible pisar explcitamente o rechazar.
  console.warn('WARNING: DATABASE_URL est definida en el entorno. Se ignorar y se usar TEST_DATABASE_URL exclusivamente.');
}

// Sobreescribir env local para Prisma si algun otro modulo hace `new PrismaClient()` directamente.
process.env.DATABASE_URL = testDatabaseUrl;

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 10 });
const adapter = new PrismaPg(pool);

export const testPrisma = new PrismaClient({ adapter });

// Inyectamos el mock global para que todas las acciones usen testPrisma
vi.mock('@/lib/prisma', () => ({
  default: testPrisma,
}));

beforeAll(async () => {
  try {
    await testPrisma.$connect();
  } catch (e) {
    throw new Error(`ABORT: No se pudo conectar a la base de datos de test. Verifique que exista y tenga las migraciones. Error: ${e}`);
  }
});

beforeEach(async () => {
  // Truncar tablas importantes respetando FKs
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Booking", "ProfessionalBlockedTime", "ProfessionalHour", "Professional", "Customer", "Service", "BusinessHour", "Business" RESTART IDENTITY CASCADE;
  `);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
