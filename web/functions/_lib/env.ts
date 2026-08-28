import type { D1Like } from '../../src/lib/store.ts';

/**
 * The minimal Cloudflare Workers KV surface we use for the ephemeral token bridge
 * (TB-116): call 1 (the OAuth callback) `put`s the access token under a random
 * sync id with a short TTL; call 2 (`/connect/sync`) `get`s then `delete`s it.
 * The real `KVNamespace` satisfies this structurally, so no workers-types dep and
 * the sync logic stays testable against a fake.
 */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

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
