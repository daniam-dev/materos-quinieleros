import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { hashPassword } from '../server/auth.mjs';

if (!process.stdin.isTTY) throw new Error('Ejecuta admin:setup desde una terminal interactiva.');
async function password(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      if (chunk.includes('\u0003')) {
        finish();
        reject(new Error('Cancelado.'));
        return;
      }
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    function finish() {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    }
    process.stdin.on('data', onData);
  });
}
const first = await password('Contraseña de Daniel Arroyo (mínimo 12 caracteres): ');
if (first.length < 12 || first.length > 256) throw new Error('Usa entre 12 y 256 caracteres.');
if (first !== (await password('Repite la contraseña: ')))
  throw new Error('Las contraseñas no coinciden.');
let existing = '';
try {
  existing = readFileSync('.env', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const kept = existing
  .split(/\r?\n/)
  .filter((line) => !/^ADMIN_(PASSWORD_HASH|SESSION_SECRET)=/.test(line) && line);
writeFileSync(
  '.env',
  [
    ...kept,
    `ADMIN_PASSWORD_HASH=${await hashPassword(first)}`,
    `ADMIN_SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
);
console.log('Acceso configurado en .env. Usuario: daniel-arroyo. Reinicia npm start.');
