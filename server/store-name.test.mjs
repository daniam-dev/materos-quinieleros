import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeName } from './store-name.mjs';

test('contexto runtime: producción persiste y los previews se aíslan por deploy; sin contexto falla cerrado', () => {
  assert.equal(storeName({ context: 'production', id: 'first' }), 'quinielas-production');
  assert.equal(storeName({ context: 'production', id: 'next' }), 'quinielas-production');
  const preview = storeName({ context: 'deploy-preview', id: 'first' });
  assert.notEqual(preview, 'quinielas-production');
  assert.notEqual(preview, storeName({ context: 'deploy-preview', id: 'next' }));
  assert.notEqual(preview, storeName({ context: 'branch-deploy', id: 'first' }));
  assert.equal(preview, storeName({ context: 'deploy-preview', id: 'first' }));
  assert.throws(() => storeName(undefined), /contexto/);
  assert.throws(() => storeName({ context: 'deploy-preview' }), /contexto/);
});
