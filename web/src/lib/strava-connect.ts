/**
 * Client-side helpers for the "Connect Strava" flow: the authorize URL, the
 * browser-level "already contributed" flag, and parsing the callback's status.
 * Pure + storage-guarded, so the component around them stays thin.
 */
const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
/** Strava echoes this back as "read,activity:read_all"; the routes pull needs it. */
const SCOPE = 'read,activity:read_all';
const CONTRIBUTED_KEY = 'rw:strava-contributed';

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
 * Whether this browser has already contributed. Prototype-level: a per-browser
 * flag that just skips a re-pull and relabels the CTA — the store's id_str upsert
 * is the real no-duplicate guarantee (a cleared flag can't create duplicates).
 */
export function hasContributed(): boolean {
  try {
    return window.localStorage.getItem(CONTRIBUTED_KEY) === '1';
  } catch {
    // silent-ok: storage disabled (private mode) → treat as "not contributed";
    // the worst case is we re-show the CTA, and the store still de-dupes.
    return false;
  }
}

export function markContributed(): void {
  try {
    window.localStorage.setItem(CONTRIBUTED_KEY, '1');
  } catch {
    // silent-ok: storage disabled → we simply re-show the CTA next visit.
  }
}

export type ConnectState = 'ok' | 'denied' | 'scope' | 'error';
export type ConnectStatus = { state: ConnectState; added?: number } | null;

/** Parse the `?connect=…` status the callback redirects home with. */
export function readConnectStatus(search: string): ConnectStatus {
  const params = new URLSearchParams(search);
  const c = params.get('connect');
  if (c === 'ok') {
    const n = Number(params.get('added'));
    return { state: 'ok', added: Number.isFinite(n) ? n : undefined };
  }
  if (c === 'denied' || c === 'scope' || c === 'error') return { state: c };
  return null;
}
