import type { D1Like } from '../../src/lib/store.ts';

/**
 * Cloudflare Pages Function bindings. `DB` is the D1 route-pool database; the
 * Strava secrets are set as Pages environment variables (never committed). `DB`
 * is typed as our minimal `D1Like` surface — the real `D1Database` satisfies it
 * structurally, so no cast is needed and the store logic stays testable.
 */
export interface Env {
  DB: D1Like;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
}

/** The subset of a Pages Function's context we use. */
export type PagesContext = { request: Request; env: Env };
