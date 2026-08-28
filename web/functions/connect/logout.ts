import { clearSessionCookie } from '../../src/lib/session-cookie.ts';

/**
 * POST /connect/logout — sign the member out by expiring the identity cookie. The
 * shared route pool is unaffected (it never depended on the session), so club
 * routes stay visible after a sign-out. POST (not GET) so it can't be triggered
 * by a cross-site image/link.
 */
export const onRequestPost = (): Response =>
  new Response(JSON.stringify({ signedIn: false }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': clearSessionCookie(),
      'cache-control': 'no-store',
    },
  });
