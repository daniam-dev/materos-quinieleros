import handler from '../lib/runtime.mjs';
export default handler;
export const config = {
  path: '/api/auth',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowLimit: 20, windowSize: 60 },
};
