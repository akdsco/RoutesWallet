/**
 * The ephemeral token bridge behind the split connect (TB-116). The OAuth `code`
 * is single-use and exchanged server-side in call 1 (the callback), but the slow
 * route pull happens in call 2 (`/connect/sync`) so the UI can show progress. The
 * Strava access token bridges the two **server-side** — stashed in Cloudflare KV
 * under a random handle, with only that opaque handle handed to the browser (in a
 * cookie). The token itself is never exposed to the browser, and it is deleted
 * the moment call 2 consumes it (single-use) or expires by TTL.
 *
 * Pure over a minimal KV surface, so it is unit-tested against a fake.
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

/** What the pull step needs — the access token plus the athlete it belongs to. */
export type TokenBridge = { accessToken: string; athleteId: number };

/** ~5 minutes: long enough to finish the sync, short enough to limit exposure. */
const TTL_SECONDS = 300;

/** Stash the token under a fresh random handle; returns the handle for the cookie. */
export async function stashToken(
  kv: KVLike,
  bridge: TokenBridge
): Promise<string> {
  const syncId = crypto.randomUUID();
  await kv.put(syncId, JSON.stringify(bridge), { expirationTtl: TTL_SECONDS });
  return syncId;
}

/**
 * Consume the token for a handle: read it, delete it (single-use), and return it.
 * An unknown/expired/spent handle returns `null` — the caller turns that into a
 * 401 rather than a silent success.
 */
export async function takeToken(
  kv: KVLike,
  syncId: string
): Promise<TokenBridge | null> {
  const raw = await kv.get(syncId);
  if (raw === null) return null;
  await kv.delete(syncId);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as TokenBridge).accessToken === 'string' &&
      typeof (parsed as TokenBridge).athleteId === 'number'
    ) {
      const { accessToken, athleteId } = parsed as TokenBridge;
      return { accessToken, athleteId };
    }
    return null;
  } catch {
    // silent-ok: a corrupt bridge value (never written by us with a bad shape) is
    // treated as "no valid handle" → the caller 401s. Already deleted above.
    return null;
  }
}
