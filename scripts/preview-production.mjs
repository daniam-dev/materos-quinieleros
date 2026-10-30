// Local-only preview of the exact optimized frontend, using the same loopback API.
import { createServer, request as proxyRequest } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';

const directory = resolve('dist/materos-quinieleros/browser');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  if (!['127.0.0.1:4200', 'localhost:4200'].includes(req.headers.host)) {
    res.writeHead(403).end();
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1:4200');
  if (url.pathname.startsWith('/api/')) {
    const upstream = proxyRequest(
      {
        hostname: '127.0.0.1',
        port: 8888,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(url.pathname);
    let file = resolve(directory, '.' + pathname);
    const rel = relative(directory, file);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      res.writeHead(403).end();
      return;
    }
    let info;
    try {
      info = await stat(file);
    } catch {
      /* checked below */
    }
    if (!info?.isFile()) {
      if (extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      file = resolve(directory, 'index.html');
      info = await stat(file);
    }
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') res.end();
    else
      createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(4200, '127.0.0.1', () =>
  console.log('Build de producción local en http://127.0.0.1:4200'),
);
const stop = () => server.close();
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
