export function blobStore(blobs, key = 'season') {
  return {
    async read() {
      const entry = await blobs.getWithMetadata(key, { type: 'json' });
      if (entry && !entry.etag) throw new Error('Blobs no ha devuelto una revisión ETag segura.');
      return entry;
    },
    async write(data, etag, metadata) {
      const result = await blobs.setJSON(key, data, {
        metadata,
        ...(etag ? { onlyIfMatch: etag } : { onlyIfNew: true }),
      });
      return result.modified;
    },
  };
}
