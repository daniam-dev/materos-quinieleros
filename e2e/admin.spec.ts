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
  await expect(page.getByRole('heading', { name: 'Crea la primera jornada' })).toBeVisible();
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
  await page.getByLabel('Número de jornada').fill('1');
  await page.getByLabel('Cierre de apuestas').fill('2099-10-26T10:00');
  for (let i = 0; i < 15; i++) {
    await page.locator(`#home-${i}`).fill(`Local ${i + 1}`);
    await page.locator(`#away-${i}`).fill(`Visitante ${i + 1}`);
    await page.locator(`#kickoff-${i}`).fill('2099-10-26T11:00');
  }
  await inspect(page, 'create');
  await page.getByLabel('Cierre de apuestas').fill('2099-10-27T10:00');
  await page.getByRole('button', { name: 'Crear jornada', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cierre debe ser anterior');
  await expect(page.locator('.admin-feedback-summary')).toBeFocused();
  await expect(page.getByRole('alert')).toBeInViewport();
  await expect(page.locator('#home-0')).toHaveValue('Local 1');
  await page.getByLabel('Cierre de apuestas').fill('2099-10-26T10:00');
  await page.getByRole('button', { name: 'Crear jornada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cargar quiniela' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Jornada creada');
  await page.getByLabel('Participante', { exact: true }).selectOption({ label: 'Persona Prueba' });
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1 X 2');
  await page.getByRole('button', { name: 'Aplicar signos' }).click();
  await expect(page.getByRole('alert')).toContainText('exactamente 14 signos');
  await page.getByLabel('Pegar los 14 signos (opcional)').fill('1 X 2 1 X 2 1 X 2 1 X 2 1 X');
  await page.getByRole('button', { name: 'Aplicar signos' }).click();
  await page.getByLabel('Goles del local').selectOption('M');
  await page.getByLabel('Goles del visitante').selectOption('2');
  await page.getByRole('button', { name: 'Guardar quiniela', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quiniela guardada.');
  await expect(page.locator('.admin-feedback-summary')).toBeFocused();
  await expect(page.getByRole('status')).toBeInViewport();
  await inspect(page, 'predictions');
  await page.reload();
  await page.getByLabel('Participante', { exact: true }).selectOption({ label: 'Persona Prueba' });
  await expect(
    page
      .getByRole('group', { name: '1. Local 1 · Visitante 1', exact: true })
      .getByRole('radio', { name: '1', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Goles del local')).toHaveValue('M');
  await page
    .getByRole('group', { name: '1. Local 1 · Visitante 1', exact: true })
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

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/jornadas$/);
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  expect(errors).toEqual([]);
});
