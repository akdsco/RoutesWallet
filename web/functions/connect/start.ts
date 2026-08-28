import { buildAuthorizeUrl } from '../../src/lib/strava-connect.ts';
import { buildStateCookie } from '../../src/lib/session-cookie.ts';
import type { PagesContext } from '../_lib/env.ts';

/**
 * GET /connect/start — begins the "Sign in with Strava" flow (TB-116). Mints a
 * random CSRF `state`, drops it in a short-lived HttpOnly cookie, and redirects to
 * Strava's consent screen carrying the same state. The callback then rejects any
 * code whose `state` doesn't match this cookie — so a forged callback the browser
 * never initiated (login-CSRF) can't sign a victim in as someone else. The client
 * id lives server-side here (env), so the browser never builds the authorize URL.
 */
export const onRequestGet = ({ request, env }: PagesContext): Response => {
  const state = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const headers = new Headers({
    location: buildAuthorizeUrl(env.STRAVA_CLIENT_ID, origin, state),
  });
  headers.append('set-cookie', buildStateCookie(state));
  return new Response(null, { status: 302, headers });
};
