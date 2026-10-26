import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { getStore } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import { blobStore } from './blob-store.mjs';

test('adaptador Blobs contra servidor local del SDK: persistencia, etag y escrituras condicionales', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'materos-blobs-'));
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  const server = new BlobsServer({ directory, token: 'test-token' });
  try {
    const { port } = await server.start();
    const client = getStore({
      name: 'test',
      siteID: 'test-site',
      token: 'test-token',
      apiURL: `http://127.0.0.1:${port}`,
      consistency: 'strong',
    });
    const store = blobStore(client);
    assert.equal(await store.read(), null);
    const written = await client.setJSON(
      'season',
      { value: 1 },
      { onlyIfNew: true, metadata: { updatedBy: 'admin' } },
    );
    assert.equal(written.modified, true);
    const first = await client.getWithMetadata('season', { type: 'json' });
    assert.deepEqual(first.data, { value: 1 });
    assert.equal(first.metadata.updatedBy, 'admin');
    assert.ok(written.etag);
    // SDK 11.1.6's local emulator omits ETag on GET (PUT includes it).
    // Fail closed rather than accepting an unversioned update in that environment.
    if (!first.etag) await assert.rejects(() => store.read(), /ETag/);
    else assert.deepEqual((await store.read()).data, { value: 1 });
    assert.equal(await store.write({ value: 2 }, null, {}), false);
    assert.equal(await store.write({ value: 3 }, written.etag, {}), true);
    assert.equal(await store.write({ value: 4 }, written.etag, {}), false);
    assert.deepEqual(await client.get('season', { type: 'json' }), { value: 3 });
  } finally {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
