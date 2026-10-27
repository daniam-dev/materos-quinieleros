import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';

test('login y sesión desde localhost y 127.0.0.1', async ({ page }) => {
  for (const host of ['localhost', '127.0.0.1']) {
    const origin = `http://${host}:4200`;
    await page.goto(`${origin}/acceso`);
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
    await page.getByRole('button', { name: 'Acceder', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.');
    await page.getByLabel('Contraseña', { exact: true }).fill('e2e-only-password');
    await page.getByRole('button', { name: 'Acceder', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/administracion`);
    await expect(page.getByRole('link', { name: 'Administración', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Administración', exact: true })).toBeVisible();
    expect((await page.request.get(`${origin}/api/admin`)).status()).toBe(200);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(`${origin}/jornadas`);
    expect((await page.request.get(`${origin}/api/admin`)).status()).toBe(403);
  }
});

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
      path: `.impeccable/review/admin-${name}-${label}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('acceso real, gestión del grupo y carga persistente de quinielas con privacidad', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  mkdirSync('.impeccable/review', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/administracion');
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Usuario o contraseña incorrectos');
  await inspect(page, 'login');
  await page.getByLabel('Contraseña', { exact: true }).fill('e2e-only-password');
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await expect(page).toHaveURL(/\/administracion$/);
  await expect(page.getByRole('heading', { name: 'Esperando jornadas de SELAE' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toBeVisible();
  await inspect(page, 'empty');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Administración', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Personas', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Persona');
  await page.getByLabel('Apellidos', { exact: true }).fill('Prueba');
  await page.getByRole('button', { name: 'Añadir al grupo' }).click();
  await expect(page.getByRole('status')).toContainText('Persona añadida');
  await expect(page.locator('.admin-feedback-summary')).toBeFocused();
  await expect(page.getByRole('status')).toBeInViewport();
  await expect(page.locator('.admin-people li')).toHaveCount(10);
  await expect(
    page.locator('.admin-people li').filter({ hasText: 'Daniel Arroyo' }).getByRole('button'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Dar de baja a Persona', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Dar de baja a Persona', exact: true }),
  ).toBeVisible();
  await inspect(page, 'people');

  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('');
  await expect(page.getByRole('heading', { name: 'Jornadas importadas' })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar sincronización' }).click();
  await expect(page.getByRole('status')).toContainText('Sincronización solicitada');
  await inspect(page, 'imported');
  await page.getByRole('button', { name: 'Competiciones', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Filtrar boletos por competición', exact: true })
    .check();
  await page.getByRole('switch', { name: 'Champions League', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Guardar competiciones', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Configuración guardada');
  let selection = await (await page.request.get('/api/admin')).json();
  expect(
    selection.snapshot.journeys.find((j: { id: string }) => j.id === 'selae-10001').participation
      .state,
  ).toBe('pending');
  await page.getByLabel('Boleto que quieres identificar').selectOption('selae-10001');
  await expect(page.locator('.admin-coupon-fixtures li')).toHaveCount(15);
  await page.getByRole('checkbox', { name: 'Primera División', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Champions League', exact: true }).check();
  await expect(
    page.getByRole('button', { name: 'Confirmar competiciones del boleto', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: 'He revisado los 15 encuentros', exact: false }).check();
  await page
    .getByRole('button', { name: 'Confirmar competiciones del boleto', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Competiciones del boleto confirmadas');
  await inspect(page, 'competitions');
  let selectedPublic = await (await page.request.get('/api/season')).json();
  expect(selectedPublic.journeys.some((j: { id: string }) => j.id === 'selae-10001')).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'Competiciones', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Champions League', exact: true }),
  ).not.toBeChecked();
  await page.getByLabel('Boleto que quieres identificar').selectOption('selae-10001');
  await expect(page.getByRole('checkbox', { name: 'Primera División', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Champions League', exact: true })).toBeChecked();
  await page.getByRole('switch', { name: 'Champions League', exact: true }).check();
  await page.getByRole('button', { name: 'Guardar competiciones', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Configuración guardada');
  selection = await (await page.request.get('/api/admin')).json();
  expect(
    selection.snapshot.journeys.find((j: { id: string }) => j.id === 'selae-10001').participation
      .state,
  ).toBe('enabled');
  selectedPublic = await (await page.request.get('/api/season')).json();
  expect(selectedPublic.journeys.some((j: { id: string }) => j.id === 'selae-10001')).toBe(true);
  await page.getByRole('button', { name: 'Jornadas', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar quinielas de la jornada 1', exact: true }).click();
  await page
    .getByLabel('Participante', { exact: true })
    .selectOption({ label: 'Persona Prueba · Falta quiniela' });
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1 X 2');
  await page.getByRole('button', { name: 'Aplicar signos' }).click();
  await expect(page.getByRole('alert')).toContainText('exactamente 14 signos');
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1X X2 2 1 X 2 1 X 2 1 X 2 1 X');
  await page.getByRole('button', { name: 'Aplicar signos' }).click();
  await expect(page.getByText('Dobles usados: 2 / 2.', { exact: false })).toBeVisible();
  await expect(
    page
      .getByRole('group', { name: '3. Local 3 (m) · Visitante 3 (m)', exact: true })
      .getByRole('radio', { name: '12', exact: true }),
  ).toBeDisabled();
  const thirdSingle = page
    .getByRole('group', { name: '3. Local 3 (m) · Visitante 3 (m)', exact: true })
    .getByRole('radio', { name: '1', exact: true });
  await expect(thirdSingle).toBeEnabled();
  await thirdSingle.check();
  await page.getByLabel('Goles del local').selectOption('M');
  await page.getByLabel('Goles del visitante').selectOption('2');
  await page.getByRole('button', { name: 'Guardar quiniela', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quiniela guardada.');
  await expect(page.locator('.admin-feedback-summary')).toBeFocused();
  await expect(page.getByRole('status')).toBeInViewport();
  await inspect(page, 'predictions');
  await page.reload();
  await page.getByLabel('Jornada', { exact: true }).selectOption('selae-10001');
  await page
    .getByLabel('Participante', { exact: true })
    .selectOption({ label: 'Persona Prueba · Completa' });
  await expect(
    page
      .getByRole('group', { name: '1. Local 1 (m) · Visitante 1 (m)', exact: true })
      .getByRole('radio', { name: '1X', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Goles del local')).toHaveValue('M');
  await page
    .getByRole('group', { name: '1. Local 1 (m) · Visitante 1 (m)', exact: true })
    .getByRole('radio', { name: 'X', exact: true })
    .check();
  await page.getByRole('button', { name: 'Actualizar quiniela', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quiniela guardada.');

  await page.getByRole('button', { name: 'Personas', exact: true }).click();
  await page.getByRole('button', { name: 'Dar de baja a Persona', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar baja de Persona', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('histórico se conserva');
  const adminData = await (await page.request.get('/api/admin')).json();
  expect(adminData.snapshot.journeys[0].predictions).toHaveLength(14);
  expect(adminData.snapshot.journeys[0].predictions[0].sign).toBe('X');
  await page.getByRole('button', { name: 'Reincorporar Persona', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('reincorporada');

  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto('/jornadas');
  await expect(publicPage.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(
    0,
  );
  const publicData = await (
    await publicPage.request.get('http://127.0.0.1:4200/api/season')
  ).json();
  expect(publicData.journeys[0].predictions).toEqual([]);
  expect(publicData.journeys[0].pleno.predictions).toEqual([]);
  expect((await publicPage.request.get('http://127.0.0.1:4200/api/admin')).status()).toBe(403);
  await publicPage.goto('/administracion');
  await expect(publicPage).toHaveURL(/\/acceso$/);
  await visitor.close();
  // Real API and isolated persistence; only sports providers are simulated.
  let state = await (await page.request.get('/api/admin')).json();
  for (const person of state.snapshot.participants.filter((p: { active: boolean }) => p.active)) {
    const result = await page.request.post('/api/admin', {
      headers: { Origin: 'http://127.0.0.1:4200', 'If-Match': state.revision },
      data: {
        type: 'save-predictions',
        journeyId: 'selae-10002',
        participantId: person.id,
        signs: ['1X', 'X2', ...Array(12).fill('1')],
        pleno: { home: 'M', away: '1' },
      },
    });
    expect(result.status()).toBe(200);
    state = await (await page.request.get('/api/admin')).json();
  }
  await page.goto('/jornadas');
  await expect(page.locator('[data-testid="fixture-row"]')).toHaveCount(14);
  await expect(page.locator('.prediction-mark--provisional-hit')).not.toHaveCount(0);
  await inspect(page, 'comparison');
  await page.getByRole('button', { name: 'Pendientes', exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-testid="fixture-row"]')).toHaveCount(13);
  await page.goto('/administracion');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/jornadas$/);
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  expect(errors).toEqual([]);
});
