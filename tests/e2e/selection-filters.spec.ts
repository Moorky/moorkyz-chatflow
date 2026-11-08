import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { conversation } from '../fixtures/synthetic';

test('all result chats remain selectable beyond the rendered page, with deterministic N selection', async ({
  page,
}) => {
  await page.goto('/');
  const chats = Array.from({ length: 45 }, (_, i) =>
    conversation(
      `chat-${String(i).padStart(3, '0')}`,
      ['needle'],
      `Chat ${String(i).padStart(3, '0')}`,
    ),
  );
  await page.locator('#import-file').setInputFiles({
    name: 'selection-example.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(chats)),
  });
  await expect(page.locator('#chat-count')).toHaveText('45');
  await expect(page.locator('.chat-card')).toHaveCount(40);
  await page.getByRole('button', { name: 'Select all results' }).click();
  await expect(page.locator('#selected-count')).toHaveText('45');
  await page.getByRole('button', { name: 'Show more chats' }).click();
  await expect(page.locator('.chat-card')).toHaveCount(45);
  await expect(page.locator('.chat-card input:checked')).toHaveCount(45);
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await page.locator('#sort').selectOption('title');
  await page.locator('#select-count').fill('3');
  await page.getByRole('button', { name: 'Last N', exact: true }).click();
  await expect(page.locator('#selected-count')).toHaveText('3');
  for (const id of ['042', '043', '044']) {
    await expect(
      page.getByRole('checkbox', { name: `Select Chat ${id}`, exact: true }),
    ).toBeChecked();
  }
  await page.locator('#select-count').fill('0');
  await page.getByRole('button', { name: 'First N', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('positive whole number');
  await expect(page.locator('#selected-count')).toHaveText('3');
  await page.getByLabel('Search query', { exact: true }).fill('absent');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('.chat-card')).toHaveCount(0);
  await expect(page.locator('#selected-count')).toHaveText('3');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.locator('.source-list li')).toHaveCount(3);
});

test('role, case and UTC date filters update counts and recover after an invalid interval', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('#import-file')
    .setInputFiles(resolve('tests', 'fixtures', 'example-conversations.json'));
  await expect(page.locator('#chat-count')).toHaveText('2');
  await page.locator('#fields').selectOption('text');
  await page.getByLabel('Search query', { exact: true }).fill('rollback');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('#hit-count')).toHaveText('1 / 2');
  await page.getByText('More filters', { exact: true }).click();
  await page.locator('#role').selectOption('user');
  await expect(page.locator('#hit-count')).toHaveText('1 / 1');
  await page.locator('#case-sensitive').check();
  await page.getByText('More filters', { exact: true }).click();
  await page.getByLabel('Search query', { exact: true }).fill('ROLLBACK');
  await page.getByRole('button', { name: 'Search library' }).click();
  await expect(page.locator('.chat-card')).toHaveCount(0);
  await page.getByText('More filters', { exact: true }).click();
  await page.locator('#case-sensitive').uncheck();
  await page.locator('#date-from').fill('2030-01-02');
  await page.locator('#date-to').fill('2030-01-01');
  await expect(page.getByRole('alert')).toContainText('end date must be after');
  await page.locator('#date-from').fill('');
  await page.locator('#date-to').fill('');
  await expect(page.locator('#hit-count')).toHaveText('1 / 1');
  await expect(page.getByRole('alert')).not.toBeVisible();
});
