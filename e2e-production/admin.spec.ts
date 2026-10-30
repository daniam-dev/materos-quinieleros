import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHmac, randomBytes } from 'node:crypto';

test.describe('Administración real sin modificar datos', () => {
  test.skip(
    process.env['MQ_PRODUCTION_ADMIN_TESTS'] !== '1',
    'Requiere activación local explícita.',
  );
  let token: string;

  test.beforeAll(() => {
    // Secrets stay in this process; no auth response, trace or storage state is saved.
    process.loadEnvFile('.env');
    const secret = process.env['ADMIN_SESSION_SECRET'];
    const hash = process.env['ADMIN_PASSWORD_HASH'];
    if (!secret || !hash) throw new Error('Falta configuración administrativa local.');
    const value = Buffer.from(
      JSON.stringify({
        sub: 'daniel-arroyo',
        exp: Date.now() + 10 * 60 * 1000,
        nonce: randomBytes(16).toString('hex'),
      }),
    ).toString('base64url');
    token = `${value}.${createHmac('sha256', secret).update(`${value}:${hash}`).digest('base64url')}`;
  });

  test('API privada: sesión firmada, revisión y estado deportivo', async ({ request }) => {
    const response = await request.get('/api/admin', {
      headers: { Cookie: `mq_session=${token}` },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const data = await response.json();
    expect(typeof data.revision).toBe('string');
    expect(data.snapshot.participants).toHaveLength(9);
    expect(data.competitionCatalog).toHaveLength(8);
    expect(typeof data.competitionSettings.enabled).toBe('boolean');
    const sync = data.snapshot.synchronization;
    // Output only operational metadata, never bets, names, cookies or secrets.
    console.log(
      'Estado operativo privado:',
      JSON.stringify({
        journeys: data.snapshot.journeys.length,
        hasPersistedPrivateRevision: data.revision !== 'initial',
        synchronization: sync ?? null,
      }),
    );
    if (sync?.odds) expect(sync.odds.state).toBe('unconfigured');
  });

  test('API privada: origen y revisión impiden comandos sin escribir datos', async ({
    request,
  }) => {
    const cookie = { Cookie: `mq_session=${token}` };
    const before = await (await request.get('/api/admin', { headers: cookie })).json();
    expect(typeof before.revision).toBe('string');
    // This deliberately unknown command cannot write even if a guard regresses.
    const command = { type: 'read-only-production-probe' };
    const transportedRevision = await request.post('/api/admin', {
      headers: {
        ...cookie,
        Origin: 'https://materosquinieleros.netlify.app',
        'X-MQ-Revision': before.revision,
      },
      data: command,
    });
    // Correctly delivered revision reaches the unknown-command guard, never a write.
    expect(transportedRevision.status()).toBe(400);
    const wrongOrigin = await request.post('/api/admin', {
      headers: { ...cookie, Origin: 'https://example.org' },
      data: command,
    });
    expect(wrongOrigin.status()).toBe(403);
    const stale = await request.post('/api/admin', {
      headers: {
        ...cookie,
        Origin: 'https://materosquinieleros.netlify.app',
        'X-MQ-Revision': `deliberately-invalid-${randomBytes(16).toString('hex')}`,
      },
      data: command,
    });
    expect(stale.status()).toBe(409);
    const after = await (await request.get('/api/admin', { headers: cookie })).json();
    expect(after.revision).toBe(before.revision);
    expect(after.competitionSettings).toEqual(before.competitionSettings);
    expect(after.snapshot.participants).toEqual(before.snapshot.participants);
  });

  for (const width of [1440, 390]) {
    test(`Panel administrativo a ${width}px: secciones, axe, recarga`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        {
          name: 'mq_session',
          value: token,
          domain: 'materosquinieleros.netlify.app',
          path: '/api',
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
        },
      ]);
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (new URL(response.url()).pathname === '/api/auth' && response.status() >= 400)
          console.log('Respuesta de acceso:', response.status());
      });
      await page.goto('/administracion');
      await expect(
        page.getByRole('heading', { name: 'Administración', exact: true }),
      ).toBeVisible();
      console.log(
        'Nombre del enlace de marca:',
        await page.locator('.brand').evaluate((el) => ({
          visible: (el as HTMLElement).innerText,
          accessibleLabel: el.getAttribute('aria-label'),
        })),
      );
      await expect(page.getByRole('group', { name: 'Secciones de administración' })).toBeVisible();
      for (const name of ['Personas', 'Jornadas', 'Competiciones', 'Quinielas']) {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.locator('.admin-workspace')).toBeVisible();
        const result = await new AxeBuilder({ page }).analyze();
        const violations = result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
        }));
        if (violations.length) console.log(`Axe ${width}px ${name}:`, JSON.stringify(violations));
        expect.soft(violations, `Axe ${width}px ${name}`).toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        ).toBe(true);
      }
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Administración', exact: true }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
