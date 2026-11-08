import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { conversation } from '../fixtures/synthetic';

async function seriousViolations(page: Page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return report.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
}

test('first run explains import, labels the synthetic demo and reports failures honestly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '+ Import ChatGPT export' })).toBeVisible();
  await expect(page.locator('#import-hint')).toHaveText('ZIP or JSON · processed on this device');
  await expect(page.locator('.export-guide ol')).toBeHidden();
  await page.getByText('How to get your export', { exact: true }).click();
  await expect(page.locator('.export-guide ol')).toContainText(
    'Settings → Data controls → Export data',
  );
  await expect(page.locator('.export-guide')).toContainText('128 MiB per file');
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#demo-banner')).toBeHidden();

  await page.locator('#import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid JSON');
  await expect(page.locator('#status')).toHaveText(
    'Import failed. Nothing was saved; choose a supported export file to try again.',
  );

  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await expect(page.locator('#demo-banner')).toBeVisible();
  await expect(page.locator('#demo-banner')).toContainText('not your ChatGPT history');
  await expect(page.locator('#import-hint')).toContainText('Replaces this local library only');
  await page.reload();
  await expect(page.locator('#demo-banner')).toBeVisible();

  await page.locator('#import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.locator('#status')).toHaveText(
    'Import failed. The previous local library was preserved.',
  );
  await expect(page.locator('#chat-count')).toHaveText('4');
  await expect(page.locator('#demo-banner')).toBeVisible();

  // A user file that merely reuses the demo filename is not labelled as demo data.
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic-demo-conversations.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([conversation('own-chat', ['my own words'])])),
  });
  await expect(page.locator('#chat-count')).toHaveText('1');
  await expect(page.locator('#demo-banner')).toBeHidden();
  expect(errors).toEqual([]);
});

test('search help and no-result explanations are disclosed progressively', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await expect(page.locator('.search-help-body')).toBeHidden();
  await page.getByText('How search works', { exact: true }).click();
  await expect(page.locator('.search-help-body')).toContainText('Anywhere in chat');
  await expect(page.locator('.search-help-body')).toContainText('All branches');
  await expect(page.locator('.search-help-body')).toContainText('Text occurrences');

  await page.locator('#branching').selectOption('all-branches');
  await page.locator('#fields').selectOption('text');
  await page.getByText('More filters', { exact: true }).click();
  await page.locator('#role').selectOption('assistant');
  await page.getByText('More filters', { exact: true }).click();
  await page.getByLabel('Search query', { exact: true }).fill('missing-unicorn-phrase');
  await page.getByRole('button', { name: 'Search library' }).click();
  const empty = page.locator('#results .empty-state');
  await expect(empty).toContainText('No matches in this local snapshot.');
  await expect(empty).toContainText('query “missing-unicorn-phrase”');
  await expect(empty).toContainText('same message · messages only · all branches · role assistant');
  await expect(empty).toContainText('Source: synthetic-demo-conversations.json');
});

test('a committed import refreshes the inventory even when the retained query is invalid', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Search query', { exact: true }).fill('role:user');
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([conversation('one', ['alpha']), conversation('two', ['beta', 'gamma'])]),
    ),
  });
  await expect(page.getByRole('alert')).toContainText('Field syntax is not supported');
  await expect(page.locator('#chat-count')).toHaveText('2');
  await expect(page.locator('#message-count')).toHaveText('3');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#coverage')).toContainText('Local snapshot: synthetic.json');
});

test('sidebar actions stay reachable in a short desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 400 });
  await page.goto('/');
  const privacy = page.getByRole('button', { name: 'Privacy & limitations' });
  await privacy.scrollIntoViewIfNeeded();
  await expect(privacy).toBeInViewport();
  await privacy.click();
  await expect(page.locator('#action-dialog')).toBeVisible();
  await expect(page.locator('#action-body')).toContainText('not encrypted');
});

test('core screens have no serious or critical automated accessibility violations', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('Ready for your first import');
    expect(await seriousViolations(page), `${colorScheme} first run`).toEqual([]);

    await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
    await expect(page.locator('#chat-count')).toHaveText('4');
    await page.getByLabel('Search query', { exact: true }).fill('migration');
    await page.getByRole('button', { name: 'Search library' }).click();
    await expect(page.locator('.chat-card')).toHaveCount(1);
    await page.getByText('How search works', { exact: true }).click();
    expect(await seriousViolations(page), `${colorScheme} results`).toEqual([]);

    await page.locator('.open-chat').first().click();
    await expect(page.locator('#viewer')).toBeVisible();
    expect(await seriousViolations(page), `${colorScheme} viewer`).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.open-chat').first()).toBeFocused();

    await page.locator('.chat-card input[type=checkbox]').first().check();
    await page.getByRole('button', { name: 'Export selection' }).click();
    await expect(page.locator('#action-dialog')).toBeVisible();
    expect(await seriousViolations(page), `${colorScheme} export review`).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Export selection' })).toBeFocused();

    await page.getByRole('button', { name: 'Clear local data' }).click();
    await page.getByRole('button', { name: 'Clear local snapshot', exact: true }).click();
    await expect(page.locator('#welcome')).toBeVisible();
  }
});
