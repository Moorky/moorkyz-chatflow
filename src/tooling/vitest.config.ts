import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['**/*.ts'],
      exclude: ['ui/**', 'tests/**', 'tooling/**', 'node_modules/**', '**/*.d.ts'],
      reportsDirectory: '../.output/coverage',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
