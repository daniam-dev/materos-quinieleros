import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './api.mjs';
import { hashPassword } from './auth.mjs';

const password = 'localhost-test-only-2026';
const env = {
  ADMIN_PASSWORD_HASH: await hashPassword(password),
  ADMIN_SESSION_SECRET: 'local-fixture-secret-'.repeat(4),
  // Netlify environment flags must never enable another production login.
  MQ_LOCAL_TEST_ADMIN: '1',
  MQ_TEST_PRODUCTION_PREVIEW: '1',
  ADMIN_USERNAME: 'codex-local',
};
const options = { store: {}, seed: {}, env };
const local = createApi({ ...options, adminUsername: 'codex-local' });
const production = createApi(options);

function request(
  api,
  origin,
  { username = 'codex-local', secret = password, cookie, method = 'POST', headers = {} } = {},
) {
  return api(
    new Request(`${origin}/api/auth`, {
      method,
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(method === 'POST' ? { body: JSON.stringify({ username, password: secret }) } : {}),
    }),
  );
}

test('alternate test username uses the existing hashed password and signed owner session', async () => {
  for (const origin of ['http://localhost:4200', 'http://127.0.0.1:4200']) {
    const response = await request(local, origin);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, 'daniel-arroyo');
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /Path=\/api; HttpOnly; SameSite=Strict/);
    assert.doesNotMatch(cookie, /localhost-test-only/);
    const session = await request(local, origin, { method: 'GET', cookie });
    assert.equal((await session.json()).user.role, 'admin');
    const logout = await request(local, origin, { method: 'DELETE', cookie });
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  }
  assert.equal((await request(local, 'http://localhost:4200', { secret: 'wrong' })).status, 401);
  assert.equal(
    (await request(local, 'http://localhost:4200', { username: 'daniel-arroyo' })).status,
    401,
  );
});

test('test account is unavailable on production despite spoofed environment settings', async () => {
  for (const origin of ['https://materosquinieleros.netlify.app', 'http://localhost:4200']) {
    assert.equal((await request(production, origin)).status, 401);
    assert.equal((await request(production, origin, { username: 'daniel-arroyo' })).status, 200);
  }
  const login = await request(local, 'http://localhost:4200');
  const separateProduction = createApi({
    ...options,
    env: { ...env, ADMIN_SESSION_SECRET: 'different-production-secret-'.repeat(3) },
  });
  const session = await request(separateProduction, 'https://materosquinieleros.netlify.app', {
    method: 'GET',
    cookie: login.headers.get('set-cookie'),
  });
  assert.equal((await session.json()).user, null);
});

test('alternate login rejects remote hosts, HTTPS and mixed local origins on all routes', async () => {
  for (const origin of [
    'https://materosquinieleros.netlify.app',
    'http://localhost.evil.test:4200',
    'http://192.168.1.20:4200',
    'https://localhost:4200',
    'http://localhost:4300',
  ]) {
    assert.equal((await request(local, origin)).status, 403);
    assert.equal((await request(local, origin, { method: 'GET' })).status, 403);
  }
  assert.equal(
    (
      await request(local, 'http://localhost:4200', {
        headers: { Origin: 'http://127.0.0.1:4200' },
      })
    ).status,
    403,
  );
});
