import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['tests/concurrency/**/*.test.ts'],
    setupFiles: ['./tests/concurrency/setup.concurrency.ts'],
    fileParallelism: false, // Evita truncar la misma BD desde distintos archivos
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
