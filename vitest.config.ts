import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/ui/**'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 95 },
    },
  },
});
