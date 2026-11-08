import { defineConfig } from '@playwright/test';

const port = Number(process.env.CHATFLOW_TEST_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('CHATFLOW_TEST_PORT must be an integer between 1 and 65535.');
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL, headless: true },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
