import { createHash } from 'node:crypto';

/** Use trusted runtime metadata: build-time env vars need not exist in Functions. */
export function storeName(deploy) {
  if (deploy?.context === 'production') return 'quinielas-production';
  if (!deploy?.context || !deploy?.id)
    throw new Error('Falta el contexto de despliegue de Netlify.');
  const hash = createHash('sha256')
    .update(JSON.stringify([deploy.context, deploy.id]))
    .digest('hex')
    .slice(0, 24);
  return `quinielas-${hash}`;
}
