import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { localStore } from '../server/local-store.mjs';
import { synchronize } from '../server/synchronize.mjs';
import { selaeProvider } from '../server/providers/selae.mjs';
import { oddspapiProvider } from '../server/providers/oddspapi.mjs';
import { spawn } from 'node:child_process';
import { createApi } from '../server/api.mjs';
import { localRequest } from '../server/local-request.mjs';

// Local storage is real, separate from Netlify and excluded from version control.
const testAdmin = process.env.MQ_LOCAL_TEST_ADMIN === '1';
if (!testAdmin) {
  try {
    process.loadEnvFile('.env');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
if (testAdmin && !process.env.MQ_LOCAL_DATA_DIR)
  throw new Error('El administrador de pruebas requiere almacenamiento aislado.');
const directory = process.env.MQ_LOCAL_DATA_DIR ?? '.netlify/local';
const seed = JSON.parse(readFileSync('server/seed.json', 'utf8'));
const store = localStore(directory, 'season');
const sportsStore = localStore(directory, 'sports-v1');
const selae =
  process.env.MQ_TEST_PROVIDERS === '1' && process.env.MQ_LOCAL_DATA_DIR
    ? (await import('../server/testing/providers.mjs')).e2eSelae()
    : selaeProvider();
const sync = () =>
  synchronize({
    privateStore: store,
    sportsStore,
    seed,
    selae,
    odds: oddspapiProvider(undefined),
    force: true,
    selectedOnly: !(process.env.MQ_TEST_PROVIDERS === '1' && process.env.MQ_LOCAL_DATA_DIR),
  });
const api = createApi({
  store,
  sportsStore,
  seed,
  env: process.env,
  sync,
  ...(testAdmin ? { adminUsername: 'codex-local' } : {}),
});
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
  process.env.MQ_TEST_PRODUCTION_PREVIEW === '1'
    ? ['scripts/preview-production.mjs']
    : [
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
