import type { StravaRouteInput } from './strava-route.ts';

/**
 * Server-side Strava calls for the connect flow. The one thing the RN app does
 * on-device that a browser SPA cannot — exchanging the auth code with the client
 * secret — lives here and runs only inside the Cloudflare Function. `fetch` is
 * injected so the logic (request shape, pagination, scope guard, fail-loud) is
 * unit-testable without the network.
 */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<Response>;

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_BASE = 'https://www.strava.com/api/v3';
const PER_PAGE = 200;

/** The scope the route pull needs. Strava echoes it as "read,activity:read_all". */
export function hasRequiredScope(scope: string | null): boolean {
  return !!scope && scope.split(',').includes('activity:read_all');
}

export type ExchangeInput = {
  code: string;
  clientId: string;
  clientSecret: string;
};

export type ExchangeResult = {
  accessToken: string;
  athleteId: number;
  /** Display name for "Signed in as …" — never a secret, safe in the cookie. */
  athleteName: string;
  /** Profile photo URL, if the athlete has a real (non-default) one. */
  athletePhoto?: string;
};

export async function exchangeToken(
  { code, clientId, clientSecret }: ExchangeInput,
  fetchImpl: FetchLike = fetch
): Promise<ExchangeResult> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    // Fail loud + explicit: carry Strava's own error body so the log says WHY
    // (a bad client_secret reads differently from a spent/invalid code), instead
    // of a bare status the operator can't act on. Truncated to keep logs sane.
    const body = await res.text().catch(() => '');
    throw new Error(
      `Strava token exchange failed: ${res.status} ${body.slice(0, 300)}`.trim()
    );
  }
  const data = (await res.json()) as {
    access_token?: string;
    athlete?: {
      id?: number;
      firstname?: string;
      lastname?: string;
      profile_medium?: string;
    };
  };
  const athlete = data.athlete;
  if (!data.access_token || typeof athlete?.id !== 'number') {
    throw new Error(
      'Strava token exchange returned no access_token/athlete id'
    );
  }
  return {
    accessToken: data.access_token,
    athleteId: athlete.id,
    athleteName: displayName(athlete.id, athlete.firstname, athlete.lastname),
    athletePhoto: realPhoto(athlete.profile_medium),
  };
}

/**
 * A usable profile photo URL, or undefined. Strava returns a **default** avatar
 * (path contains `avatar/athlete`) when the athlete has none — we drop those so
 * the UI shows initials rather than a generic silhouette (per the design).
 */
function realPhoto(url: string | undefined): string | undefined {
  if (typeof url !== 'string' || !url.startsWith('http')) return undefined;
  if (url.includes('avatar/athlete')) return undefined;
  return url;
}

/** Join firstname + lastname, falling back to "Athlete <id>" when Strava sends none. */
function displayName(
  id: number,
  firstname?: string,
  lastname?: string
): string {
  const name = [firstname, lastname]
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .join(' ')
    .trim();
  return name || `Athlete ${id}`;
}

/**
 * Fetch all of a member's routes, paginating until a short/empty page. List-only:
 * this is the single Strava data call the connect makes (no per-route GPX), so a
 * connect is a couple of requests regardless of how many routes the member has.
 */
export async function fetchAllRoutes(
  accessToken: string,
  athleteId: number,
  fetchImpl: FetchLike = fetch
): Promise<StravaRouteInput[]> {
  const out: StravaRouteInput[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchImpl(
      `${API_BASE}/athletes/${athleteId}/routes?page=${page}&per_page=${PER_PAGE}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      throw new Error(`Strava routes fetch failed: ${res.status}`);
    }
    const batch = (await res.json()) as StravaRouteInput[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return out;
}
