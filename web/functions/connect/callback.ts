import { startConnect } from '../../src/lib/connect-handler.ts';
import { exchangeToken, hasRequiredScope } from '../../src/lib/strava-api.ts';
import { stashToken } from '../../src/lib/sync-store.ts';
import {
  buildSessionCookie,
  buildSyncCookie,
  clearStateCookie,
  oauthStateValid,
  readOAuthState,
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
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('cookie');

  // CSRF guard: the `state` must match the nonce /connect/start set in this
  // browser. A forged callback (login-CSRF) carries no matching cookie → reject.
  // Clear the one-shot state cookie whichever way this goes.
  if (!oauthStateValid(cookie, state)) {
    // Surface, don't swallow: this bail-out is otherwise indistinguishable from a
    // server error. Log which half is missing — a genuine CSRF attempt has no
    // cookie, whereas a dropped state cookie (SameSite / a privacy browser eating
    // it in the cross-site bounce) has the param but no cookie.
    console.error('connect callback: OAuth state check failed', {
      hasStateParam: state !== null,
      hasStateCookie: readOAuthState(cookie) !== null,
    });
    return home(request, 'connect=error', [clearStateCookie()]);
  }
  // The member denied access, or Strava sent no code.
  if (error || !code) {
    console.error('connect callback: denied or no code', {
      error,
      hasCode: code !== null,
    });
    return home(request, 'connect=denied', [clearStateCookie()]);
  }
  // Must include activity:read_all, else the routes pull can't work.
  if (!hasRequiredScope(scope)) {
    console.error('connect callback: missing required scope', { scope });
    return home(request, 'connect=scope', [clearStateCookie()]);
  }

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
      clearStateCookie(), // one-shot nonce spent
    ];
    return home(request, 'connect=start', cookies);
  } catch (err) {
    // Surface, don't swallow: log it and hand the member a visible ?connect=error
    // banner instead of a bare 500 they can't act on. An observable degrade.
    console.error('connect callback failed', err);
    return home(request, 'connect=error', []);
  }
};
