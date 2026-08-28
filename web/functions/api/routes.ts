import { readAllFeatures } from '../../src/lib/store.ts';
import type { PagesContext } from '../_lib/env.ts';

/**
 * GET /api/routes — the live route source for the app. Returns the whole shared
 * pool (seeded club routes + every member contribution) as a GeoJSON
 * FeatureCollection, which `loadRoutes` feeds through the same `featuresToRoutes`
 * loader as the old baked-in file. A D1/read failure propagates as a 500 rather
 * than a silent empty map.
 */
export const onRequestGet = async ({
  env,
}: PagesContext): Promise<Response> => {
  const fc = await readAllFeatures(env.DB);
  return new Response(JSON.stringify(fc), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Short cache: the pool changes as members connect, but a minute of CDN
      // caching keeps repeat loads cheap.
      'cache-control': 'public, max-age=60',
    },
  });
};
