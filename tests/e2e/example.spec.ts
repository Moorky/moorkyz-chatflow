import { expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { test } from '../fixtures/extension';

test('example: installed extension imports, searches exact hits, exports full selected chat and restores', async ({
  extensionPage: page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const source = await readFile(resolve('tests', 'fixtures', 'example-conversations.json'));
  await page.locator('#import-file').setInputFiles({
    name: 'example-conversations.json',
    mimeType: 'application/json',
    buffer: source,
  });
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#message-count')).toHaveText('6');
  await page.getByLabel('Search query', { exact: true }).fill('"rollback plan"');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('#hit-count')).toHaveText('1 / 2');
  await page.locator('.open-chat').click();
  await expect(page.locator('.matched-message')).toContainText('example-answer');
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(page.locator('.matched-message')).toContainText('example-follow-up');
  await page.getByRole('button', { name: 'Previous match' }).click();
  await expect(page.locator('.matched-message')).toContainText('example-answer');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Select all results' }).click();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.locator('.source-list li')).toHaveCount(1);
  await expect(page.locator('#action-body')).toContainText('4 messages');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Export selection' }).click();
  await page.locator('#confirm-export').check();
  const ready = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download conversations ZIP' }).click();
  const download = await ready;
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  const data = JSON.parse(strFromU8(files['conversations.json']!));
  expect(data.conversations).toHaveLength(1);
  expect(data.conversations[0].messages.map((message: { id: string }) => message.id)).toEqual([
    'example-prompt',
    'example-answer',
    'example-follow-up',
    'example-final',
  ]);
  expect(data.conversations[0].messages.at(-1).text).toBe(
    'Yes. Validate the local backup before migration.',
  );
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  expect(manifest.sourceFingerprint).toBe(createHash('sha256').update(source).digest('hex'));
  expect(manifest.counts.exportedMessages).toBe(4);
  expect(manifest.files[0].sha256).toBe(
    createHash('sha256').update(files['conversations.json']!).digest('hex'),
  );
  await page.reload();
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#message-count')).toHaveText('6');
  await page.locator('#branching').selectOption('all-branches');
  await expect(page.locator('#message-count')).toHaveText('7');
  await page.getByLabel('Search query', { exact: true }).fill('immediately');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('#hit-count')).toHaveText('1 / 1');
  await page.locator('#branching').selectOption('active-path');
  await expect(page.locator('#results')).toContainText('No matches in this local snapshot.');
  expect(errors).toEqual([]);
});

for (const kind of ['conversations', 'statistics'] as const) {
  for (const format of ['json', 'csv', 'html', 'txt'] as const) {
    test(`installed extension downloads ${kind} in ${format} after explicit approval`, async ({
      extensionPage: page,
    }) => {
      await page
        .locator('#import-file')
        .setInputFiles(resolve('tests', 'fixtures', 'example-conversations.json'));
      await expect(page.locator('#chat-count')).toHaveText('2');
      await page.getByRole('button', { name: 'Select all results' }).click();
      await page
        .getByRole('button', {
          name: kind === 'conversations' ? 'Export selection' : 'Statistics',
          exact: true,
        })
        .click();
      await page.locator('#export-format').selectOption(format);
      const downloadButton = page.getByRole('button', { name: `Download ${kind} ZIP` });
      await expect(downloadButton).toBeDisabled();
      await page.locator('#confirm-export').check();
      const ready = page.waitForEvent('download');
      await downloadButton.click();
      const files = unzipSync(new Uint8Array(await readFile(await (await ready).path())));
      expect(Object.keys(files)).toContain(`${kind}.${format}`);
      const manifest = JSON.parse(strFromU8(files['manifest.json']!));
      expect(manifest.counts).toMatchObject({
        selectedChats: 2,
        exportedChats: 2,
        exportedMessages: 6,
      });
      const report = strFromU8(files[`${kind}.${format}`]!);
      expect(report).toContain('example-migration');
      expect(report).toContain('example-dinner');
    });
  }
}
