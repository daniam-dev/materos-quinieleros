import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selaeProvider, selaeDiagnostic } from './providers/selae.mjs';
import { synchronize } from './synchronize.mjs';
import { draw, memoryStore } from './testing/providers.mjs';
import seed from './seed.json' with { type: 'json' };

const noDraw = 'No se ha encontrado ningún registro para los parámetros introducidos.';

test('SELAE: una fecha sin sorteo no marca error ni impide importar la jornada disponible', async () => {
  const coupon = draw();
  const provider = selaeProvider(async (url) => {
    if (url.pathname.endsWith('fechav3')) return Response.json(noDraw);
    if (url.pathname.endsWith('proximosv3'))
      return Response.json([{ ...coupon, fecha: coupon.fecha_sorteo }]);
    return Response.json([coupon]);
  });
  assert.deepEqual(await provider.recent('2026-10-30'), []);
  const sportsStore = memoryStore();
  const result = await synchronize({
    sportsStore,
    privateStore: memoryStore(),
    seed,
    selae: provider,
    odds: { configured: false },
    clock: () => Date.parse('2026-10-30T12:00:00Z'),
  });
  assert.equal(result.synchronized, true);
  assert.equal(result.status.selae.state, 'ok');
  assert.equal(result.status.odds.state, 'unconfigured');
  assert.equal((await sportsStore.read()).data.journeys.length, 1);
});

test('SELAE: texto arbitrario sigue rechazado; no se trata un fallo como fecha vacía', async () => {
  const provider = selaeProvider(async () => Response.json('upstream internal error'));
  await assert.rejects(provider.recent('2026-10-30'), (error) => {
    assert.deepEqual(selaeDiagnostic(error), { service: 'fechav3', reason: 'invalid-response' });
    return true;
  });
});

test('SELAE: diagnóstico limitado conserva etapa y HTTP sin copiar respuesta ni URL', async () => {
  const sportsStore = memoryStore();
  const provider = selaeProvider(
    async () => new Response('private upstream diagnostic', { status: 403 }),
  );
  await synchronize({
    sportsStore,
    privateStore: memoryStore(),
    seed,
    selae: provider,
    odds: { configured: false },
    clock: () => Date.parse('2026-10-30T12:00:00Z'),
  });
  const state = (await sportsStore.read()).data.sync.selae;
  assert.equal(state.state, 'error');
  assert.match(state.message, /HTTP 403/);
  assert.deepEqual(state.diagnostics, [
    { service: 'proximosv3', reason: 'http-403' },
    { service: 'fechav3', reason: 'http-403' },
  ]);
  assert.doesNotMatch(JSON.stringify(state), /private upstream|https:/);
});

test('SELAE: timeout y JSON inválido se distinguen sin detalles internos', async () => {
  for (const [fetcher, reason] of [
    [
      async () => {
        throw new DOMException('internal URL', 'TimeoutError');
      },
      'timeout',
    ],
    [async () => new Response('<html>internal details</html>'), 'invalid-json'],
  ]) {
    await assert.rejects(selaeProvider(fetcher).discover(), (error) => {
      assert.deepEqual(selaeDiagnostic(error), { service: 'proximosv3', reason });
      return true;
    });
  }
});
