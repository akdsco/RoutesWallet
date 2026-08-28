import { handleConnect } from '../../src/lib/connect-handler.ts';
import {
  exchangeToken,
  fetchAllRoutes,
  hasRequiredScope,
} from '../../src/lib/strava-api.ts';
import { buildLookups } from '../_lib/lookups.ts';
import type { PagesContext } from '../_lib/env.ts';

/** Redirect home with a `connect=…` status the app reads to show a banner. */
function home(request: Request, params: string): Response {
  return Response.redirect(new URL(`/?${params}`, request.url).toString(), 302);
}

/**
 * GET /connect/callback — Strava's OAuth redirect target. Exchanges the code with
 * the client secret (server-side only), pulls the member's routes list-only,
 * ingests them (owner-stamped, region/country normalised) into the shared pool,
 * and redirects home with a status. The one piece the RN app does on-device that
 * a browser SPA can't — the secret token exchange — lives here.
 */
export const onRequestGet = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const scope = url.searchParams.get('scope');
  const error = url.searchParams.get('error');

  // The member denied access, or Strava sent no code.
  if (error || !code) return home(request, 'connect=denied');
  // Must include activity:read_all, else the routes pull can't work.
  if (!hasRequiredScope(scope)) return home(request, 'connect=scope');

  try {
    const { ingested, skipped } = await handleConnect(code, {
      exchangeToken: (c) =>
        exchangeToken({
          code: c,
          clientId: env.STRAVA_CLIENT_ID,
          clientSecret: env.STRAVA_CLIENT_SECRET,
        }),
      fetchRoutes: (token, athleteId) => fetchAllRoutes(token, athleteId),
      lookups: buildLookups(),
      store: env.DB,
    });
    return home(request, `connect=ok&added=${ingested}&skipped=${skipped}`);
  } catch (err) {
    // Surface, don't swallow: log it and hand the member a visible ?connect=error
    // banner instead of a bare 500 they can't act on. An observable degrade.
    console.error('connect callback failed', err);
    return home(request, 'connect=error');
  }
};
