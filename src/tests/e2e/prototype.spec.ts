import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { conversation } from '../fixtures/synthetic';
import AxeBuilder from '@axe-core/playwright';

async function syntheticChatGPT(page: Page) {
  const calls: string[] = [];
  await page.route('https://chatgpt.com/**', async (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname);
    if (url.pathname === '/')
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><title>Synthetic ChatGPT</title><body>Synthetic account only</body></html>',
      });
    if (url.pathname === '/api/auth/session')
      return route.fulfill({
        json: { user: { id: 'synthetic-user' }, accessToken: 'SYNTHETIC-NOT-A-REAL-TOKEN' },
      });
    if (url.pathname === '/backend-api/conversations')
      return route.fulfill({
        json: {
          total: 2,
          items: [
            { id: 'first', title: 'Moorkyz prototype', update_time: 5, gizmo_id: 'g-project' },
            { id: 'second', title: 'Other chat', update_time: 8 },
          ],
        },
      });
    if (url.pathname === '/backend-api/conversation/first')
      return route.fulfill({
        json: {
          ...conversation('first', ['alpha', 'beta'], 'Moorkyz prototype'),
          gizmo_id: 'g-project',
        },
      });
    if (url.pathname === '/backend-api/conversation/second')
      return route.fulfill({ json: conversation('second', ['other'], 'Other chat') });
    return route.abort('blockedbyclient');
  });
  await page.goto('https://chatgpt.com/');
  await page.addScriptTag({ path: resolve('..', 'Extension', 'chatflow-extractor.js') });
  return calls;
}

test('standalone prototype exports, restores checkpoints and hands off a ZIP to the offline app', async ({
  page,
}) => {
  const calls = await syntheticChatGPT(page);
  await expect(page.getByRole('status')).toContainText('No account request');
  expect(calls).toEqual(['/']);
  await page.getByRole('combobox', { name: 'Export mode', exact: true }).selectOption('all');
  await page.getByLabel(/I authorize read-only/).check();
  await page.getByRole('button', { name: 'Start new export', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('completed');
  await expect(page.getByRole('status')).toContainText('Messages: 3');
  const capture = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download available ZIP' }).click();
  const download = await capture;
  const bytes = await readFile(await download.path());
  const files = unzipSync(new Uint8Array(bytes));
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  expect(manifest.counts.exported).toBe(2);
  expect(manifest.completeness).toBe('unverified');
  expect(strFromU8(files['manifest.json']!)).not.toContain('SYNTHETIC-NOT-A-REAL-TOKEN');
  const count = calls.filter((path) => path.startsWith('/backend-api/conversation/')).length;
  await page.reload();
  await page.addScriptTag({ path: resolve('..', 'Extension', 'chatflow-extractor.js') });
  await page.getByLabel(/I authorize read-only/).check();
  await page.getByRole('button', { name: 'Resume / update checkpoint' }).click();
  await expect(page.getByRole('status')).toContainText('completed');
  expect(calls.filter((path) => path.startsWith('/backend-api/conversation/'))).toHaveLength(count);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto('/');
  await page
    .locator('#import-file')
    .setInputFiles({ name: 'synthetic-direct.zip', mimeType: 'application/zip', buffer: bytes });
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#message-count')).toHaveText('3');
});

test('standalone prototype filters titles before fetching bodies and exports exact project membership', async ({
  page,
}) => {
  const calls = await syntheticChatGPT(page);
  await page.getByRole('combobox', { name: 'Export mode', exact: true }).selectOption('keywords');
  await page.getByLabel('Search query', { exact: true }).fill('moor*');
  await page.getByRole('button', { name: 'Advanced expression toolbar' }).click();
  await page.getByRole('combobox', { name: 'Search scope', exact: true }).selectOption('title');
  await page.getByLabel(/I authorize read-only/).check();
  await page.getByRole('button', { name: 'Start new export', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Filtered: 1');
  expect(calls).not.toContain('/backend-api/conversation/second');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('combobox', { name: 'Export mode', exact: true }).selectOption('project');
  await page.getByLabel('Conversation URL / project ID').fill('g-project');
  await page.getByRole('button', { name: 'Start new export', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('completed');
  await expect(page.getByRole('status')).toContainText('Discovered: 1');
  const capture = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download available ZIP' }).click();
  const files = unzipSync(new Uint8Array(await readFile(await (await capture).path())));
  expect(JSON.parse(strFromU8(files['projects/manifest.json']!)).conversationIds).toEqual([
    'first',
  ]);
});

test('offline app offers extractor instructions and reconstructs selected messages without altering originals', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Direct ChatGPT export (experimental)' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'live-account compatibility has not been verified',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download standalone extractor' }).click();
  expect((await download).suggestedFilename()).toBe('chatflow-extractor.js');
  await page.locator('#close-action').click();
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic-reconstruction.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([
        conversation('a', ['first', 'second'], 'Chat A'),
        conversation('b', ['third'], 'Chat B'),
      ]),
    ),
  });

  await expect(page.locator('#chat-count')).toHaveText('2');
  await page.getByRole('button', { name: 'View Chat A', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Include message a-m1 in reconstruction' }).check();
  await page.locator('#close-viewer').click();
  await page.getByRole('button', { name: 'View Chat B', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Include message b-m0 in reconstruction' }).check();
  await page.locator('#close-viewer').click();
  await page.getByRole('button', { name: 'Reconstruct messages (2)', exact: true }).click();
  await page.getByRole('button', { name: 'Move up 2', exact: true }).click();
  await page.getByLabel('Reconstruction title').fill('Combined context');
  await page.getByLabel('I reviewed these messages for private content.').check();
  const capture = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download reconstruction ZIP' }).click();
  const files = unzipSync(new Uint8Array(await readFile(await (await capture).path())));
  const document = JSON.parse(strFromU8(files['reconstruction.json']!));
  expect(document.title).toBe('Combined context');
  expect(document.segments.map((segment: { content: string }) => segment.content)).toEqual([
    'third',
    'second',
  ]);
  expect(document.segments[0].provenance.conversationId).toBe('b');
  await expect(page.locator('#message-count')).toHaveText('3');
  await page.reload();
  await expect(page.locator('#message-count')).toHaveText('3');
  await expect(page.getByRole('button', { name: 'Reconstruct messages (0)' })).toBeDisabled();
});

test('standalone prototype surfaces expired sessions and pauses on rate limits', async ({
  page,
}) => {
  await syntheticChatGPT(page);
  const sessionURL = 'https://chatgpt.com/api/auth/session';
  await page.route(sessionURL, (route) => route.fulfill({ status: 401, body: '' }));
  await page.getByLabel('Conversation URL / project ID').fill('first');
  await page.getByLabel(/I authorize read-only/).check();
  await page.getByRole('button', { name: 'Start new export', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sign in');
  await page.unroute(sessionURL);
  await page.route('https://chatgpt.com/backend-api/conversation/first', (route) =>
    route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, body: '' }),
  );
  await page.getByRole('button', { name: 'Start new export', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('paused');
  await expect(page.getByRole('alert')).toContainText('rate limit');
  await expect(page.getByRole('button', { name: 'Resume / update checkpoint' })).toBeEnabled();
});

test('standalone controls remain readable, responsive and accessible in both themes', async ({
  page,
}, testInfo) => {
  await syntheticChatGPT(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await page
      .getByRole('region', { name: 'ChatFlow direct extraction prototype' })
      .boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`extractor-${colorScheme}.png`),
      fullPage: true,
    });
  }
});
