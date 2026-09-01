import { syncConnectedRoutes } from '../../src/lib/connect-handler.ts';
import { fetchAllRoutes } from '../../src/lib/strava-api.ts';
import { takeToken } from '../../src/lib/sync-store.ts';
import { readSyncId, clearSyncCookie } from '../../src/lib/session-cookie.ts';
import { buildLookups } from '../_lib/lookups.ts';
import type { PagesContext } from '../_lib/env.ts';

function json(body: unknown, status: number, clearSync = false): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (clearSync) headers.append('set-cookie', clearSyncCookie());
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * POST /connect/sync — call 2 of the split flow. Reads the opaque sync handle
 * from its cookie, consumes the stashed Strava token from KV, pulls the member's
 * routes list-only and ingests them into the shared pool, then returns
 * `{ added, skipped }` so the app can show an unmissable result. The handle is
 * single-use and the cookie is cleared on the way out; a missing/expired handle
 * is a 401 (not a silent success). This is the one endpoint that takes the
 * several seconds — the app shows progress around it, so there is no frozen blank.
 */
export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  const syncId = readSyncId(request.headers.get('cookie'));
  if (!syncId) return json({ error: 'not-signed-in' }, 401);

  try {
    const result = await syncConnectedRoutes(syncId, {
      take: (id) => takeToken(env.SYNC, id),
      fetchRoutes: (token, athleteId) => fetchAllRoutes(token, athleteId),
      lookups: buildLookups(),
      store: env.DB,
    });
    // Null handle: expired/spent/unknown — clear the stale cookie and 401.
    if (!result) return json({ error: 'sync-expired' }, 401, true);
    return json(
      { added: result.added, updated: result.updated, skipped: result.skipped },
      200,
      true
    );
  } catch (err) {
    // Fail loud: the token is already consumed, so clear the stale cookie and
    // surface a 500 the client shows as "try again", never a silent success.
    console.error('connect sync failed', err);
    return json({ error: 'sync-failed' }, 500, true);
  }
};
