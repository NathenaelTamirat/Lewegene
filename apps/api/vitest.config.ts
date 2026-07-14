import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@melue/db': path.resolve(__dirname, '../db/src'),
      '@melue/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
