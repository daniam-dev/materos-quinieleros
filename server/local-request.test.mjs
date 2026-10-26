import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createApi } from './api.mjs';
import { hashPassword } from './auth.mjs';
import { localRequest } from './local-request.mjs';

const env = {
  ADMIN_PASSWORD_HASH: await hashPassword('local-test-password'),
  ADMIN_SESSION_SECRET: 'local-test-secret-'.repeat(4),
};
const api = createApi({ store: {}, seed: {}, env });
function request(host, origin = `http://${host}`, extra = {}) {
  return Object.assign(
    Readable.from([JSON.stringify({ username: 'daniel-arroyo', password: 'local-test-password' })]),
    {
      url: '/api/auth',
      method: 'POST',
      headers: { host, origin, 'content-type': 'application/json', ...extra },
    },
  );
}
test('login local correcto desde localhost y 127.0.0.1 con el host preservado por el proxy', async () => {
  for (const host of ['localhost:4200', '127.0.0.1:4200']) {
    const response = await api(localRequest(request(host)));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /mq_session=.+; Path=\/api; HttpOnly/);
  }
});
test('se siguen rechazando otros orígenes aunque ambos hosts sean locales', async () => {
  for (const origin of ['http://evil.test', 'http://127.0.0.1:4200', 'null']) {
    const response = await api(localRequest(request('localhost:4200', origin)));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: 'Solicitud de otro origen rechazada.' });
  }
});
test('no acepta Host arbitrario ni confía en X-Forwarded-Host', () => {
  assert.throws(() => localRequest(request('evil.test')), /Host/);
  assert.throws(() => localRequest(request('localhost.evil.test:4200')), /Host/);
  const spoofed = request('localhost:4200', 'http://localhost:4200', {
    'x-forwarded-host': 'evil.test',
  });
  assert.equal(new URL(localRequest(spoofed).url).origin, 'http://localhost:4200');
  const absolute = request('localhost:4200');
  absolute.url = 'http://evil.test/api/auth';
  assert.throws(() => localRequest(absolute), /URL/);
});
