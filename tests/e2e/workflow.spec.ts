import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { conversation } from '../fixtures/synthetic';

test('imports, distinguishes search scope, navigates hits, persists, exports and clears', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Browser tests require the configured loopback base URL.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const outbound: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL) && !request.url().startsWith('blob:')) {
      outbound.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Search library' })).toBeDisabled();
  const fixture = [
    conversation('split', ['alpha alpha', 'beta']),
    conversation('together', ['alpha beta', 'A little context after the match']),
  ];
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic-conversations.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#message-count')).toHaveText('4');
  await page.getByLabel('Search query', { exact: true }).fill('alpha AND beta');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('.chat-card')).toHaveCount(1);
  await page.locator('#scope').selectOption('conversation');
  await expect(page.locator('.chat-card')).toHaveCount(2);
  await expect(page.locator('#hit-count')).toHaveText('2 / 3');
  await page.getByRole('checkbox', { name: 'Hide previews' }).check();
  await expect(page.locator('.chat-preview').first()).toContainText('Preview hidden');
  await page.locator('.open-chat').first().click();
  await expect(page.getByRole('dialog', { name: 'Synthetic conversation' })).toBeVisible();
  await expect(page.locator('.matched-message')).toContainText('split-m0');
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(page.locator('.matched-message')).toContainText('split-m1');
  await expect(page.locator('#viewer-position')).toHaveText('Message hit 2 of 2');
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  await page.getByRole('button', { name: 'Select all results' }).click();
  await expect(page.locator('#selected-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.locator('.source-list li')).toHaveCount(2);
  await expect(page.locator('#action-body')).toContainText('4 messages');
  await expect(page.locator('#action-body')).toContainText('Roles:');
  await page.locator('#close-action').click();
  await page.getByRole('button', { name: 'Export selection' }).click();
  await expect(page.getByRole('button', { name: 'Download conversations ZIP' })).toBeDisabled();
  await page.locator('#confirm-export').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download conversations ZIP' }).click();
  const download = await downloadPromise;
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  const exported = JSON.parse(strFromU8(files['conversations.json']!));
  expect(exported.conversations).toHaveLength(2);
  expect(exported.conversations[0].messages).toHaveLength(2);
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  expect(manifest.counts.exportedMessages).toBe(4);
  expect(manifest.selection.filter.scope).toBe('conversation');
  await page.reload();
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#selected-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Clear local data' }).click();
  await page.getByRole('button', { name: 'Clear local snapshot', exact: true }).click();
  await expect(page.locator('#chat-count')).toHaveText('0');
  await page.reload();
  await expect(page.locator('#welcome')).toBeVisible();
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});

test('failed imports preserve the committed snapshot and query errors are explicit', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await page.locator('#import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid JSON');
  await expect(page.locator('#chat-count')).toHaveText('4');
  await page.reload();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await page.getByLabel('Search query', { exact: true }).fill('role:user');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.getByRole('alert')).toContainText('Field syntax is not supported');
  await expect(page.locator('.chat-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Select all results' })).toBeDisabled();
  await page.getByLabel('Search query', { exact: true }).fill('missing-unicorn-phrase');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('#results')).toContainText('No matches in this local snapshot.');
  await expect(page.locator('#results')).toContainText(
    'This does not mean the chat is absent from your account.',
  );
});

test('ZIP segment import, selected scope and message pagination do not lose hits', async ({
  page,
}) => {
  const archive = zipSync({
    'conversations-1.json': strToU8(
      JSON.stringify([
        conversation(
          'long',
          Array.from({ length: 130 }, (_, i) => `needle ${i}`),
          'Long chat',
        ),
      ]),
    ),
    'conversations-2.json': strToU8(
      JSON.stringify([conversation('short', ['other'], 'Short chat')]),
    ),
  });
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(archive),
  });
  await expect(page.locator('#message-count')).toHaveText('131');
  await page.getByRole('checkbox', { name: 'Select Long chat', exact: true }).check();
  await page.getByText('More filters', { exact: true }).click();
  await page.locator('#within-selection').check();
  await page.getByText('More filters', { exact: true }).click();
  await expect(page.locator('.chat-card')).toHaveCount(1);
  await page.getByLabel('Search query', { exact: true }).fill('needle');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('#hit-count')).toHaveText('1 / 130');
  await page.locator('.open-chat').click();
  await expect(page.locator('#viewer-page')).toHaveText('Messages 1-60 of 130');
  await page.getByRole('button', { name: 'Next messages' }).click();
  await expect(page.locator('#viewer-page')).toHaveText('Messages 61-120 of 130');
  await page.getByRole('button', { name: 'Next messages' }).click();
  await expect(page.locator('#viewer-page')).toHaveText('Messages 121-130 of 130');
  await expect(page.locator('#viewer-messages')).toContainText('long-m129');
});

test('damaged local snapshots can be explicitly cleared instead of trapping recovery', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('moorkyz-chatflow', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('snapshots', 'readwrite');
        transaction
          .objectStore('snapshots')
          .put({ schemaVersion: 1, conversations: [null] }, 'current');
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('damaged local snapshot');
  await expect(page.getByRole('button', { name: 'Clear local data' })).toBeEnabled();
  await page.getByRole('button', { name: 'Clear local data' }).click();
  await page.getByRole('button', { name: 'Clear local snapshot', exact: true }).click();
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeVisible();
});

test('untrusted content is inert and layout fits narrow and dark viewports', async ({ page }) => {
  const hostile = '<img src=x onerror="globalThis.chatflowCompromised=true">';
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([conversation('hostile', [hostile], hostile)])),
  });
  await expect(page.locator('#chat-count')).toHaveText('1');
  await expect(page.locator('.chat-title')).toContainText(hostile);
  expect(await page.locator('.chat-card img').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.open-chat').click();
  await expect(page.locator('#viewer-messages')).toContainText(hostile);
  expect(await page.locator('#viewer img').count()).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).not.toBeVisible();
});

test('four viewport widths, keyboard search and live result announcements remain usable', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByText('More filters', { exact: true }).click();
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [
        ...document.querySelectorAll(
          '.advanced-fields, .advanced-fields label, .advanced-fields input',
        ),
      ].map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent,
          left: bounds.left,
          right: bounds.right,
        };
      }),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
    await page.getByText('More filters', { exact: true }).click();
  }
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const contrast = await page.locator('#import-button').evaluate((button) => {
      const style = getComputedStyle(button);
      const luminance = (color: string) => {
        const channels = color
          .match(/\d+/g)!
          .slice(0, 3)
          .map((part) => {
            const value = Number(part) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
      };
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`library-${colorScheme}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel('Search query', { exact: true }).focus();
  await page.keyboard.type('migration');
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toContainText('1 matching chats');
  await expect(page.locator('#status')).toHaveAttribute('aria-live', 'polite');
  await page.locator('.chat-title').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).not.toBeVisible();
  await expect(page.locator('.chat-title')).toBeFocused();
});

test('clearing local data also refreshes other open ChatFlow tabs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  const other = await page.context().newPage();
  await other.goto('/');
  await expect(other.locator('#chat-count')).toHaveText('4');
  await page.getByRole('button', { name: 'Clear local data' }).click();
  await page.getByRole('button', { name: 'Clear local snapshot', exact: true }).click();
  await expect(other.locator('#chat-count')).toHaveText('0');
  await expect(other.locator('#welcome')).toBeVisible();
});
