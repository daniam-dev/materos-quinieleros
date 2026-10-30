import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Synthetic screenshot fixture transcribed from the supplied coupon, not the original photo.
const pairs = [
  ['Levante', 'At. Madrid', 'M'],
  ['Rayo Vallecano', 'Celta', 'M'],
  ['Betis', 'Málaga', 'M'],
  ['Barcelona', 'Alavés', 'M'],
  ['Getafe', 'Sevilla', 'M'],
  ['Racing Santander', 'Real Madrid', 'M'],
  ['Elche', 'Valencia', 'M'],
  ['Eibar', 'Almería', 'M'],
  ['Eldense', 'Granada', 'M'],
  ['Burgos', 'Castellón', 'M'],
  ['Alavés', 'Real Sociedad', 'F'],
  ['Madrid CFF', 'Deportivo', 'F'],
  ['Sevilla', 'Real Madrid', 'F'],
  ['Tenerife', 'Athletic Club', 'F'],
  ['Athletic Club', 'Real Sociedad', 'M'],
] as const;

async function inspect(page: Page, name: string) {
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: `.impeccable/review/photo-${name}-${label}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('foto sintética con OCR real, revisión obligatoria y quinielas privadas persistentes', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  const ocrRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/ocr/')) ocrRequests.push(request.url());
  });
  await page.goto('/acceso');
  await page.getByLabel('Contraseña', { exact: true }).fill('e2e-only-password');
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await expect(page).toHaveURL(/\/administracion$/);
  await expect(page.locator('.admin-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Competiciones', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Filtrar boletos por competición', exact: true })
    .check();
  await page.getByRole('button', { name: 'Guardar competiciones', exact: true }).click();
  await expect(page.locator('.admin-notice')).toContainText('Configuración guardada');
  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Jornadas del grupo', exact: true }),
  ).toBeVisible();
  if (
    !(await page.locator('.admin-new-coupon').evaluate((el) => (el as HTMLDetailsElement).open))
  ) {
    await page.getByText('Añadir jornada desde una foto', { exact: true }).click();
  }

  // Check the text fallback validates numbered rows without persisting a partial draft.
  await page.getByText('Pegar los cruces como texto', { exact: true }).click();
  await page
    .locator('#coupon-text')
    .fill('1. Levante (M) - At. Madrid (M)\n1. Betis (M) - Málaga (M)');
  await page.getByRole('button', { name: 'Leer texto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El encuentro 1 aparece dos veces');

  // Rasterize readable text, then upload the PNG through the real browser OCR pipeline.
  const fixturePage = await browser.newPage({ viewport: { width: 1800, height: 1140 } });
  await fixturePage.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <style>body { margin: 36px; color: #000; background: #fff; font: 38px/66px Arial, sans-serif; }
    p { margin: 0; white-space: nowrap; }</style></head><body>${pairs
      .map(
        ([home, away, category], i) =>
          `<p>${i + 1}. ${home} (${category}) - ${away} (${category})</p>`,
      )
      .join('')}</body></html>`);
  const png = await fixturePage.screenshot({ fullPage: true });
  await fixturePage.close();
  await page.locator('#coupon-photo').setInputFiles({
    name: 'synthetic-reviewed-coupon.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).toContainText(
    '15 de 15 encuentros reconocidos',
    { timeout: 60000 },
  );
  expect(ocrRequests.some((url) => url.includes('/ocr/worker.min.js'))).toBe(true);
  expect(ocrRequests.some((url) => url.includes('/ocr/lang/'))).toBe(true);
  await expect(page.locator('mq-coupon-import .fixture-editor')).toHaveCount(15);
  for (const [i, [home, away, category]] of pairs.entries()) {
    await expect(page.locator(`#coupon-home-${i}`)).toHaveValue(home);
    await expect(page.locator(`#coupon-away-${i}`)).toHaveValue(away);
    await expect(page.locator(`#coupon-category-${i}`)).toHaveValue(
      category === 'F' ? 'women' : 'men',
    );
  }
  const save = page.getByRole('button', {
    name: 'Guardar jornada y cargar quinielas',
    exact: true,
  });
  const review = page.getByRole('checkbox', {
    name: 'He revisado los 15 cruces, su orden, las categorías y el cierre.',
    exact: true,
  });
  await expect(save).toBeDisabled();
  await page.locator('#coupon-number').fill('218');
  await page.locator('#coupon-date').fill('2099-11-01');
  await page.locator('#coupon-close').fill('2099-10-31T14:00');
  await review.check();
  await expect(save).toBeEnabled();
  await page.locator('#coupon-home-0').fill('Levante revisado');
  await expect(review).not.toBeChecked();
  await expect(save).toBeDisabled();
  await page.locator('#coupon-home-0').fill('Levante');
  await inspect(page, 'review');
  await review.check();
  await save.click();
  await expect(page.locator('.admin-notice')).toContainText('Jornada guardada');
  let state = await (await page.request.get('/api/admin')).json();
  const created = state.snapshot.journeys.find((j: { number: number }) => j.number === 218);
  expect(created).toMatchObject({
    origin: 'admin',
    resultPolicy: 'sporting',
    drawDate: '2099-11-01',
    closesAt: '2099-10-31T13:00:00.000Z',
    participation: { state: 'enabled' },
  });
  expect(created.fixtures).toHaveLength(14);
  expect(created.pleno.fixture).toMatchObject({
    home: 'Athletic Club',
    away: 'Real Sociedad',
    category: 'men',
  });
  await expect(page.getByLabel('Jornada', { exact: true })).toHaveValue(created.id);
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1 X 2 1 X 2 1 X 2 1 X 2 1 X');
  await page.getByRole('button', { name: 'Aplicar signos', exact: true }).click();
  await page.getByLabel('Goles del local').selectOption('M');
  await page.getByLabel('Goles del visitante').selectOption('2');
  await page.getByRole('button', { name: 'Guardar quiniela', exact: true }).click();
  await expect(page.locator('.admin-notice')).toHaveText('Quiniela guardada.');
  await page.reload();
  await page.getByLabel('Jornada', { exact: true }).selectOption(created.id);
  await expect(page.getByLabel('Goles del local')).toHaveValue('M');
  await expect(page.getByLabel('Goles del visitante')).toHaveValue('2');
  state = await (await page.request.get('/api/admin')).json();
  const saved = state.snapshot.journeys.find((j: { id: string }) => j.id === created.id);
  expect(saved.predictions).toHaveLength(14);
  expect(saved.pleno.predictions).toHaveLength(1);
  const publicState = await (await page.request.get('/api/season')).json();
  const visible = publicState.journeys.find((j: { id: string }) => j.id === created.id);
  expect(visible.predictions).toEqual([]);
  expect(visible.pleno.predictions).toEqual([]);
  await inspect(page, 'created');
  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Cargar quinielas de la jornada 218', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
