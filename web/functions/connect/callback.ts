import { startConnect } from '../../src/lib/connect-handler.ts';
import { exchangeToken, hasRequiredScope } from '../../src/lib/strava-api.ts';
import { stashToken } from '../../src/lib/sync-store.ts';
import {
  buildSessionCookie,
  buildSyncCookie,
} from '../../src/lib/session-cookie.ts';
import type { PagesContext } from '../_lib/env.ts';

/** Redirect home with a `connect=…` status and any identity/handle cookies. */
function home(request: Request, params: string, cookies: string[]): Response {
  const headers = new Headers({
    location: new URL(`/?${params}`, request.url).toString(),
  });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 302, headers });
}

/**
 * GET /connect/callback — Strava's OAuth redirect target (call 1 of the split
 * flow). Exchanges the code with the client secret (server-side only), stashes
 * the access token in KV under an opaque handle, and **redirects home instantly**
 * signed in (`?connect=start`) — the several-second route pull is left to
 * `/connect/sync` so the app can show progress instead of a frozen blank. Two
 * cookies ride back: the signed identity (athlete id + name) and the short-lived
 * opaque sync handle. No token is ever exposed to the browser.
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
  if (error || !code) return home(request, 'connect=denied', []);
  // Must include activity:read_all, else the routes pull can't work.
  if (!hasRequiredScope(scope)) return home(request, 'connect=scope', []);

  try {
    const { session, syncId } = await startConnect(code, {
      exchangeToken: (c) =>
        exchangeToken({
          code: c,
          clientId: env.STRAVA_CLIENT_ID,
          clientSecret: env.STRAVA_CLIENT_SECRET,
        }),
      stash: (bridge) => stashToken(env.SYNC, bridge),
    });
    const cookies = [
      await buildSessionCookie(session, env.SESSION_SECRET),
      buildSyncCookie(syncId),
    ];
    return home(request, 'connect=start', cookies);
  } catch (err) {
    // Surface, don't swallow: log it and hand the member a visible ?connect=error
    // banner instead of a bare 500 they can't act on. An observable degrade.
    console.error('connect callback failed', err);
    return home(request, 'connect=error', []);
  }
};
