import { randomUUID } from 'node:crypto';
import { adminId, authenticated, configured, sessionCookie, verifyPassword } from './auth.mjs';
import { ApiError, applyCommand, publicSeason } from './domain.mjs';
import { mergeSports, privateUpdate } from './sports-data.mjs';

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
      ...headers,
    },
  });
}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'Envía datos en formato JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Faltan los datos.');
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      throw new ApiError(413, 'La solicitud es demasiado grande.');
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'JSON no válido.');
  }
}

/** store: read() -> {data, etag} | null; write(data, etag) -> boolean (compare-and-swap). */
export function createApi({ store, seed, env, sportsStore, sync, clock = Date.now }) {
  return async (request) => {
    try {
      const now = clock();
      const url = new URL(request.url);
      const isAdmin = authenticated(request, env, now);
      if (request.method !== 'GET') {
        if (
          request.headers.get('origin') !== url.origin ||
          request.headers.get('sec-fetch-site') === 'cross-site'
        )
          throw new ApiError(403, 'Solicitud de otro origen rechazada.');
      }
      if (url.pathname === '/api/auth') {
        if (request.method === 'GET')
          return json({
            configured: configured(env),
            user: isAdmin ? { id: adminId, name: 'Daniel Arroyo', role: 'admin' } : null,
          });
        if (request.method === 'DELETE')
          return json({ user: null }, 200, {
            'Set-Cookie': sessionCookie(env, now, url.protocol === 'https:', true),
          });
        if (request.method !== 'POST') throw new ApiError(405, 'Método no permitido.');
        if (!configured(env))
          throw new ApiError(503, 'El acceso de administrador aún no está configurado.');
        const credentials = await body(request);
        if (
          typeof credentials?.password !== 'string' ||
          credentials.password.length > 256 ||
          typeof credentials?.username !== 'string'
        )
          throw new ApiError(400, 'Introduce usuario y contraseña.');
        const valid = await verifyPassword(credentials.password, env.ADMIN_PASSWORD_HASH);
        if (!valid || credentials.username !== adminId)
          throw new ApiError(401, 'Usuario o contraseña incorrectos.');
        return json({ user: { id: adminId, name: 'Daniel Arroyo', role: 'admin' } }, 200, {
          'Set-Cookie': sessionCookie(env, now, url.protocol === 'https:'),
        });
      }
      if (!['/api/season', '/api/admin'].includes(url.pathname))
        throw new ApiError(404, 'Ruta no encontrada.');
      if (url.pathname === '/api/admin' && !isAdmin)
        throw new ApiError(403, 'Necesitas acceder como administrador.', 'SESSION_REQUIRED');
      if (request.method !== 'GET' && !(url.pathname === '/api/admin' && request.method === 'POST'))
        throw new ApiError(405, 'Método no permitido.');
      const stored = await store.read();
      const original = stored?.data ?? seed;
      const sports = sportsStore ? (await sportsStore.read())?.data : null;
      const snapshot = mergeSports(original, sports, now);
      const revision = stored?.etag ?? 'initial';
      if (request.method === 'GET') {
        if (url.pathname === '/api/season') return json(publicSeason(snapshot, now));
        return json({ snapshot: { ...snapshot, asOf: new Date(now).toISOString() }, revision });
      }
      if (request.headers.get('if-match') !== revision)
        throw new ApiError(
          409,
          'Los datos han cambiado. Recarga el panel antes de volver a guardar.',
        );
      const command = await body(request);
      if (command?.type === 'sync') {
        if (!sync) throw new ApiError(503, 'La sincronización no está configurada.');
        return json(await sync());
      }
      const next = privateUpdate(original, applyCommand(snapshot, command), command);
      // Store metadata is private and does not become part of the public snapshot.
      const modified = await store.write(next, stored?.etag ?? null, {
        updatedAt: new Date(now).toISOString(),
        updatedBy: adminId,
        operationId: randomUUID(),
      });
      if (!modified) throw new ApiError(409, 'Otra sesión ha guardado cambios. Recarga el panel.');
      // Do not read again: another concurrent edit could give this client the wrong revision.
      return json({ saved: true });
    } catch (error) {
      if (error instanceof ApiError)
        return json(
          { message: error.message, ...(error.code ? { code: error.code } : {}) },
          error.status,
        );
      console.error('API failure:', error instanceof Error ? error.message : 'unknown');
      return json({ message: 'No se ha podido completar la operación. Vuelve a intentarlo.' }, 503);
    }
  };
}
