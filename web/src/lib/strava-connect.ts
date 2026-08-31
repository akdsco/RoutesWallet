/**
 * Client-side helpers for the "Sign in with Strava" flow (TB-116): the authorize
 * URL, parsing the callback's status, and the three same-origin API calls the app
 * makes — who's signed in (`/api/me`), run the route sync (`/connect/sync`), and
 * sign out (`/connect/logout`). Identity now lives in a signed server cookie, so
 * there is no browser-level "contributed" flag any more.
 */
// `SessionState` is the /api/me wire contract — defined once server-side (the
// producer) and re-exported here, so client and server can't drift apart.
import type { SessionState } from './session-cookie.ts';
export type { SessionState } from './session-cookie.ts';

const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
/** Strava echoes this back as "read,activity:read_all"; the routes pull needs it. */
const SCOPE = 'read,activity:read_all';

/**
 * Build the Strava authorize URL that sends a member to the consent screen. The
 * `state` is a random nonce the `/connect/start` Function also drops in an
 * HttpOnly cookie; the callback rejects any code whose `state` doesn't match it,
 * which is what defeats login-CSRF (a forged callback the browser never began).
 */
export function buildAuthorizeUrl(
  clientId: string,
  origin: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${origin}/connect/callback`,
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * The `?connect=…` status the callback redirects home with. `start` means "signed
 * in, now run the sync"; the rest are failures the member sees explained.
 */
export type ConnectStatus =
  'start' | 'denied' | 'scope' | 'error' | 'unavailable' | null;

export function readConnectStatus(search: string): ConnectStatus {
  const c = new URLSearchParams(search).get('connect');
  if (
    c === 'start' ||
    c === 'denied' ||
    c === 'scope' ||
    c === 'error' ||
    c === 'unavailable'
  ) {
    return c;
  }
  return null;
}

/** Narrow an untrusted /api/me body into the union — anything off → signed out. */
function toSessionState(data: unknown): SessionState {
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    if (
      d.signedIn === true &&
      typeof d.athleteId === 'number' &&
      typeof d.name === 'string'
    ) {
      return { signedIn: true, athleteId: d.athleteId, name: d.name };
    }
  }
  return { signedIn: false };
}

export async function fetchSession(): Promise<SessionState> {
  const res = await fetch('/api/me', {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`/api/me failed: ${res.status}`);
  return toSessionState(await res.json());
}

export type SyncResult = { added: number; skipped: number };

/** Narrow an untrusted /connect/sync body — missing counts default to 0, not NaN. */
function toSyncResult(data: unknown): SyncResult {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    added: typeof d.added === 'number' ? d.added : 0,
    skipped: typeof d.skipped === 'number' ? d.skipped : 0,
  };
}

/** Run the route pull for the just-signed-in member (call 2 of the flow). */
export async function runSync(): Promise<SyncResult> {
  const res = await fetch('/connect/sync', { method: 'POST' });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  return toSyncResult(await res.json());
}

export async function signOut(): Promise<void> {
  const res = await fetch('/connect/logout', { method: 'POST' });
  if (!res.ok) throw new Error(`logout failed: ${res.status}`);
}
