import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`public UI: ${viewport.name}, navigation, keyboard and accessibility`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors: string[] = [];
    const failedRequests: string[] = [];
    const badResponses: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
        failedRequests.push(
          `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
        );
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });

    const audit = async (surface: string) => {
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect
        .soft(overflow.content, `${surface}: no document overflow`)
        .toBeLessThanOrEqual(overflow.viewport);
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
        .analyze();
      await info.attach(`${surface}-axe`, {
        body: JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete }, null, 2),
        contentType: 'application/json',
      });
      expect.soft(axe.violations, `${surface}: axe violations`).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${surface}.png`), fullPage: true });
    };

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/jornadas$/);
    await expect(page).toHaveTitle(/Jornadas/);
    await expect(
      page.getByRole('heading', { name: 'No hemos podido cargar las quinielas' }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Jornadas', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    const selector = page.getByRole('combobox', { name: 'Seleccionar jornada' });
    await selector.focus();
    await page.keyboard.press('ArrowDown');
    await expect(selector).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(selector).toHaveAttribute('aria-expanded', 'false');
    await audit('journeys');

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Clasificación', exact: true })
      .click();
    await expect(page).toHaveURL(/\/clasificacion$/);
    await expect(page).toHaveTitle(/Clasificación/);
    await expect(page.locator('main')).toBeFocused();
    const seasonResponse = await page.request.get('/api/season');
    expect(seasonResponse.status()).toBe(200);
    const season = await seasonResponse.json();
    await expect(page.locator('.ranking-table tbody tr')).toHaveCount(season.participants.length);
    await audit('leaderboard');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Clasificación de temporada', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.ranking-table tbody tr')).toHaveCount(season.participants.length);

    await page.getByRole('contentinfo').getByRole('link', { name: 'Acceder', exact: true }).click();
    await expect(page).toHaveURL(/\/acceso$/);
    await expect(page.getByLabel('Usuario', { exact: true })).toHaveValue('daniel-arroyo');
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute(
      'type',
      'password',
    );
    await expect(page.getByRole('button', { name: 'Acceder', exact: true })).toBeDisabled();
    await audit('login');
    expect(errors, 'uncaught JavaScript errors').toEqual([]);
    expect(failedRequests, 'failed network requests').toEqual([]);
    expect(badResponses, 'HTTP error responses during public navigation').toEqual([]);
  });
}
