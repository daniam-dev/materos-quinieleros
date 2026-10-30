import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hashPassword } from '../server/auth.mjs';

// Deliberately public fixture credentials: accepted only by this loopback launcher.
export const localTestUsername = 'codex-local';
export const localTestPassword = 'localhost-test-only-2026';

const directory = mkdtempSync(join(tmpdir(), 'materos-local-admin-'));
if (
  dirname(resolve(directory)) !== resolve(tmpdir()) ||
  !directory.includes('materos-local-admin-')
)
  throw new Error('Directorio temporal inesperado.');

const child = spawn(process.execPath, ['scripts/dev.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MQ_LOCAL_TEST_ADMIN: '1',
    MQ_LOCAL_DATA_DIR: directory,
    MQ_TEST_PROVIDERS: '0',
    MQ_TEST_PRODUCTION_PREVIEW: process.argv.includes('--production-preview') ? '1' : '0',
    ADMIN_PASSWORD_HASH: await hashPassword(localTestPassword),
    ADMIN_SESSION_SECRET: randomBytes(48).toString('base64url'),
  },
});
console.log('Administrador de pruebas: codex-local. Datos temporales separados; solo localhost.');
const cleanup = () => {
  child.kill();
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
child.on('error', (error) => {
  console.error(error.message);
  rmSync(directory, { recursive: true, force: true });
  process.exitCode = 1;
});
child.on('exit', (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exitCode = code ?? 0;
});
