import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { SeasonSnapshot } from '../src/app/domain/models';

const season = JSON.parse(readFileSync('public/data/season.json', 'utf8')) as Omit<
  SeasonSnapshot,
  'asOf'
>;

async function noOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(page.viewportSize()?.width);
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}

test('temporada vacía y participantes reales', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Jornada actual', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No hay jornada actual' })).toBeVisible();
  await expect(page.getByTestId('fixture-row')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Seleccionar jornada' }).click();
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Jornada actual', exact: true }).click();
  await noOverflow(page);
  await accessible(page);

  await page.getByRole('link', { name: 'Ver clasificación de temporada' }).click();
  const rows = page.locator('.ranking-table tbody tr');
  await expect(rows).toHaveCount(season.participants.length);
  for (const participant of season.participants) {
    const { name, surname, role, active } = participant;
    const headerName = `${name} ${surname}${role === 'admin' ? ' Administrador' : ''}${active ? '' : ' Inactivo'}`;
    const row = rows.filter({
      has: page.getByRole('rowheader', { name: headerName, exact: true }),
    });
    const initials = `${name[0]}${surname[0]}`.toLocaleUpperCase('es');
    expect(participant.initials).toBe(initials);
    await expect(row.locator('.participant-avatar')).toHaveText(initials);
    await expect(row.locator('.ranking-index')).toHaveText('—');
    await expect(row).toContainText('Sin datos');
  }
  await expect(rows.filter({ hasText: 'Arroyo' })).toContainText('Administrador');
  await expect(page.getByText('Administrador', { exact: true })).toHaveCount(1);
  await noOverflow(page);
  await accessible(page);
  await page.reload();
  await expect(rows).toHaveCount(season.participants.length);
  expect(errors).toEqual([]);
});

test('teclado y tokens de controles compartidos', async ({ page }, info) => {
  await page.goto('/jornadas');
  await expect(page.getByRole('heading', { name: 'Jornada actual', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const journeySelect = page.getByRole('combobox', { name: 'Seleccionar jornada' });
  await journeySelect.focus();
  await page.keyboard.press('ArrowDown');
  await expect(journeySelect).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('listbox')).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(journeySelect).toHaveAttribute('aria-expanded', 'false');
  if (info.project.name === 'desktop') {
    await page.evaluate(() =>
      document.documentElement.style.setProperty('--radius-control', '8px'),
    );
    for (const control of await page.locator('.p-select, nav a').all()) {
      await expect(control).toHaveCSS('border-radius', '8px');
    }
    await page.evaluate(() => document.documentElement.style.removeProperty('--radius-control'));
    await expect(page.locator('.p-select')).toHaveCSS('border-radius', '12px');
  }
});
