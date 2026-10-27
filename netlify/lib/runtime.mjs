import { getStore } from '@netlify/blobs';
import { storeName } from '../../server/store-name.mjs';
import { createApi } from '../../server/api.mjs';
import { blobStore } from '../../server/blob-store.mjs';
import seed from '../../server/seed.json' with { type: 'json' };
import { synchronize } from '../../server/synchronize.mjs';
import { selaeProvider } from '../../server/providers/selae.mjs';
import { oddspapiProvider } from '../../server/providers/oddspapi.mjs';

export function runtimeStores(context) {
  const blobs = getStore({ name: storeName(context?.deploy), consistency: 'strong' });
  return { store: blobStore(blobs), sportsStore: blobStore(blobs, 'sports-v1') };
}
export async function syncSports(context, force = false) {
  const { store, sportsStore } = runtimeStores(context);
  return synchronize({
    sportsStore,
    privateStore: store,
    seed,
    selae: selaeProvider(),
    odds: oddspapiProvider(
      context?.deploy?.context === 'production' ? process.env.ODDSPAPI_KEY : undefined,
    ),
    force,
  });
}

export default async function handler(request, context) {
  // Lazy access also keeps authentication independent of storage availability.
  const storage = () =>
    blobStore(getStore({ name: storeName(context?.deploy), consistency: 'strong' }));
  const store = {
    read: () => storage().read(),
    write: (data, etag, metadata) => storage().write(data, etag, metadata),
  };
  const sportsStore = { read: () => runtimeStores(context).sportsStore.read() };
  return createApi({
    store,
    sportsStore,
    seed,
    env: process.env,
    sync: () => syncSports(context, true),
  })(request);
}
