import { chromium, test as base } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export const test = base.extend<{ extensionPage: Page }>({
  extensionPage: async ({ browserName }, use) => {
    if (browserName !== 'chromium') throw new Error('The MV3 fixture requires Chromium.');
    const profile = await mkdtemp(join(tmpdir(), 'chatflow-extension-test-'));
    let context: BrowserContext | undefined;
    try {
      const extension = resolve('dist');
      context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium',
        headless: true,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      });
      const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
      const page = await context.newPage();
      await page.goto(`chrome-extension://${new URL(worker.url()).host}/index.html`);
      await use(page);
    } finally {
      await context?.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});
