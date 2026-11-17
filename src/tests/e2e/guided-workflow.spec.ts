import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { strFromU8, unzipSync } from 'fflate';

test('live guide follows demo, search, review, consent and download without skipping confirmation', async ({
  page,
}) => {
  await page.goto('/');
  const guide = page.locator('#library-guide');
  await expect(guide).toContainText('Start with your conversation archive');
  await expect(guide.locator('[aria-current="step"]')).toHaveText('1Add data');
  await guide.getByRole('button', { name: 'Try the guided demo' }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await expect(guide).toContainText('Find the conversation you need');
  await guide.getByRole('button', { name: 'Go to search' }).click();
  await expect(page.locator('#query')).toBeFocused();
  await page.locator('#query').fill('migration*');
  await expect(guide).toContainText('Run your new search');
  await guide.getByRole('button', { name: 'Apply this search' }).click();
  await expect(page.locator('#hit-count')).toHaveText('1 / 2');
  await page.getByRole('button', { name: 'View The migration notebook', exact: true }).click();
  await expect(page.locator('#viewer-guide')).toContainText('Review context');
  await page.getByRole('button', { name: 'Select this chat and return' }).click();
  await expect(page.locator('#viewer')).not.toBeVisible();
  await expect(page.locator('#selected-count')).toHaveText('1');
  await expect(guide).toContainText('Choose how to save your selection');
  await guide.getByRole('button', { name: 'Review selected chats' }).click();
  const review = page.locator('#action-dialog-guide');
  await expect(review).toContainText('Review, then confirm private content');
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#confirm-export').check();
  await expect(review).toContainText('Ready for your download');
  await review.getByRole('button', { name: 'Go to the download button' }).click();
  await expect(page.locator('#download')).toBeFocused();
  await expect(page.locator('#action-dialog')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.locator('#download').click();
  const files = unzipSync(new Uint8Array(await readFile(await (await pending).path())));
  expect(JSON.parse(strFromU8(files['manifest.json']!)).counts.exportedMessages).toBe(3);
  await expect(guide).toHaveAttribute('data-tone', 'success');
  await expect(guide).toContainText('Your download is prepared');
  await expect(guide).toContainText('browser');
  await expect(guide.locator('[aria-current="step"]')).toHaveAttribute(
    'aria-label',
    'Save a copy: current',
  );
  await guide.getByRole('button', { name: 'Keep exploring' }).click();
  await expect(page.locator('#query')).toBeFocused();
});

test('guide adapts to invalid expressions, no results and an emptied message collection', async ({
  page,
}) => {
  await page.goto('/');
  const guide = page.locator('#library-guide');
  await guide.getByRole('button', { name: 'Try the guided demo' }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  await page.locator('#query').fill('alpha AND');
  await expect(guide).toHaveAttribute('data-tone', 'warning');
  await expect(guide).toContainText('Finish your search expression');
  await page.locator('#query').press('Enter');
  await expect(guide).toHaveAttribute('data-tone', 'error');
  await guide.getByRole('button', { name: 'Review search and filters' }).click();
  await expect(page.locator('.advanced')).toHaveAttribute('open', '');
  await page.getByText('More filters', { exact: true }).click();
  await page.locator('#query').fill('missing-unicorn');
  await page.locator('#query').press('Enter');
  await expect(guide).toContainText('No matches in this snapshot');
  await guide.getByRole('button', { name: 'Reset query and filters' }).click();
  await expect(page.locator('#hit-count')).toHaveText('4 / 9');
  await page.locator('#select-count').fill('0');
  await page.getByRole('button', { name: 'First N', exact: true }).click();
  await guide.getByRole('button', { name: 'Correct the chat count' }).click();
  await expect(page.locator('#select-count')).toBeFocused();
  await page.locator('#select-count').fill('1');
  await page.getByRole('button', { name: 'First N', exact: true }).click();
  await expect(guide).toContainText('Choose how to save your selection');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await page
    .getByRole('button', { name: 'View Building something that lasts', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Include message demo-message-0-0 in reconstruction' })
    .check();
  await expect(page.locator('#viewer-guide')).toContainText('1 individual message(s) collected');
  await page.locator('#close-viewer').click();
  await guide.getByRole('button', { name: 'Review message collection' }).click();
  await expect(page.locator('#action-dialog-guide')).toContainText(
    'Review, then confirm private content',
  );
  await page.locator('#reconstruction-title').fill('');
  await expect(page.locator('#action-dialog-guide')).toContainText('Name your message collection');
  await expect(page.locator('#download-reconstruction')).toBeDisabled();
  await page.locator('#reconstruction-title').fill('Collected context');
  await page.getByRole('button', { name: 'Remove 1', exact: true }).click();
  await expect(page.locator('#action-dialog-guide')).toHaveAttribute('data-tone', 'warning');
  await expect(page.locator('#action-dialog-guide')).toContainText('Choose at least one message');
  await page.getByRole('button', { name: 'Back to message selection' }).click();
  await expect(page.locator('#action-dialog')).not.toBeVisible();
});

test('guide shows import recovery and stays visible without mobile page overflow in both themes', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const guide = page.locator('#library-guide');
  await page.locator('#import-file').setInputFiles({
    name: 'synthetic-broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(guide).toHaveAttribute('data-tone', 'error');
  await expect(guide).toContainText('Choose a supported ZIP/JSON');
  await page.getByRole('button', { name: /Explore with synthetic demo data/ }).click();
  await expect(page.locator('#chat-count')).toHaveText('4');
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 650));
    await expect(guide).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const box = await guide.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThanOrEqual(12);
  }
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await expect(guide).toHaveCSS('transition-duration', '0s');
    await guide.screenshot({ path: testInfo.outputPath(`live-guide-${colorScheme}.png`) });
  }
});
