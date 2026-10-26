export function blobStore(blobs) {
  return {
    async read() {
      const entry = await blobs.getWithMetadata('season', { type: 'json' });
      if (entry && !entry.etag) throw new Error('Blobs no ha devuelto una revisión ETag segura.');
      return entry;
    },
    async write(data, etag, metadata) {
      const result = await blobs.setJSON('season', data, {
        metadata,
        ...(etag ? { onlyIfMatch: etag } : { onlyIfNew: true }),
      });
      return result.modified;
    },
  };
}
