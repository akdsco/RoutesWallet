/**
 * Client-side helpers for the "Sign in with Strava" flow (TB-116): the authorize
 * URL, parsing the callback's status, and the three same-origin API calls the app
 * makes — who's signed in (`/api/me`), run the route sync (`/connect/sync`), and
 * sign out (`/connect/logout`). Identity now lives in a signed server cookie, so
 * there is no browser-level "contributed" flag any more.
 */
const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
/** Strava echoes this back as "read,activity:read_all"; the routes pull needs it. */
const SCOPE = 'read,activity:read_all';

/** Build the Strava authorize URL that sends a member to the consent screen. */
export function buildAuthorizeUrl(clientId: string, origin: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${origin}/connect/callback`,
    approval_prompt: 'auto',
    scope: SCOPE,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * The `?connect=…` status the callback redirects home with. `start` means "signed
 * in, now run the sync"; the rest are failures the member sees explained.
 */
export type ConnectStatus = 'start' | 'denied' | 'scope' | 'error' | null;

export function readConnectStatus(search: string): ConnectStatus {
  const c = new URLSearchParams(search).get('connect');
  if (c === 'start' || c === 'denied' || c === 'scope' || c === 'error') {
    return c;
  }
  return null;
}

/** Who, if anyone, is signed in — mirrors the server's `/api/me` shape. */
export type SessionState =
  { signedIn: true; athleteId: number; name: string } | { signedIn: false };

export async function fetchSession(): Promise<SessionState> {
  const res = await fetch('/api/me', {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`/api/me failed: ${res.status}`);
  return (await res.json()) as SessionState;
}

export type SyncResult = { added: number; skipped: number };

/** Run the route pull for the just-signed-in member (call 2 of the flow). */
export async function runSync(): Promise<SyncResult> {
  const res = await fetch('/connect/sync', { method: 'POST' });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  return (await res.json()) as SyncResult;
}

export async function signOut(): Promise<void> {
  const res = await fetch('/connect/logout', { method: 'POST' });
  if (!res.ok) throw new Error(`logout failed: ${res.status}`);
}
