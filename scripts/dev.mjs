import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createApi } from '../server/api.mjs';
import { localRequest } from '../server/local-request.mjs';

// Local storage is real, separate from Netlify and excluded from version control.
try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const directory = process.env.MQ_LOCAL_DATA_DIR ?? '.netlify/local';
const filename = `${directory}/season.json`;
const seed = JSON.parse(readFileSync('server/seed.json', 'utf8'));
const store = {
  async read() {
    try {
      return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  },
  async write(data, etag, metadata) {
    // No await between read and rename: CAS is atomic within this single local process.
    let current = null;
    try {
      current = JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if ((current?.etag ?? null) !== etag) return false;
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${filename}.tmp`, JSON.stringify({ data, etag: randomUUID(), metadata }) + '\n');
    renameSync(`${filename}.tmp`, filename);
    return true;
  },
};
const api = createApi({ store, seed, env: process.env });
const attempts = new Map();
const server = createServer(async (req, res) => {
  if (req.url === '/api/auth' && req.method === 'POST') {
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    const recent = (attempts.get(ip) ?? []).filter((t) => t > now - 60000);
    if (recent.length >= 20) {
      res.writeHead(429);
      res.end();
      return;
    }
    attempts.set(ip, [...recent, now]);
  }
  try {
    const request = localRequest(req);
    const response = await api(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end();
  }
});
server.listen(8888, '127.0.0.1', () => console.log('API local en 127.0.0.1:8888'));
const child = spawn(
  process.execPath,
  [
    'node_modules/@angular/cli/bin/ng.js',
    'serve',
    '--host',
    '127.0.0.1',
    '--port',
    '4200',
    '--proxy-config',
    'proxy.conf.json',
  ],
  { stdio: 'inherit' },
);
function stop() {
  child.kill();
  server.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => {
  server.close();
  process.exitCode = code ?? 0;
});
