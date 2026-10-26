import { getStore } from '@netlify/blobs';
import { storeName } from '../../server/store-name.mjs';
import { createApi } from '../../server/api.mjs';
import { blobStore } from '../../server/blob-store.mjs';
import seed from '../../server/seed.json' with { type: 'json' };

export default async function handler(request, context) {
  // Lazy access also keeps authentication independent of storage availability.
  const storage = () =>
    blobStore(getStore({ name: storeName(context?.deploy), consistency: 'strong' }));
  const store = {
    read: () => storage().read(),
    write: (data, etag, metadata) => storage().write(data, etag, metadata),
  };
  return createApi({ store, seed, env: process.env })(request);
}
