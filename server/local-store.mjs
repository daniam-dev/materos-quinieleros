import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// CAS is atomic within the single local development process. Not a production adapter.
export function localStore(directory, key) {
  const filename = `${directory}/${key}.json`;
  function read() {
    try {
      return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  return {
    async read() {
      return read();
    },
    async write(data, etag, metadata) {
      if ((read()?.etag ?? null) !== etag) return false;
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        `${filename}.tmp`,
        JSON.stringify({ data, etag: randomUUID(), metadata }) + '\n',
      );
      renameSync(`${filename}.tmp`, filename);
      return true;
    },
  };
}
