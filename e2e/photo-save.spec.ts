import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { couponImage, couponPairs } from './coupon-fixture';

async function openImporter(page: Page) {
  await page.goto('/acceso');
  await page.getByLabel('Usuario', { exact: true }).fill('codex-local');
  await page.getByLabel('Contraseña', { exact: true }).fill('localhost-test-only-2026');
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await expect(page).toHaveURL(/\/administracion$/);
  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  const details = page.locator('.admin-new-coupon');
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click();
  }
}

test('photo save explains missing metadata at the submit button and recovers without losing the coupon', async ({
  page,
  browser,
}) => {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/admin')) {
      writes.push(request.url());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await openImporter(page);
  // Reconstructed from the second supplied image; no selected/blue first row.
  await page
    .locator('#coupon-photo')
    .setInputFiles(await couponImage(browser, { highlightFirst: false }));
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).toContainText(
    'de 15 encuentros reconocidos',
    { timeout: 90000 },
  );
  const proposed = await page.locator('.fixture-editor').evaluateAll((rows) =>
    rows.map((row, index) => ({
      home: (row.querySelector(`#coupon-home-${index}`) as HTMLInputElement).value,
      away: (row.querySelector(`#coupon-away-${index}`) as HTMLInputElement).value,
    })),
  );
  for (const [index, row] of proposed.entries()) {
    if (row.home || row.away) {
      expect(row).toEqual({ home: couponPairs[index][0], away: couponPairs[index][1] });
    }
  }
  for (const [index, [home, away, category]] of couponPairs.entries()) {
    await page.locator(`#coupon-home-${index}`).fill(home);
    await page.locator(`#coupon-away-${index}`).fill(away);
    await page
      .locator(`#coupon-category-${index}`)
      .selectOption(category === 'F' ? 'women' : 'men');
  }
  const save = page.getByRole('button', { name: 'Guardar jornada y cargar quinielas' });
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  const feedback = page.locator('#coupon-save-feedback');
  await expect(feedback).toBeFocused();
  await expect(feedback).toBeInViewport();
  await expect(feedback).toContainText(/número de jornada/i);
  expect(writes).toEqual([]);
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await feedback.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({ path: `.impeccable/review/photo-save-${label}.png`, fullPage: true });
  }
  await feedback.locator('a[href="#coupon-number"]').click();
  await expect(page.locator('#coupon-number')).toBeFocused();
  await page.locator('#coupon-number').fill('222');
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  await expect(feedback).toBeFocused();
  await expect(feedback).toContainText(/fecha/i);
  await page.locator('#coupon-date').fill('2099-11-01');
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  await expect(feedback).toBeFocused();
  await expect(feedback).toContainText(/cierre/i);
  await page.locator('#coupon-close').fill('2099-10-31T14:00');
  // A missing team/category is also actionable instead of a silent no-op.
  await page.locator('#coupon-category-8').selectOption('');
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  await expect(feedback).toBeFocused();
  await expect(feedback).toContainText(/9/);
  expect(writes).toEqual([]);
  await page.locator('#coupon-category-8').selectOption('men');
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  await expect(page.locator('.admin-notice')).toContainText('Jornada guardada');
  expect(writes).toHaveLength(1);
  await page.reload();
  const state = await (await page.request.get('/api/admin')).json();
  const journey = state.snapshot.journeys.find((item: { number: number }) => item.number === 222);
  expect(
    journey.fixtures.map((fixture: { home: string; away: string }) => [fixture.home, fixture.away]),
  ).toEqual(couponPairs.slice(0, 14).map(([home, away]) => [home, away]));
  expect(journey.pleno.fixture).toMatchObject({
    home: couponPairs[14][0],
    away: couponPairs[14][1],
  });
  await page.getByLabel('Jornada', { exact: true }).selectOption(journey.id);
  await expect(page.locator('.prediction-editor > legend')).toHaveText(
    couponPairs.slice(0, 14).map(([home, away], index) => `${index + 1}. ${home} · ${away}`),
  );
  await expect(page.locator('.admin-pleno > legend')).toHaveText(
    `Pleno al 15 · ${couponPairs[14][0]} · ${couponPairs[14][1]}`,
  );
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/photo-save-success-${label}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test('ambiguous closing time and server rejection stay actionable and preserve the draft', async ({
  page,
}) => {
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/admin')) writes++;
  });
  await openImporter(page);
  await page.getByRole('button', { name: 'Introducir los 15 encuentros manualmente' }).click();
  for (const [index, [home, away, category]] of couponPairs.entries()) {
    await page.locator(`#coupon-home-${index}`).fill(home);
    await page.locator(`#coupon-away-${index}`).fill(away);
    await page
      .locator(`#coupon-category-${index}`)
      .selectOption(category === 'F' ? 'women' : 'men');
  }
  await page.locator('#coupon-number').fill('223');
  await page.locator('#coupon-date').fill('2026-10-25');
  await page.locator('#coupon-close').fill('2026-10-25T02:30');
  await page.locator('input[name="confirmed"]').check();
  const save = page.getByRole('button', { name: 'Guardar jornada y cargar quinielas' });
  await save.click();
  const feedback = page.locator('#coupon-save-feedback');
  await expect(feedback).toBeFocused();
  await expect(feedback).toBeInViewport();
  await expect(feedback).toContainText(/ambigua/);
  expect(writes).toBe(0);
  await feedback.locator('a[href="#coupon-close"]').click();
  await expect(page.locator('#coupon-close')).toBeFocused();
  await page.locator('#coupon-close').fill('2026-10-24T14:00');
  await page.locator('#coupon-home-1').fill(couponPairs[0][0]);
  await page.locator('#coupon-away-1').fill(couponPairs[0][1]);
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  const serverFeedback = page.locator('.admin-feedback-summary');
  await expect(serverFeedback).toBeFocused();
  await expect(serverFeedback).toBeInViewport();
  await expect(serverFeedback.getByRole('alert')).toContainText('No repitas un encuentro');
  expect(writes).toBe(1);
  await expect(page.locator('#coupon-home-0')).toHaveValue(couponPairs[0][0]);
  await expect(page.locator('#coupon-home-14')).toHaveValue(couponPairs[14][0]);
  await page.locator('#coupon-home-1').fill(couponPairs[1][0]);
  await page.locator('#coupon-away-1').fill(couponPairs[1][1]);
  await page.locator('input[name="confirmed"]').check();
  await save.click();
  await expect(page.locator('.admin-notice')).toContainText('Jornada guardada');
  expect(writes).toBe(2);
});
