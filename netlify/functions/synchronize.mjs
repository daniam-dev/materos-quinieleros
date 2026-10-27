import { syncSports } from '../lib/runtime.mjs';

export default async function handler(_request, context) {
  if (context?.deploy?.context !== 'production') return;
  await syncSports(context);
}
export const config = { schedule: '*/15 * * * *' };
