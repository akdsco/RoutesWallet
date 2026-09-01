import { ingestMemberRoutes } from './member-ingest.ts';
import {
  upsertFeatures,
  existingIds,
  type D1Like,
  type StoredFeature,
} from './store.ts';
import type { TokenBridge } from './sync-store.ts';
import type { Session } from './session.ts';
import type { StravaRouteInput } from './strava-route.ts';
import type { Lookups } from './normalise.ts';

/**
 * The connect orchestration, split into the two calls of the "Sign in with
 * Strava" flow (TB-116) so the slow route pull no longer blocks the redirect:
 *
 *   call 1 — startConnect: exchange the single-use OAuth code, stash the token
 *            server-side, and return the identity (for the cookie) + the opaque
 *            handle. Fast: no network pull, so the browser redirects immediately.
 *   call 2 — syncConnectedRoutes: take the token back by its handle, pull the
 *            member's routes list-only, ingest them (owner-stamped,
 *            region/country normalised) into the shared pool, return the counts.
 *
 * Every boundary is injected, so both halves are unit-testable without the
 * network, KV, or a real D1. Fail-loud: a token/fetch/store failure propagates;
 * the Function boundary turns it into a user-visible error, never a silent
 * success.
 */

export type StartDeps = {
  exchangeToken: (code: string) => Promise<{
    accessToken: string;
    athleteId: number;
    athleteName: string;
    athletePhoto?: string;
  }>;
  /** Stash the token bridge server-side; returns the opaque handle. */
  stash: (bridge: TokenBridge) => Promise<string>;
};

export type StartResult = { session: Session; syncId: string };

export async function startConnect(
  code: string,
  deps: StartDeps
): Promise<StartResult> {
  const { accessToken, athleteId, athleteName, athletePhoto } =
    await deps.exchangeToken(code);
  const syncId = await deps.stash({ accessToken, athleteId });
  const session: Session = { athleteId, name: athleteName };
  if (athletePhoto) session.photo = athletePhoto;
  return { session, syncId };
}

export type SyncDeps = {
  /** Consume the token bridge for a handle (single-use); `null` if unknown. */
  take: (syncId: string) => Promise<TokenBridge | null>;
  fetchRoutes: (
    accessToken: string,
    athleteId: number
  ) => Promise<StravaRouteInput[]>;
  lookups: Lookups;
  store: D1Like;
};

export type SyncResult = {
  /** Routes newly inserted into the shared pool this sync. */
  added: number;
  /** Routes that already existed and were re-written (name/notes/geometry). */
  updated: number;
  /** Routes dropped for having no usable line (observable, not silent). */
  skipped: number;
};

export async function syncConnectedRoutes(
  syncId: string,
  deps: SyncDeps
): Promise<SyncResult | null> {
  const bridge = await deps.take(syncId);
  if (!bridge) return null; // expired/spent/unknown handle — caller returns 401
  const routes = await deps.fetchRoutes(bridge.accessToken, bridge.athleteId);
  const { fc, skipped } = ingestMemberRoutes(routes, deps.lookups);
  const features = fc.features as StoredFeature[];
  const ids = features
    .map((f) => f.properties?.id)
    .filter((id): id is string => typeof id === 'string' && id !== '');
  // Classify against the pool BEFORE the upsert, so we can report Added vs Updated.
  const present = await existingIds(deps.store, ids);
  await upsertFeatures(deps.store, features);
  const added = ids.filter((id) => !present.has(id)).length;
  return { added, updated: ids.length - added, skipped };
}
