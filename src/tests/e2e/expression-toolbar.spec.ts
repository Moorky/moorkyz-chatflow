import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { conversation } from '../fixtures/synthetic';

test('toolbar inserts at the caret, wraps selections and retains input focus', async ({ page }) => {
  await page.goto('/');
  const query = page.getByLabel('Search query', { exact: true });
  const toggle = page.getByRole('button', { name: 'Advanced expression toolbar' });
  const tools = page.getByRole('group', { name: 'Expression tools', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(tools).toBeHidden();
  await expect(page.locator('.expression-field').locator('input, button')).toHaveCount(2);
  await query.fill('alpha beta');
  await query.evaluate((input: HTMLInputElement) => input.setSelectionRange(5, 5));
  await toggle.click();
  await expect
    .poll(() =>
      page.locator('.expression-chevron').evaluate((chevron) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(chevron).transform);
        return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
      }),
    )
    .toBeCloseTo(90, 0);
  await tools.getByRole('button', { name: 'Insert AND', exact: true }).click();
  await expect(query).toHaveValue('alpha AND beta');
  await expect(query).toBeFocused();
  expect(await query.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(10);

  await query.evaluate((input: HTMLInputElement) => input.setSelectionRange(10, 14));
  await tools.getByRole('button', { name: 'Insert " "', exact: true }).click();
  await expect(query).toHaveValue('alpha AND "beta"');
  await expect(query).toBeFocused();
  await tools.getByRole('button', { name: 'Insert ( )', exact: true }).click();
  await expect(query).toHaveValue('alpha AND "(beta)"');

  await page.getByRole('button', { name: 'Clear expression', exact: true }).click();
  await tools.getByRole('button', { name: 'Insert ( )', exact: true }).click();
  await expect(query).toHaveValue('()');
  expect(await query.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(1);
  await query.press('m');
  await expect(query).toHaveValue('(m)');
  await expect(query).toHaveAttribute('aria-invalid', 'false');
  await expect(tools.getByRole('button', { name: 'Insert OR', exact: true })).toHaveAttribute(
    'title',
    'Match either term: evidence OR chatflow.',
  );
});

test('validation, suggestions and all controls work with keyboard input', async ({ page }) => {
  await page.goto('/');
  const query = page.getByLabel('Search query', { exact: true });
  const toggle = page.getByRole('button', { name: 'Advanced expression toolbar' });
  const next = page.getByRole('group', { name: 'Suggested next expressions' });
  await query.fill('alpha AND');
  await expect(query).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.expression-feedback')).toContainText('Add a keyword');
  await query.press('Alt+ArrowDown');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(next.getByRole('button', { name: 'Insert " "', exact: true })).toBeVisible();
  await query.fill('"alpha');
  await expect(next.getByRole('button', { name: 'Insert Close quote', exact: true })).toBeVisible();
  await next.getByRole('button', { name: 'Insert Close quote', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(query).toHaveValue('"alpha"');
  await expect(query).toBeFocused();
  await expect(query).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('.expression-feedback')).toBeHidden();
  await query.press('Tab');
  await expect(toggle).toBeFocused();
  await query.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(next).toBeHidden();
  await expect(query).toHaveValue('"alpha"');
  await query.press('Alt+ArrowDown');
  await query.press('Alt+ArrowUp');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(query).toBeFocused();
});

test('scope survives collapse, wildcards execute, and clear/reset have distinct behavior', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic-toolbar.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([
        conversation('title', ['unrelated'], 'moorkyz-title'),
        conversation('body', ['moorkyz-body', 'evidence'], 'Another title'),
      ]),
    ),
  });
  await expect(page.locator('#chat-count')).toHaveText('2');
  const query = page.getByLabel('Search query', { exact: true });
  const toggle = page.getByRole('button', { name: 'Advanced expression toolbar' });
  await toggle.click();
  await page.getByRole('combobox', { name: 'Search scope', exact: true }).selectOption('title');
  await query.fill('moorkyz');
  await page
    .getByRole('group', { name: 'Expression tools', exact: true })
    .getByRole('button', { name: 'Insert *', exact: true })
    .click();
  await expect(query).toHaveValue('moorkyz*');
  await toggle.click();
  await query.press('Enter');
  await expect(page.locator('.chat-title')).toHaveText(['moorkyz-title']);
  await toggle.click();
  await expect(page.getByRole('combobox', { name: 'Search scope', exact: true })).toHaveValue(
    'title',
  );
  await page.getByRole('combobox', { name: 'Search scope', exact: true }).selectOption('both');
  await expect(page.locator('.chat-card')).toHaveCount(2);
  await page.locator('#scope').selectOption('conversation');
  await page.locator('#branching').selectOption('all-branches');
  await page.getByRole('button', { name: 'Select all results' }).click();
  await page.getByRole('button', { name: 'Clear expression', exact: true }).click();
  await expect(query).toHaveValue('');
  await expect(query).toBeFocused();
  await expect(page.locator('#scope')).toHaveValue('conversation');
  await expect(page.locator('#branching')).toHaveValue('all-branches');
  await page.getByRole('button', { name: 'Reset search', exact: true }).click();
  await expect(query).toBeFocused();
  await expect(page.locator('#scope')).toHaveValue('message');
  await expect(page.locator('#branching')).toHaveValue('active-path');
  await expect(page.locator('#fields')).toHaveValue('both');
  await expect(page.locator('#selected-count')).toHaveText('2');
});

test('expanded toolbar fits responsive layouts and passes accessibility checks in both themes', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Advanced expression toolbar' }).click();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await expect(page.locator('.expression-panel')).toHaveCSS('transition-duration', '0s');
    await page.getByLabel('Search query', { exact: true }).fill('(evidence OR chatflow) AND');
    await expect(page.locator('.expression-feedback')).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      scan.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
    await page
      .locator('.search-panel')
      .screenshot({ path: testInfo.outputPath(`toolbar-${colorScheme}.png`) });
  }
});
