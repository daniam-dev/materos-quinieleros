import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

async function selectJourney(page: Page, number: number) {
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Seleccionar jornada' }).click();
  await page.getByRole('option', { name: `Jornada ${number}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Jornada ${number}`, exact: true })).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}
async function noOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          page: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        })),
      { message: 'El ancho de la página debe quedar dentro del viewport' },
    )
    .toEqual({ page: page.viewportSize()?.width, viewport: page.viewportSize()?.width });
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}
async function capture(page: Page, path: string) {
  await page.locator('main').focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}
test('comparativa, filtros, publicación, clasificación y capturas', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Jornada 12', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('fixture-row')).toHaveCount(14);
  await expect(page.getByText('Resultados parciales', { exact: true })).toBeVisible();
  await expect(page.getByText('Adm.', { exact: false }).first()).toBeVisible();
  await noOverflow(page);
  await accessible(page);
  await mkdir('.impeccable/review', { recursive: true });
  await capture(page, `.impeccable/review/${info.project.name}.png`);
  await page.getByRole('button', { name: 'Resueltos', exact: true }).click();
  await expect(page.getByTestId('fixture-row')).toHaveCount(8);
  await page.getByRole('button', { name: 'Pendientes', exact: true }).click();
  await expect(page.getByTestId('fixture-row')).toHaveCount(6);
  await expect(page.getByText('En juego', { exact: true })).toBeVisible();
  await expect(page.getByText('63′', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();

  if (info.project.name !== 'desktop') {
    await page.getByRole('combobox', { name: 'Ver pronósticos de' }).click();
    await page.getByRole('option', { name: 'Lucía', exact: true }).click();
    const rows = page.getByTestId('fixture-row');
    await expect(
      rows.first().locator('td:not(.not-selected)').getByLabel('1, acierto', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.comparison-table thead .participant-column:visible')).toHaveCount(
      1,
    );
    await page.getByRole('button', { name: 'Comparar todos' }).click();
    await expect(page.locator('.comparison-table thead .participant-column:visible')).toHaveCount(
      9,
    );
    await rows.first().getByRole('rowheader').scrollIntoViewIfNeeded();
    await page.locator('.comparison-scroll').evaluate((element) => {
      element.scrollLeft = 600;
    });
    await expect(rows.first().getByRole('rowheader')).toBeInViewport();
    const fullyVisibleParticipants = await page
      .locator('.comparison-scroll')
      .evaluate((element) => {
        const right = element.getBoundingClientRect().right;
        const stickyRight = element.querySelector('th')!.getBoundingClientRect().right;
        return [...element.querySelectorAll('thead .participant-column')].filter((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left >= stickyRight && rect.right <= right + 1;
        }).length;
      });
    expect(fullyVisibleParticipants).toBeGreaterThanOrEqual(2);
    await noOverflow(page);
    await capture(page, `.impeccable/review/${info.project.name}-comparison.png`);
    await page.getByRole('button', { name: 'Vista individual' }).click();
  } else {
    await expect(page.locator('.comparison-table thead .participant-column:visible')).toHaveCount(
      9,
    );
    expect(
      await page.locator('.comparison-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Cómo se calcula' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await selectJourney(page, 13);
  await expect(page.getByText('Cada uno guarda sus cartas.')).toBeVisible();
  await expect(page.locator('mq-prediction-mark')).toHaveCount(0);
  await expect(page.locator('.quick-ranking')).toHaveCount(0);
  await accessible(page);
  await noOverflow(page);
  await capture(page, `.impeccable/review/${info.project.name}-open.png`);
  await selectJourney(page, 10);
  await expect(page.getByText('Cerrada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resueltos', exact: true }).click();
  await expect(page.getByText('No hay encuentros con este filtro.')).toBeVisible();
  await selectJourney(page, 11);
  await expect(page.getByText('Finalizada', { exact: true })).toBeVisible();
  await expect(page.getByText('Oficial: M – 1', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Ver clasificación de temporada' }).click();
  await expect(page).toHaveURL(/clasificacion$/);
  await expect(page.locator('.ranking-table tbody tr')).toHaveCount(9);
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible();
  await expect(page.locator('.ranking-table tbody tr').filter({ hasText: 'Lucía' })).toContainText(
    '22',
  );
  await noOverflow(page);
  await accessible(page);
  await capture(page, `.impeccable/review/${info.project.name}-leaderboard.png`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'La constancia tiene premio.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('teclado y tokens de controles compartidos', async ({ page }, info) => {
  await page.goto('/jornadas');
  await expect(page.getByRole('heading', { name: 'Jornada 12', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const journeySelect = page.getByRole('combobox', { name: 'Seleccionar jornada' });
  await journeySelect.scrollIntoViewIfNeeded();
  await journeySelect.focus();
  await page.keyboard.press('ArrowDown');
  await expect(journeySelect).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(journeySelect).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(journeySelect).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Jornada 13', exact: true })).toBeVisible();
  await selectJourney(page, 12);
  if (info.project.name === 'desktop') {
    await page.evaluate(() =>
      document.documentElement.style.setProperty('--radius-control', '8px'),
    );
    for (const control of await page.locator('.mq-button, .p-select, nav a').all()) {
      await expect(control).toHaveCSS('border-radius', '8px');
    }
    await page.evaluate(() => document.documentElement.style.removeProperty('--radius-control'));
    await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveCSS(
      'border-radius',
      '12px',
    );
  }
});
