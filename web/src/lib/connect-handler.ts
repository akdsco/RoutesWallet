import { ingestMemberRoutes } from './member-ingest.ts';
import { upsertFeatures, type D1Like, type StoredFeature } from './store.ts';
import type { StravaRouteInput } from './strava-route.ts';
import type { Lookups } from './normalise.ts';

/**
 * The connect orchestration, with every boundary injected so it is unit-testable
 * without the network or a real D1. The Cloudflare Function wires the real Strava
 * calls, the boundary-asset lookups, and `env.DB` into this.
 *
 * Fail-loud: a token/fetch/store failure propagates — the Function boundary turns
 * it into a user-visible `?connect=error`, never a silent success.
 */
export type ConnectDeps = {
  exchangeToken: (
    code: string
  ) => Promise<{ accessToken: string; athleteId: number }>;
  fetchRoutes: (
    accessToken: string,
    athleteId: number
  ) => Promise<StravaRouteInput[]>;
  lookups: Lookups;
  store: D1Like;
};

export type ConnectResult = {
  athleteId: number;
  /** Routes written to the shared pool. */
  ingested: number;
  /** Routes dropped for having no usable line (observable, not silent). */
  skipped: number;
};

export async function handleConnect(
  code: string,
  deps: ConnectDeps
): Promise<ConnectResult> {
  const { accessToken, athleteId } = await deps.exchangeToken(code);
  const routes = await deps.fetchRoutes(accessToken, athleteId);
  const { fc, ingested, skipped } = ingestMemberRoutes(routes, deps.lookups);
  await upsertFeatures(deps.store, fc.features as StoredFeature[]);
  return { athleteId, ingested, skipped };
}
