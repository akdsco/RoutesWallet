import type { D1Like } from '../../src/lib/store.ts';
import type { KVLike } from '../../src/lib/sync-store.ts';

/**
 * Cloudflare Pages Function bindings. `DB` is the D1 route-pool database; `SYNC`
 * is the KV namespace holding the short-lived token bridge; the Strava secrets +
 * `SESSION_SECRET` (the HMAC key for the signed identity cookie) are set as Pages
 * environment variables (never committed). `DB`/`SYNC` are typed as our minimal
 * structural surfaces so the logic stays unit-testable against fakes.
 */
export interface Env {
  DB: D1Like;
  SYNC: KVLike;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

/** The subset of a Pages Function's context we use. */
export type PagesContext = { request: Request; env: Env };
