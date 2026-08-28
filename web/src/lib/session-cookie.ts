/**
 * The HTTP layer around the signed session (TB-116): parse the identity cookie
 * off a request, and build the `Set-Cookie` headers that set or clear it. Kept in
 * `src/lib` (pure, unit-tested) so the Cloudflare Functions stay thin wrappers.
 *
 * Attributes: `HttpOnly` (page JS can never read identity), `Secure`,
 * `SameSite=Lax` (so the cookie survives the OAuth top-level GET redirect back
 * from Strava), `Path=/`.
 */
import { signSession, verifySession, type Session } from './session.ts';

export const SESSION_COOKIE = 'rw_session';

/** ~90 days — a member stays signed in across visits without re-authing. */
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export type SessionState =
  { signedIn: true; athleteId: number; name: string } | { signedIn: false };

/** Parse a `Cookie:` header value into a name→value map. */
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name) out[name] = part.slice(eq + 1).trim();
  }
  return out;
}

/** Read + verify the identity cookie from a request's `Cookie` header. */
export async function readSession(
  cookieHeader: string | null,
  secret: string
): Promise<SessionState> {
  const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!raw) return { signedIn: false };
  const session = await verifySession(raw, secret);
  if (!session) return { signedIn: false };
  return { signedIn: true, athleteId: session.athleteId, name: session.name };
}

const ATTRS = 'HttpOnly; Secure; SameSite=Lax; Path=/';

/** Build the `Set-Cookie` value that signs a member in. */
export async function buildSessionCookie(
  session: Session,
  secret: string
): Promise<string> {
  const value = await signSession(session, secret);
  return `${SESSION_COOKIE}=${value}; ${ATTRS}; Max-Age=${MAX_AGE_SECONDS}`;
}

/** Build the `Set-Cookie` value that signs a member out (expires immediately). */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${ATTRS}; Max-Age=0`;
}
