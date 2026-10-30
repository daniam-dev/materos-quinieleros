import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createApi } from './api.mjs';
import { hashPassword } from './auth.mjs';
import { publicSeason } from './domain.mjs';

const seed = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));
const env = {
  ADMIN_PASSWORD_HASH: await hashPassword('test-password-123'),
  ADMIN_SESSION_SECRET: 'x'.repeat(48),
};
const origin = 'https://quinielas.test';
const start = Date.parse('2026-10-26T10:00:00Z');

function setup(options = {}) {
  let stored = null;
  let now = start;
  const store = {
    async read() {
      return structuredClone(stored);
    },
    async write(data, etag, metadata) {
      if ((stored?.etag ?? null) !== etag) return false;
      stored = { data: structuredClone(data), etag: randomUUID(), metadata };
      return true;
    },
  };
  const api = createApi({
    store,
    seed: structuredClone(seed),
    env: options.env ?? env,
    sync: options.sync,
    clock: () => now,
  });
  const request = (path, { method = 'GET', body, cookie = '', revision, headers = {} } = {}) =>
    api(
      new Request(origin + path, {
        method,
        headers: {
          Origin: origin,
          Cookie: cookie,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(revision ? { 'If-Match': revision } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  const login = async () => {
    const result = await request('/api/auth', {
      method: 'POST',
      body: { username: 'daniel-arroyo', password: 'test-password-123' },
    });
    assert.equal(result.status, 200);
    return result.headers.get('set-cookie').split(';')[0];
  };
  return {
    request,
    login,
    store,
    setTime: (value) => {
      now = value;
    },
  };
}

const journeyCommand = {
  type: 'create-journey',
  number: 1,
  competition: 'league',
  closesAt: '2026-10-27T10:00:00Z',
  fixtures: Array.from({ length: 15 }, (_, i) => ({
    home: `Local ${i + 1}`,
    away: `Visitante ${i + 1}`,
    kickoff: '2026-10-27T11:00:00Z',
  })),
};

test('visitante: lectura pública, administración y escrituras rechazadas, rol falsificado ignorado', async () => {
  const { request } = setup();
  assert.equal((await request('/api/season')).status, 200);
  assert.equal((await request('/api/admin')).status, 403);
  assert.equal(
    (await request('/api/admin', { method: 'POST', body: { type: 'add-participant' } })).status,
    403,
  );
  assert.equal(
    (await request('/api/admin', { cookie: 'role=admin; participantId=daniel-arroyo' })).status,
    403,
  );
  assert.equal((await request('/api/season', { method: 'POST', body: {} })).status, 405);
});

test('login, cookie protegida, credenciales incorrectas, manipulación, expiración y rotación de secretos', async () => {
  const ctx = setup();
  const failed = await ctx.request('/api/auth', {
    method: 'POST',
    body: { username: 'otro', password: 'test-password-123' },
  });
  assert.equal(failed.status, 401);
  const incorrect = await ctx.request('/api/auth', {
    method: 'POST',
    body: { username: 'daniel-arroyo', password: 'wrong' },
  });
  assert.equal(incorrect.status, 401);
  const result = await ctx.request('/api/auth', {
    method: 'POST',
    body: { username: 'daniel-arroyo', password: 'test-password-123' },
  });
  assert.match(
    result.headers.get('set-cookie'),
    /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/,
  );
  const cookie = result.headers.get('set-cookie').split(';')[0];
  assert.equal((await ctx.request('/api/admin', { cookie })).status, 200);
  const session = await (await ctx.request('/api/auth', { cookie })).json();
  assert.equal(session.user.id, 'daniel-arroyo');
  assert.equal((await ctx.request('/api/admin', { cookie: cookie + 'tampered' })).status, 403);
  const rotated = setup({ env: { ...env, ADMIN_SESSION_SECRET: 'y'.repeat(48) } });
  assert.equal((await rotated.request('/api/admin', { cookie })).status, 403);
  const passwordRotated = setup({
    env: { ...env, ADMIN_PASSWORD_HASH: await hashPassword('another-password') },
  });
  assert.equal((await passwordRotated.request('/api/admin', { cookie })).status, 403);
  ctx.setTime(start + 8 * 60 * 60 * 1000);
  assert.equal((await ctx.request('/api/admin', { cookie })).status, 403);
});

test('logout borra la cookie y los cambios exigen mismo origen y JSON acotado', async () => {
  const { request, login } = setup();
  const cookie = await login();
  const logout = await request('/api/auth', { method: 'DELETE', cookie });
  assert.match(logout.headers.get('set-cookie'), /mq_session=;.*Max-Age=0/);
  assert.equal(
    (
      await request('/api/admin', {
        method: 'POST',
        cookie,
        body: {},
        headers: { Origin: 'https://evil.test' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request('/api/auth', { method: 'POST', body: {}, headers: { Origin: '' } })).status,
    403,
  );
  assert.equal(
    (
      await request('/api/auth', {
        method: 'POST',
        body: {},
        headers: { 'Content-Type': 'text/plain' },
      })
    ).status,
    415,
  );
  assert.equal(
    (await request('/api/auth', { method: 'POST', body: { password: 'x'.repeat(33000) } })).status,
    413,
  );
});

test('sin secretos válidos: falla cerrado, sin sesión falsa, lectura pública disponible', async () => {
  const { request } = setup({ env: {} });
  assert.deepEqual(await (await request('/api/auth')).json(), { configured: false, user: null });
  assert.equal((await request('/api/auth', { method: 'POST', body: {} })).status, 503);
  assert.equal((await request('/api/admin')).status, 403);
  assert.equal((await request('/api/season')).status, 200);
});

test('alta, baja y reincorporación persisten; no se puede elevar rol ni desactivar al admin', async () => {
  const ctx = setup();
  const cookie = await ctx.login();
  const get = async () => (await ctx.request('/api/admin', { cookie })).json();
  const save = async (body) =>
    ctx.request('/api/admin', { method: 'POST', cookie, body, revision: (await get()).revision });
  assert.equal(
    (await save({ type: 'add-participant', name: 'Ana', surname: 'Pérez', role: 'admin' })).status,
    200,
  );
  const added = (await get()).snapshot.participants.at(-1);
  assert.equal(added.role, 'participant');
  assert.equal(added.initials, 'AP');
  assert.equal(
    (await save({ type: 'set-active', participantId: 'daniel-arroyo', active: false })).status,
    400,
  );
  assert.equal(
    (await save({ type: 'set-active', participantId: added.id, active: false })).status,
    200,
  );
  assert.equal((await get()).snapshot.participants.at(-1).active, false);
  assert.equal(
    (await save({ type: 'set-active', participantId: added.id, active: true })).status,
    200,
  );
  assert.equal((await get()).snapshot.participants.at(-1).active, true);
  assert.equal(
    (await save({ type: 'add-participant', name: 'Ana', surname: 'Pérez' })).status,
    400,
  );
});

test('jornada, quiniela completa y corrección; privacidad antes del cierre y conservación del histórico al dar baja', async () => {
  const ctx = setup();
  let cookie = await ctx.login();
  const get = async () => (await ctx.request('/api/admin', { cookie })).json();
  const save = async (body) =>
    ctx.request('/api/admin', { method: 'POST', cookie, body, revision: (await get()).revision });
  assert.equal((await save(journeyCommand)).status, 200);
  const id = (await get()).snapshot.currentJourneyId;
  assert.equal((await save(journeyCommand)).status, 400);
  const command = {
    type: 'save-predictions',
    journeyId: id,
    participantId: 'lucas-calvo',
    signs: Array(14).fill('1'),
    pleno: { home: 'M', away: '2' },
  };
  assert.equal((await save({ ...command, signs: ['1'] })).status, 400);
  assert.equal((await save({ ...command, signs: Array(14).fill('3') })).status, 400);
  assert.equal((await save({ ...command, pleno: { home: '3', away: '2' } })).status, 400);
  assert.equal((await save(command)).status, 200);
  const first = (await get()).snapshot.journeys[0];
  assert.equal(first.predictions.length, 14);
  assert.equal(first.pleno.predictions.length, 1);
  assert.deepEqual(first.participantIds, ['lucas-calvo']);
  const publicBefore = await (await ctx.request('/api/season', { cookie })).json();
  assert.deepEqual(publicBefore.journeys[0].predictions, []);
  assert.deepEqual(publicBefore.journeys[0].pleno.predictions, []);
  assert.match((await ctx.request('/api/season')).headers.get('cache-control'), /no-store/);
  assert.equal((await save({ ...command, signs: Array(14).fill('X') })).status, 200);
  assert.equal(
    (await save({ type: 'set-active', participantId: 'lucas-calvo', active: false })).status,
    200,
  );
  const historical = (await get()).snapshot.journeys[0];
  assert.equal(historical.predictions.length, 14);
  assert.equal(historical.predictions[0].sign, 'X');
  ctx.setTime(Date.parse(journeyCommand.closesAt));
  cookie = await ctx.login();
  const publicAfter = await (await ctx.request('/api/season')).json();
  assert.equal(publicAfter.journeys[0].predictions.length, 14);
  assert.equal(publicAfter.journeys[0].pleno.predictions[0].home, 'M');
  assert.equal((await save({ type: 'set-current', journeyId: 'missing' })).status, 400);
  assert.equal((await save({ type: 'set-current', journeyId: null })).status, 200);
  assert.equal((await get()).snapshot.currentJourneyId, null);
});

test('jornada inválida rechaza cierre posterior al partido y entradas incompletas', async () => {
  const ctx = setup();
  const cookie = await ctx.login();
  for (const command of [
    { ...journeyCommand, fixtures: [] },
    { ...journeyCommand, number: -1 },
    { ...journeyCommand, competition: 'other' },
    { ...journeyCommand, closesAt: '2026-10-28T10:00:00Z' },
    { ...journeyCommand, closesAt: '2026-10-27T10:00:00' },
    {
      ...journeyCommand,
      fixtures: Array(15).fill({ home: 'A', away: 'A', kickoff: '2026-10-27T11:00:00Z' }),
    },
  ]) {
    const result = await ctx.request('/api/admin', {
      method: 'POST',
      cookie,
      body: command,
      revision: 'initial',
    });
    assert.equal(result.status, 400);
  }
});

test('revisión obsoleta y escrituras simultáneas no pisan cambios', async () => {
  const ctx = setup();
  const cookie = await ctx.login();
  const save = (name) =>
    ctx.request('/api/admin', {
      method: 'POST',
      cookie,
      revision: 'initial',
      body: { type: 'add-participant', name, surname: 'Prueba' },
    });
  const responses = await Promise.all([save('Uno'), save('Dos')]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await save('Tres')).status, 409);
  const state = await (await ctx.request('/api/admin', { cookie })).json();
  assert.equal(state.snapshot.participants.length, seed.participants.length + 1);
});

test('revisión de aplicación atraviesa un proxy que consume If-Match sin permitir escrituras obsoletas', async () => {
  const ctx = setup();
  const cookie = await ctx.login();
  const get = async () => (await ctx.request('/api/admin', { cookie })).json();
  const initial = await get();
  assert.equal(initial.revision, 'initial');
  const save = (headers = {}) =>
    ctx.request('/api/admin', {
      method: 'POST',
      cookie,
      body: { type: 'add-participant', name: 'Proxy', surname: 'Prueba' },
      // No If-Match reaches the function, matching the hosting proxy behavior.
      headers,
    });
  assert.equal((await save()).status, 409);
  assert.equal((await save({ 'X-MQ-Revision': 'stale' })).status, 409);
  assert.equal((await get()).snapshot.participants.length, seed.participants.length);
  assert.equal((await save({ 'X-MQ-Revision': initial.revision })).status, 200);
  const updated = await get();
  assert.notEqual(updated.revision, initial.revision);
  assert.equal(updated.snapshot.participants.length, seed.participants.length + 1);
  assert.equal((await save({ 'X-MQ-Revision': initial.revision })).status, 409);
  // A stale application revision cannot be bypassed by a matching legacy header.
  assert.equal(
    (await save({ 'X-MQ-Revision': initial.revision, 'If-Match': updated.revision })).status,
    409,
  );
  assert.equal((await get()).snapshot.participants.length, seed.participants.length + 1);
});

test('sincronización manual acepta la revisión dedicada y conserva la revisión privada', async () => {
  let calls = 0;
  const ctx = setup({
    sync: async () => {
      calls += 1;
      return { synchronized: true };
    },
  });
  const cookie = await ctx.login();
  const before = await (await ctx.request('/api/admin', { cookie })).json();
  const sync = (headers = {}) =>
    ctx.request('/api/admin', { method: 'POST', cookie, body: { type: 'sync' }, headers });
  assert.equal((await sync()).status, 409);
  assert.equal((await sync({ 'X-MQ-Revision': 'stale' })).status, 409);
  assert.equal(calls, 0);
  const result = await sync({ 'X-MQ-Revision': before.revision });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { synchronized: true });
  assert.equal(calls, 1);
  const after = await (await ctx.request('/api/admin', { cookie })).json();
  assert.equal(after.revision, before.revision);
  assert.deepEqual(after.snapshot, before.snapshot);
});

test('resultados futuros y pleno no se filtran al público antes de publicarse', () => {
  const fixture = { id: 'f' };
  const snapshot = {
    ...seed,
    journeys: [
      {
        closesAt: '2026-10-25T10:00:00Z',
        predictions: [],
        officialResults: [{ fixtureId: 'f', publishedAt: '2026-10-27T10:00:00Z', sign: '1' }],
        pleno: {
          fixture,
          predictions: [],
          official: { home: 'M', away: '0', publishedAt: '2026-10-27T10:00:00Z' },
        },
      },
    ],
  };
  const result = publicSeason(snapshot, start);
  assert.deepEqual(result.journeys[0].officialResults, []);
  assert.equal(result.journeys[0].pleno.official, undefined);
});
