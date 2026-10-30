import { expect, test } from '@playwright/test';

test('operación: boletos elegidos conservan su identidad y política deportiva', async ({
  request,
}) => {
  const response = await request.get('/api/season');
  expect(response.status()).toBe(200);
  const snapshot = await response.json();
  for (const journey of snapshot.journeys.filter(
    (j: { origin?: string }) => j.origin === 'admin',
  )) {
    expect(journey.resultPolicy).toBe('sporting');
    expect(journey.fixtures).toHaveLength(14);
    expect(journey.pleno.fixture.number).toBe(15);
    expect(journey.participation.state).toBe('enabled');
  }
  // An empty group is valid until the administrator selects a coupon; no automatic SELAE import.
  if (snapshot.synchronization?.coupons)
    expect(snapshot.synchronization.coupons.state).toBe('manual');
});

test('operación: snapshot público fresco y selección coherente de jornada', async ({ request }) => {
  const response = await request.get('/api/season');
  expect(response.status()).toBe(200);
  const snapshot = await response.json();
  expect(Math.abs(Date.now() - Date.parse(snapshot.asOf))).toBeLessThan(60_000);
  expect(
    snapshot.currentJourneyId === null ||
      snapshot.journeys.some((journey: { id: string }) => journey.id === snapshot.currentJourneyId),
  ).toBe(true);
  test.info().annotations.push({
    type: 'observed',
    description: `${snapshot.journeys.length} jornadas; actual=${snapshot.currentJourneyId}; sincronización=${JSON.stringify(snapshot.synchronization ?? null)}`,
  });
  await test.info().attach('estado-operativo-publico', {
    body: JSON.stringify(
      {
        asOf: snapshot.asOf,
        journeys: snapshot.journeys.length,
        currentJourneyId: snapshot.currentJourneyId,
        synchronization: snapshot.synchronization ?? null,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});

test('operación: integridad de boletos importados, cuando existen', async ({ request }) => {
  const response = await request.get('/api/season');
  expect(response.ok()).toBe(true);
  const snapshot = await response.json();
  test.skip(
    snapshot.journeys.length === 0,
    'Producción aún no expone jornadas: no se acredita importación SELAE, horarios ni signos reales.',
  );
  for (const journey of snapshot.journeys) {
    expect(journey.fixtures).toHaveLength(14);
    expect(journey.pleno.fixture).toBeTruthy();
    const fixtures = [...journey.fixtures, journey.pleno.fixture];
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(15);
    expect(fixtures.map((fixture) => fixture.number)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 1),
    );
    for (const fixture of fixtures) {
      expect(fixture.home.trim()).not.toBe('');
      expect(fixture.away.trim()).not.toBe('');
      if (fixture.kickoff !== null) expect(Number.isFinite(Date.parse(fixture.kickoff))).toBe(true);
    }
    for (const result of journey.officialResults) {
      expect(['1', 'X', '2']).toContain(result.sign);
      expect(Date.parse(result.publishedAt)).toBeLessThanOrEqual(Date.parse(snapshot.asOf));
    }
  }
});

test('operación: OddsPapi permanece sin configurar después de una sincronización observable', async ({
  request,
}) => {
  const response = await request.get('/api/season');
  expect(response.ok()).toBe(true);
  const snapshot = await response.json();
  test.skip(
    !snapshot.synchronization?.odds,
    'No hay estado del worker publicado; no se acredita ejecución ni configuración de OddsPapi desde el cliente público.',
  );
  expect(snapshot.synchronization.odds.state).toBe('unconfigured');
  expect(snapshot.synchronization.odds.used).toBeUndefined();
});

test('operación: recuperar visibilidad refresca la copia sin llamar proveedores deportivos', async ({
  page,
}) => {
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (/oddspapi|selae|loteriasyapuestas/i.test(new URL(request.url()).hostname))
      providerRequests.push(request.url());
  });
  const initial = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/season' && response.status() === 200,
  );
  await page.goto('/jornadas');
  await initial;
  const refresh = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/season' && response.status() === 200,
  );
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await refresh;
  expect(providerRequests).toEqual([]);
});

test('operación: bundles publicados incluyen administración y filtro de competiciones', async ({
  page,
  request,
}) => {
  await page.goto('/jornadas');
  const bundles = await page
    .locator('script[type="module"][src]')
    .evaluateAll((scripts) => scripts.map((script) => (script as HTMLScriptElement).src));
  expect(bundles.length).toBeGreaterThan(0);
  const main = await request.get(bundles[0]);
  expect(main.status()).toBe(200);
  const mainSource = await main.text();
  const lazyChunks = [...new Set(mainSource.match(/chunk-[A-Z0-9]+\.js/g) ?? [])];
  const sources = await Promise.all(
    lazyChunks.map(async (chunk) => {
      const response = await request.get(`/${chunk}`);
      expect(response.status()).toBe(200);
      return response.text();
    }),
  );
  const admin = sources.find(
    (source) => source.includes('Competiciones') && source.includes('Sincroniz'),
  );
  expect(
    admin,
    'El bundle administrativo desplegado debe contener los paneles recientes',
  ).toBeTruthy();
});
