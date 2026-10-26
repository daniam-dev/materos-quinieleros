import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const lifetime = 8 * 60 * 60;
export const adminId = 'daniel-arroyo';

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export function configured(env) {
  return (
    /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH ?? '') &&
    (env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32
  );
}

export async function verifyPassword(password, encoded) {
  const [salt, expected] = encoded.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

function signature(value, env) {
  // Rotating either secret invalidates all existing sessions.
  return createHmac('sha256', env.ADMIN_SESSION_SECRET)
    .update(`${value}:${env.ADMIN_PASSWORD_HASH}`)
    .digest('base64url');
}

export function sessionCookie(env, now, secure, clear = false) {
  const value = Buffer.from(
    JSON.stringify({
      sub: adminId,
      exp: now + lifetime * 1000,
      nonce: randomBytes(16).toString('hex'),
    }),
  ).toString('base64url');
  const token = clear ? '' : `${value}.${signature(value, env)}`;
  return `mq_session=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : lifetime}${secure ? '; Secure' : ''}`;
}

export function authenticated(request, env, now) {
  if (!configured(env)) return false;
  try {
    const token = request.headers
      .get('cookie')
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('mq_session='))
      ?.slice('mq_session='.length);
    if (!token || token.length > 1024) return false;
    const [value, mac, extra] = token.split('.');
    if (!value || !mac || extra) return false;
    const expected = Buffer.from(signature(value, env));
    const actual = Buffer.from(mac);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const session = JSON.parse(Buffer.from(value, 'base64url').toString());
    return (
      session.sub === adminId &&
      Number.isFinite(session.exp) &&
      session.exp > now &&
      session.exp <= now + lifetime * 1000
    );
  } catch {
    return false;
  }
}
