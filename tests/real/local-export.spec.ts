import { expect } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { createHash } from 'node:crypto';
import { strFromU8, unzipSync } from 'fflate';
import { test } from '../fixtures/extension';
import { importBytes, IMPORT_LIMITS } from '../../src/importer/archive';

test('local official export imports, persists, and exports every message with verified checksums', async ({
  extensionPage: page,
}) => {
  const path = process.env.CHATFLOW_REAL_EXPORT;
  if (!path) throw new Error('A real local official export is required.');
  if ((await stat(path)).size > IMPORT_LIMITS.inputBytes)
    throw new Error('Real export exceeds the documented import safety budget.');
  const source = await readFile(path);
  const extension = extname(path).toLowerCase() === '.zip' ? '.zip' : '.json';
  const safeName = `private-official-export${extension}`;
  const expected = await importBytes(new Uint8Array(source), safeName);
  const expectedMessages = expected.conversations.reduce(
    (sum, chat) => sum + chat.messages.length,
    0,
  );
  if (!expected.conversations.length || !expectedMessages)
    throw new Error('Real-data validation requires at least one conversation and one message.');
  try {
    await page.locator('#import-file').setInputFiles({
      name: safeName,
      mimeType: extension === '.zip' ? 'application/zip' : 'application/json',
      buffer: source,
    });
    await expect(page.locator('#chat-count')).toHaveText(
      expected.conversations.length.toLocaleString(),
    );
    await page.locator('#branching').selectOption('all-branches');
    await expect(page.locator('#message-count')).toHaveText(expectedMessages.toLocaleString());
    await page.getByRole('button', { name: 'Select all results' }).click();
    await page.getByRole('button', { name: 'Export selection' }).click();
    await page.locator('#confirm-export').check();
    const ready = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download conversations ZIP' }).click();
    const files = unzipSync(new Uint8Array(await readFile(await (await ready).path())));
    const data = JSON.parse(strFromU8(files['conversations.json']!));
    const manifest = JSON.parse(strFromU8(files['manifest.json']!));
    expect(data.conversations.length).toBe(expected.conversations.length);
    const fingerprints = (messages: { id: string; text: string }[]) =>
      messages.map((message) =>
        createHash('sha256')
          .update(JSON.stringify([message.id, message.text]))
          .digest('hex'),
      );
    for (const [index, chat] of expected.conversations.entries()) {
      expect(fingerprints(data.conversations[index].messages)).toEqual(fingerprints(chat.messages));
    }
    expect(manifest.counts.exportedMessages).toBe(expectedMessages);
    expect(manifest.sourceFingerprint).toBe(createHash('sha256').update(source).digest('hex'));
    expect(manifest.files[0].sha256).toBe(
      createHash('sha256').update(files['conversations.json']!).digest('hex'),
    );
    await page.reload();
    await expect(page.locator('#chat-count')).toHaveText(
      expected.conversations.length.toLocaleString(),
    );
  } finally {
    const clear = page.getByRole('button', { name: 'Clear local data' });
    if (await clear.isEnabled()) {
      await clear.click();
      await page.getByRole('button', { name: 'Clear local snapshot', exact: true }).click();
      await expect(page.locator('#chat-count')).toHaveText('0');
    }
  }
});
