import { readSession } from '../../src/lib/session-cookie.ts';
import type { PagesContext } from '../_lib/env.ts';

/**
 * GET /api/me — who, if anyone, is signed in. Reads the signed identity cookie
 * (athlete id + name only) and reports it, so the app can show "Signed in as
 * <name>" and drive the my-routes filter without any per-user table. No secret or
 * token is involved. `no-store` so the answer is never cached across members.
 */
export const onRequestGet = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  const state = await readSession(
    request.headers.get('cookie'),
    env.SESSION_SECRET
  );
  return new Response(JSON.stringify(state), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
