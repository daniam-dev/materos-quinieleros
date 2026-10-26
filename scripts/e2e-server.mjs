import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hashPassword } from '../server/auth.mjs';

const directory = mkdtempSync(join(tmpdir(), 'materos-e2e-'));
// Confirm the recursive cleanup target is our own direct child of the system temp folder.
if (dirname(resolve(directory)) !== resolve(tmpdir()) || !directory.includes('materos-e2e-')) {
  throw new Error('Directorio temporal inesperado.');
}
const child = spawn(process.execPath, ['scripts/dev.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MQ_LOCAL_DATA_DIR: directory,
    ADMIN_PASSWORD_HASH: await hashPassword('e2e-only-password'),
    ADMIN_SESSION_SECRET: randomBytes(48).toString('base64url'),
  },
});
const cleanup = () => {
  child.kill();
  rmSync(directory, { recursive: true, force: true });
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
child.on('exit', (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exitCode = code ?? 0;
});
