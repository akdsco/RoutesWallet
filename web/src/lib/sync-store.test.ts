import { describe, it, expect } from 'vitest';
import { stashToken, takeToken, type KVLike } from './sync-store.ts';

/** An in-memory fake of the KV surface, recording TTLs and deletes. */
function fakeKv() {
  const map = new Map<string, string>();
  const ttls: Record<string, number | undefined> = {};
  let deletes = 0;
  const kv: KVLike = {
    get: (k) => Promise.resolve(map.get(k) ?? null),
    put: (k, v, opts) => {
      map.set(k, v);
      ttls[k] = opts?.expirationTtl;
      return Promise.resolve();
    },
    delete: (k) => {
      map.delete(k);
      deletes++;
      return Promise.resolve();
    },
  };
  return {
    kv,
    map,
    ttls,
    get deletes() {
      return deletes;
    },
  };
}

const BRIDGE = { accessToken: 'AT-secret', athleteId: 42 };

describe('token bridge (KV)', () => {
  it('stashes the token under a random id with a short TTL', async () => {
    const f = fakeKv();
    const id1 = await stashToken(f.kv, BRIDGE);
    const id2 = await stashToken(f.kv, BRIDGE);

    expect(id1).toMatch(/[0-9a-f-]{20,}/i); // opaque random handle
    expect(id2).not.toBe(id1); // fresh per connect
    expect(f.ttls[id1]).toBeGreaterThan(0);
    expect(f.ttls[id1]).toBeLessThanOrEqual(600); // minutes, not hours
  });

  it('takes the token back once, then deletes it (single-use)', async () => {
    const f = fakeKv();
    const id = await stashToken(f.kv, BRIDGE);

    expect(await takeToken(f.kv, id)).toEqual(BRIDGE);
    expect(f.deletes).toBe(1);
    // A second take finds nothing — the handle is spent.
    expect(await takeToken(f.kv, id)).toBeNull();
  });

  it('returns null for an unknown / expired handle', async () => {
    const f = fakeKv();
    expect(await takeToken(f.kv, 'never-stored')).toBeNull();
  });
});
