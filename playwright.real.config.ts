import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const source = process.env.CHATFLOW_REAL_EXPORT;
if (!source || !existsSync(source)) {
  throw new Error(
    'Set CHATFLOW_REAL_EXPORT to an existing local official ZIP/JSON export. No synthetic fallback is used.',
  );
}

export default defineConfig({
  testDir: './tests/real',
  workers: 1,
  timeout: 120_000,
  reporter: 'line',
  preserveOutput: 'never',
  outputDir: './test-results/private-real-export',
  use: { headless: true, screenshot: 'off', trace: 'off', video: 'off' },
});
