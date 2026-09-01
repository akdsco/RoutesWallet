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
/** The opaque handle to the KV token bridge (see sync-store.ts). */
export const SYNC_COOKIE = 'rw_sync';
/** The OAuth CSRF nonce, set by /connect/start and checked by the callback. */
export const STATE_COOKIE = 'rw_oauth_state';

/** ~90 days — a member stays signed in across visits without re-authing. */
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
/** ~5 minutes — matches the token bridge TTL; the handle is single-use anyway. */
const SYNC_MAX_AGE_SECONDS = 300;
/** ~10 minutes — long enough to consent at Strava and come back. */
const STATE_MAX_AGE_SECONDS = 600;

export type SessionState =
  | { signedIn: true; athleteId: number; name: string; photo?: string }
  | { signedIn: false };

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
  return {
    signedIn: true,
    athleteId: session.athleteId,
    name: session.name,
    ...(session.photo ? { photo: session.photo } : {}),
  };
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

/** Build the short-lived cookie carrying the opaque token-bridge handle. */
export function buildSyncCookie(syncId: string): string {
  return `${SYNC_COOKIE}=${syncId}; ${ATTRS}; Max-Age=${SYNC_MAX_AGE_SECONDS}`;
}

/** Read the token-bridge handle from a request's `Cookie` header, if present. */
export function readSyncId(cookieHeader: string | null): string | null {
  return parseCookies(cookieHeader)[SYNC_COOKIE] || null;
}

/** Expire the sync-handle cookie (call 2 clears it once the token is consumed). */
export function clearSyncCookie(): string {
  return `${SYNC_COOKIE}=; ${ATTRS}; Max-Age=0`;
}

/** Build the short-lived cookie carrying the OAuth CSRF state nonce. */
export function buildStateCookie(state: string): string {
  return `${STATE_COOKIE}=${state}; ${ATTRS}; Max-Age=${STATE_MAX_AGE_SECONDS}`;
}

/** Read the OAuth state nonce from a request's `Cookie` header, if present. */
export function readOAuthState(cookieHeader: string | null): string | null {
  return parseCookies(cookieHeader)[STATE_COOKIE] || null;
}

/** Expire the state cookie (the callback clears it once the code is validated). */
export function clearStateCookie(): string {
  return `${STATE_COOKIE}=; ${ATTRS}; Max-Age=0`;
}

/**
 * Whether a callback's `state` query param matches the nonce this browser was
 * given at `/connect/start`. Both must be present and equal — a forged callback
 * (login-CSRF) carries no matching cookie and is rejected.
 */
export function oauthStateValid(
  cookieHeader: string | null,
  stateParam: string | null
): boolean {
  const expected = readOAuthState(cookieHeader);
  return expected !== null && stateParam !== null && expected === stateParam;
}
