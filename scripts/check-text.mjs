import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const excluded = new Set([
  'node_modules',
  '.git',
  '.angular',
  '.impeccable',
  '.netlify',
  'dist',
  'out-tsc',
  'test-results',
  'playwright-report',
  'coverage',
]);
const extensions = new Set(['.ts', '.mjs', '.css', '.html', '.json', '.md', '.toml', '.svg']);
const dotFiles = new Set([
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.prettierrc',
  '.prettierignore',
  '.nvmrc',
]);
const fix = process.argv.includes('--fix');
const failures = [];
let count = 0;
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) {
      await inspect(path);
      continue;
    }
    if (!extensions.has(extname(item.name)) && !dotFiles.has(item.name)) continue;
    count++;
    const bytes = await readFile(path);
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      failures.push(`${path}: UTF-8 inválido`);
      continue;
    }
    const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    if (text.includes('\uFFFD')) failures.push(`${path}: carácter de sustitución Unicode`);
    if (bom || text.includes('\r') || !text.endsWith('\n')) {
      if (fix) await writeFile(path, text.replace(/\r\n?/g, '\n').replace(/\n*$/, '\n'), 'utf8');
      else failures.push(`${path}: debe ser UTF-8 sin BOM, LF y salto final`);
    }
  }
}
await inspect('.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`${count} archivos de texto comprobados${fix ? ' y normalizados' : ''}.`);
