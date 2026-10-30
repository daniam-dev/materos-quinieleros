import { expect, test } from '@playwright/test';

// These checks never use real credentials or send authenticated mutations.
// In particular, do not add login retries or rate-limit exhaustion to production.
const origin = 'https://materosquinieleros.netlify.app';

test.describe('API pública y límites de privacidad en producción', () => {
  test('temporada pública disponible con contrato mínimo y referencias coherentes', async ({
    request,
  }) => {
    const response = await request.get('/api/season');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const data = await response.json();
    expect(data.season.id).toEqual(expect.any(String));
    expect(data.season.label).toEqual(expect.any(String));
    expect(Array.isArray(data.participants)).toBe(true);
    expect(Array.isArray(data.journeys)).toBe(true);
    expect(Number.isFinite(Date.parse(data.asOf))).toBe(true);
    expect(new Set(data.participants.map((p: { id: string }) => p.id)).size).toBe(
      data.participants.length,
    );
    expect(
      data.currentJourneyId === null ||
        data.journeys.some((j: { id: string }) => j.id === data.currentJourneyId),
    ).toBe(true);
    test.info().annotations.push({
      type: 'snapshot',
      description: `${data.participants.length} participantes; ${data.journeys.length} jornadas; actual ${data.currentJourneyId ?? 'ninguna'}`,
    });
  });

  test('respuestas públicas sin caché compartida, con nosniff y variación por cookie', async ({
    request,
  }) => {
    const response = await request.get('/api/season');
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['cache-control']).toContain('no-store');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers.vary.toLowerCase()).toContain('cookie');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  test('sin metadatos privados ni secretos en el JSON público', async ({ request }) => {
    const response = await request.get('/api/season');
    expect(response.status()).toBe(200);
    const data = await response.json();
    for (const key of [
      'competitionSettings',
      'journeyCompetitions',
      'revision',
      'snapshot',
      'budget',
      'lease',
    ]) {
      expect(data).not.toHaveProperty(key);
    }
    expect(JSON.stringify(data)).not.toMatch(
      /ADMIN_PASSWORD_HASH|ADMIN_SESSION_SECRET|ODDSPAPI_KEY|mq_session|updatedBy|operationId/,
    );
  });

  test('pronósticos y resultados previos al cierre ocultos cuando existen jornadas abiertas', async ({
    request,
  }) => {
    const response = await request.get('/api/season');
    expect(response.status()).toBe(200);
    const data = await response.json();
    const open = data.journeys.filter(
      (j: { closesAt: string }) => !(Date.parse(j.closesAt) <= Date.parse(data.asOf)),
    );
    test.skip(
      open.length === 0,
      'No hay jornadas abiertas en producción: no se acredita privacidad de un boleto poblado.',
    );
    for (const journey of open) {
      expect(journey.predictions).toEqual([]);
      expect(journey.officialResults).toEqual([]);
      expect(journey.pleno.predictions).toEqual([]);
      expect(journey.pleno).not.toHaveProperty('official');
    }
  });

  test('resultados oficiales publicados no tienen fecha futura cuando existen jornadas', async ({
    request,
  }) => {
    const response = await request.get('/api/season');
    expect(response.status()).toBe(200);
    const data = await response.json();
    test.skip(
      data.journeys.length === 0,
      'No hay jornadas importadas: comprobación de resultados pendiente.',
    );
    for (const journey of data.journeys) {
      for (const result of journey.officialResults) {
        expect(Date.parse(result.publishedAt)).toBeLessThanOrEqual(Date.parse(data.asOf));
      }
      if (journey.pleno.official) {
        expect(Date.parse(journey.pleno.official.publishedAt)).toBeLessThanOrEqual(
          Date.parse(data.asOf),
        );
      }
    }
  });

  test('visitante no puede leer administración ni su revisión privada', async ({ request }) => {
    const response = await request.get('/api/admin');
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.code).toBe('SESSION_REQUIRED');
    expect(data).not.toHaveProperty('snapshot');
    expect(data).not.toHaveProperty('revision');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('cookie fabricada no concede acceso a administración', async ({ request }) => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'daniel-arroyo', exp: Date.now() + 3600000 }),
    ).toString('base64url');
    const response = await request.get('/api/admin', {
      headers: { Cookie: `mq_session=${payload}.${'a'.repeat(43)}` },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).code).toBe('SESSION_REQUIRED');
  });

  test('visitante no puede ejecutar sincronización ni escrituras', async ({ request }) => {
    const response = await request.post('/api/admin', {
      headers: { Origin: origin, 'If-Match': 'invalid-production-test-revision' },
      data: { type: 'sync' },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).code).toBe('SESSION_REQUIRED');
  });

  test('origen ajeno rechazado antes de procesar comandos', async ({ request }) => {
    const response = await request.post('/api/admin', {
      headers: { Origin: 'https://example.org', 'Sec-Fetch-Site': 'cross-site' },
      data: { type: 'sync' },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).message).toContain('otro origen');
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('POST sin origen rechazado', async ({ request }) => {
    const response = await request.post('/api/admin', { data: { type: 'sync' } });
    expect(response.status()).toBe(403);
    expect((await response.json()).message).toContain('otro origen');
  });

  test('temporada pública rechaza escritura incluso con origen correcto', async ({ request }) => {
    const response = await request.post('/api/season', { headers: { Origin: origin }, data: {} });
    expect(response.status()).toBe(405);
    expect((await response.json()).message).toContain('Método no permitido');
  });

  test('configuración de acceso disponible sin exponer usuario autenticado', async ({
    request,
  }) => {
    const response = await request.get('/api/auth');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ configured: true, user: null });
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('método de autenticación no admitido rechazado sin intentar contraseña', async ({
    request,
  }) => {
    const response = await request.put('/api/auth', { headers: { Origin: origin }, data: {} });
    expect(response.status()).toBe(405);
    expect((await response.json()).message).toContain('Método no permitido');
  });

  for (const path of ['/data/season.json', '/server/seed.json', '/.env']) {
    test(`archivo privado ${path} no se sirve como datos`, async ({ request }) => {
      const response = await request.get(path);
      const content = await response.text();
      // The SPA fallback may return HTML 200; that does not expose the source file.
      if (response.status() === 200) {
        expect(response.headers()['content-type']).toContain('text/html');
        expect(content.toLowerCase()).toContain('<!doctype html');
      } else {
        expect([403, 404]).toContain(response.status());
      }
      expect(content).not.toMatch(
        /ADMIN_PASSWORD_HASH=|ADMIN_SESSION_SECRET=|ODDSPAPI_KEY=|"participants"\s*:/,
      );
    });
  }
});
