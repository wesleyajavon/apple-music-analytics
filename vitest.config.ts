import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    isolate: true,
    setupFiles: ['./vitest.setup.ts'],
    // Sequential files avoid fork/worker issues with heavy Next route imports; keeps module mocks deterministic.
    fileParallelism: false,
    maxWorkers: 1,
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/',
      '**/e2e/**', // Exclure les tests Playwright E2E
      '__tests__/e2e/**', // Exclure les tests Playwright E2E (pattern alternatif)
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'], // lcov pour GitHub Actions
      exclude: [
        'node_modules/',
        'generated/',
        '**/*.config.{js,ts}',
        '**/prisma/**',
        '**/scripts/**',
        '**/*.d.ts',
        '__tests__/e2e/**', // Exclure les tests Playwright E2E de la couverture
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
});

