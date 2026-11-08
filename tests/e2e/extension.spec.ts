import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from '../fixtures/extension';

test('production package retains the bundled dependency license and attribution', async () => {
  const license = await readFile(resolve('node_modules', 'fflate', 'LICENSE'), 'utf8');
  const metadata = JSON.parse(
    await readFile(resolve('node_modules', 'fflate', 'package.json'), 'utf8'),
  );
  const notices = await readFile(resolve('dist', 'THIRD_PARTY_NOTICES.txt'), 'utf8');
  expect(notices).toContain(`fflate ${metadata.version}`);
  expect(notices).toContain(license.trim());
});

test('production MV3 package runs offline under its real extension CSP', async ({
  extensionPage: page,
}) => {
  const serviceWorker = page.context().serviceWorkers()[0]!;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
});
