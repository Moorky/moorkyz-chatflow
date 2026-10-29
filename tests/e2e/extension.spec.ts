import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

test('production package retains the bundled dependency license and attribution', async () => {
  const license = await readFile(resolve('node_modules', 'fflate', 'LICENSE'), 'utf8');
  const metadata = JSON.parse(
    await readFile(resolve('node_modules', 'fflate', 'package.json'), 'utf8'),
  );
  const notices = await readFile(resolve('dist', 'THIRD_PARTY_NOTICES.txt'), 'utf8');
  expect(notices).toContain(`fflate ${metadata.version}`);
  expect(notices).toContain(license.trim());
});

test('production MV3 package runs offline under its real extension CSP', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'chatflow-extension-test-'));
  const extension = resolve('dist');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(serviceWorker.url()).host;
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
    await expect(page.locator('#chat-count')).toHaveText('4');
    await page.getByLabel('Search query', { exact: true }).fill('migration');
    await page.getByRole('button', { name: 'Search library' }).click();
    await expect(page.locator('.chat-card')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('#chat-count')).toHaveText('4');
    expect(await serviceWorker.evaluate('chrome.action.onClicked.hasListeners()')).toBe(true);
    const manifest = await serviceWorker.evaluate<Record<string, unknown>>(
      'chrome.runtime.getManifest()',
    );
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions ?? []).toEqual([]);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
