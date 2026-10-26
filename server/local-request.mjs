const allowedHosts = new Set([
  '127.0.0.1:4200',
  'localhost:4200',
  '127.0.0.1:8888',
  'localhost:8888',
]);

/** Preserve the browser's local host through Angular's proxy without trusting arbitrary hosts. */
export function localRequest(incoming) {
  const host = incoming.headers.host;
  if (!allowedHosts.has(host)) throw new Error('Host local no permitido.');
  const origin = `http://${host}`;
  const url = new URL(incoming.url, origin);
  if (url.origin !== origin) throw new Error('URL local no permitida.');
  return new Request(url, {
    method: incoming.method,
    headers: incoming.headers,
    ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: incoming, duplex: 'half' } : {}),
  });
}
