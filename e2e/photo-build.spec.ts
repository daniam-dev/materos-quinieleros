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
  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click();
  }
}

test('local hashed administrator keeps the normal session boundary on both loopback hosts', async ({
  page,
}) => {
  for (const host of ['localhost', '127.0.0.1']) {
    const origin = `http://${host}:4200`;
    await page.goto(`${origin}/acceso`);
    await page.getByLabel('Usuario', { exact: true }).fill('codex-local');
    await page.getByLabel('Contraseña', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Acceder', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Usuario o contraseña incorrectos');
    await page.getByLabel('Contraseña', { exact: true }).fill('localhost-test-only-2026');
    await page.getByRole('button', { name: 'Acceder', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/administracion`);
    await page.reload();
    expect((await page.request.get(`${origin}/api/admin`)).status()).toBe(200);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    expect((await page.request.get(`${origin}/api/admin`)).status()).toBe(403);
  }
});

test('optimized build reads the colored coupon through the real OCR worker', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openImporter(page);
  await page.locator('#coupon-photo').setInputFiles(await couponImage(browser));
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).toContainText(
    'de 15 encuentros reconocidos',
    { timeout: 90000 },
  );
  const recognized = Number(
    (await page.locator('mq-coupon-import [aria-live="polite"]').innerText()).match(/^(\d+)/)?.[1],
  );
  expect(recognized).toBeGreaterThanOrEqual(12);
  test.info().annotations.push({
    type: 'OCR recognized rows',
    description: `${recognized}/15 on the colored synthetic fixture; all 15 reviewed below.`,
  });
  const proposed = await page.locator('.fixture-editor').evaluateAll((rows) =>
    rows.map((row, index) => ({
      number: index + 1,
      home: (row.querySelector(`[id="coupon-home-${index}"]`) as HTMLInputElement).value,
      away: (row.querySelector(`[id="coupon-away-${index}"]`) as HTMLInputElement).value,
    })),
  );
  expect(
    proposed.filter(
      (row, index) => row.home === couponPairs[index][0] && row.away === couponPairs[index][1],
    ).length,
  ).toBeGreaterThanOrEqual(8);
  console.log('Colored fixture OCR proposal:', JSON.stringify(proposed));
  await page.screenshot({
    path: '.impeccable/review/photo-build-proposal-desktop.png',
    fullPage: true,
  });
  // Colored screenshots may produce incomplete proposals. Review every row.
  for (const [i, [home, away, category]] of couponPairs.entries()) {
    await page.locator(`#coupon-home-${i}`).fill(home);
    await page.locator(`#coupon-away-${i}`).fill(away);
    await page.locator(`#coupon-category-${i}`).selectOption(category === 'F' ? 'women' : 'men');
  }
  await expect(
    page.getByRole('button', { name: 'Guardar jornada y cargar quinielas' }),
  ).toBeDisabled();
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
    await page.screenshot({ path: `.impeccable/review/photo-build-${label}.png`, fullPage: true });
  }
  await page.locator('#coupon-number').fill('221');
  await page.locator('#coupon-date').fill('2099-11-01');
  await page.locator('#coupon-close').fill('2099-10-31T14:00');
  await page
    .getByRole('checkbox', {
      name: 'He revisado los 15 cruces, su orden, las categorías y el cierre.',
    })
    .check();
  await page.getByRole('button', { name: 'Guardar jornada y cargar quinielas' }).click();
  await expect(page.locator('.admin-notice')).toContainText('Jornada guardada');
  const snapshot = await (await page.request.get('/api/admin')).json();
  const created = snapshot.snapshot.journeys.find(
    (journey: { number: number }) => journey.number === 221,
  );
  expect(created).toMatchObject({
    origin: 'admin',
    resultPolicy: 'sporting',
    closesAt: '2099-10-31T13:00:00.000Z',
  });
  expect(created.fixtures).toHaveLength(14);
  for (const [index, [home, away, category]] of couponPairs.slice(0, 14).entries()) {
    expect(created.fixtures[index]).toMatchObject({
      home,
      away,
      category: category === 'F' ? 'women' : 'men',
    });
  }
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1 X 2 1 X 2 1 X 2 1 X 2 1 X');
  await page.getByRole('button', { name: 'Aplicar signos', exact: true }).click();
  await page.getByLabel('Goles del local').selectOption('M');
  await page.getByLabel('Goles del visitante').selectOption('2');
  await page.getByRole('button', { name: 'Guardar quiniela', exact: true }).click();
  await expect(page.locator('.admin-notice')).toHaveText('Quiniela guardada.');
  await page.reload();
  await page.getByLabel('Jornada', { exact: true }).selectOption(created.id);
  await expect(page.getByLabel('Goles del local')).toHaveValue('M');
  const publicState = await (await page.request.get('/api/season')).json();
  const publicJourney = publicState.journeys.find(
    (journey: { id: string }) => journey.id === created.id,
  );
  expect(publicJourney.predictions).toEqual([]);
  expect(publicJourney.pleno.predictions).toEqual([]);
  expect(errors).toEqual([]);
});

test('invalid photos and partial text keep the reviewed draft editable', async ({ page }) => {
  await openImporter(page);
  await page.getByText('Pegar los cruces como texto', { exact: true }).click();
  await page.locator('#coupon-text').fill('1. Levante (M) - At. Madrid (M)');
  await page.getByRole('button', { name: 'Leer texto', exact: true }).click();
  await expect(page.locator('#coupon-home-0')).toHaveValue('Levante');
  await expect(page.locator('.fixture-editor')).toHaveCount(15);
  await expect(page.locator('#coupon-home-1')).toHaveValue('');
  for (const [name, mimeType] of [
    ['document.txt', 'text/plain'],
    ['broken.png', 'image/png'],
  ]) {
    await page
      .locator('#coupon-photo')
      .setInputFiles({ name, mimeType, buffer: Buffer.from('not an image') });
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('#coupon-home-0')).toHaveValue('Levante');
    await expect(page.locator('#coupon-photo')).toBeEnabled();
    await expect(page.locator('mq-coupon-import [aria-live="polite"]')).not.toContainText(
      'Preparando',
    );
  }
});

test('failed worker initialization stops progress, preserves draft and permits a real retry', async ({
  page,
  browser,
  context,
}) => {
  await openImporter(page);
  await page.getByRole('button', { name: 'Introducir los 15 encuentros manualmente' }).click();
  await page.locator('#coupon-home-0').fill('Borrador conservado');
  await context.route('**/ocr/worker.min.js', (route) => route.abort());
  const image = await couponImage(browser);
  await page.locator('#coupon-photo').setInputFiles(image);
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 45000 });
  await expect(page.locator('#coupon-photo')).toBeEnabled();
  await expect(page.locator('#coupon-home-0')).toHaveValue('Borrador conservado');
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).not.toContainText(
    'Preparando',
  );
  await context.unroute('**/ocr/worker.min.js');
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
      path: `.impeccable/review/photo-build-failure-${label}.png`,
      fullPage: true,
    });
  }
  await page.locator('#coupon-photo').setInputFiles(image);
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).toContainText(
    'de 15 encuentros reconocidos',
    { timeout: 90000 },
  );
});

test('leaving during photo loading leaves a fresh importer usable', async ({
  page,
  browser,
  context,
}) => {
  await openImporter(page);
  let requested = false;
  await context.route('**/ocr/worker.min.js', async (route) => {
    requested = true;
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue().catch(() => undefined);
  });
  await page.locator('#coupon-photo').setInputFiles(await couponImage(browser));
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Personas', exact: true }).click();
  await expect(page.locator('mq-coupon-import')).toHaveCount(0);
  await context.unroute('**/ocr/worker.min.js');
  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  const details = page.locator('.admin-new-coupon');
  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open)))
    await details.locator(':scope > summary').click();
  await page.getByRole('button', { name: 'Introducir los 15 encuentros manualmente' }).click();
  await expect(page.locator('.fixture-editor')).toHaveCount(15);
  await expect(page.locator('#coupon-photo')).toBeEnabled();
});

test('a missing language model releases the importer and leaves the manual fallback usable', async ({
  page,
  browser,
  context,
}) => {
  await openImporter(page);
  let requested = false;
  await context.route('**/ocr/lang/**', (route) => {
    requested = true;
    return route.fulfill({ status: 503, body: 'Model temporarily unavailable' });
  });
  await page.locator('#coupon-photo').setInputFiles(await couponImage(browser));
  await expect.poll(() => requested).toBe(true);
  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el lector de fotos', {
    timeout: 40000,
  });
  await expect(page.locator('#coupon-photo')).toBeEnabled();
  await expect(page.locator('mq-coupon-import [aria-live="polite"]')).toHaveText('');
  await page.getByRole('button', { name: 'Introducir los 15 encuentros manualmente' }).click();
  await expect(page.locator('.fixture-editor')).toHaveCount(15);
  await page.locator('#coupon-home-0').fill('Alternativa manual');
  await expect(page.locator('#coupon-home-0')).toHaveValue('Alternativa manual');
});
