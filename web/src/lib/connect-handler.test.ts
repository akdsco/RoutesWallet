import { describe, it, expect, vi } from 'vitest';
import {
  startConnect,
  syncConnectedRoutes,
  type StartDeps,
  type SyncDeps,
} from './connect-handler.ts';
import type { StravaRouteInput } from './strava-route.ts';
import type { D1Like } from './store.ts';

const canonical = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const route = (id: string): StravaRouteInput => ({
  id_str: id,
  name: `route ${id}`,
  distance: 40000,
  elevation_gain: 500,
  map: { summary_polyline: canonical },
  athlete: { id: 9, firstname: 'Jo', lastname: 'Rider' },
});

function fakeStore(): D1Like & { written: string[] } {
  const written: string[] = [];
  const prepared = (args: unknown[]): ReturnType<D1Like['prepare']> => ({
    bind: (...v: unknown[]) => prepared(v),
    run: () => {
      if (args.length) written.push(args[0] as string);
      return Promise.resolve({});
    },
    all: () => Promise.resolve({ results: [] }),
  });
  return { written, prepare: () => prepared([]) };
}

describe('startConnect (call 1 — exchange + stash, no pull)', () => {
  it('exchanges the code, stashes the token, and returns the session + handle', async () => {
    const deps: StartDeps = {
      exchangeToken: vi.fn(() =>
        Promise.resolve({
          accessToken: 'AT',
          athleteId: 9,
          athleteName: 'Jo Rider',
        })
      ),
      stash: vi.fn(() => Promise.resolve('SYNC-ID')),
    };

    const res = await startConnect('CODE', deps);

    expect(deps.exchangeToken).toHaveBeenCalledWith('CODE');
    expect(deps.stash).toHaveBeenCalledWith({
      accessToken: 'AT',
      athleteId: 9,
    });
    expect(res).toEqual({
      session: { athleteId: 9, name: 'Jo Rider' },
      syncId: 'SYNC-ID',
    });
  });

  it('carries a profile photo into the session when Strava returns one', async () => {
    const deps: StartDeps = {
      exchangeToken: vi.fn(() =>
        Promise.resolve({
          accessToken: 'AT',
          athleteId: 9,
          athleteName: 'Jo',
          athletePhoto: 'https://cdn/jo.jpg',
        })
      ),
      stash: vi.fn(() => Promise.resolve('S')),
    };
    const { session } = await startConnect('CODE', deps);
    expect(session).toEqual({
      athleteId: 9,
      name: 'Jo',
      photo: 'https://cdn/jo.jpg',
    });
  });

  it('propagates a token-exchange failure (fail loud, no swallow)', async () => {
    const deps: StartDeps = {
      exchangeToken: vi.fn(() =>
        Promise.reject(new Error('token exchange failed: 400'))
      ),
      stash: vi.fn(() => Promise.resolve('X')),
    };
    await expect(startConnect('CODE', deps)).rejects.toThrow(/token exchange/);
    expect(deps.stash).not.toHaveBeenCalled();
  });
});

describe('syncConnectedRoutes (call 2 — take handle, pull, ingest)', () => {
  const baseSyncDeps = (over: Partial<SyncDeps> = {}): SyncDeps => ({
    take: vi.fn(() => Promise.resolve({ accessToken: 'AT', athleteId: 9 })),
    fetchRoutes: vi.fn(() => Promise.resolve([route('a'), route('b')])),
    lookups: { countyOf: () => 'Kent', countryOf: () => 'United Kingdom' },
    store: fakeStore(),
    ...over,
  });

  it('takes the handle, fetches, ingests and upserts, returning counts', async () => {
    const store = fakeStore();
    const deps = baseSyncDeps({ store });
    const res = await syncConnectedRoutes('SYNC-ID', deps);

    expect(deps.take).toHaveBeenCalledWith('SYNC-ID');
    expect(deps.fetchRoutes).toHaveBeenCalledWith('AT', 9);
    expect(res).toEqual({ ingested: 2, skipped: 0 });
    expect(store.written.sort()).toEqual(['a', 'b']);
  });

  it('counts skipped lineless routes and only upserts the usable ones', async () => {
    const store = fakeStore();
    const deps = baseSyncDeps({
      store,
      fetchRoutes: vi.fn(() =>
        Promise.resolve([
          route('good'),
          { ...route('bad'), map: { summary_polyline: '' } },
        ])
      ),
    });
    const res = await syncConnectedRoutes('SYNC-ID', deps);
    expect(res).toEqual({ ingested: 1, skipped: 1 });
    expect(store.written).toEqual(['good']);
  });

  it('returns null for an expired/invalid handle (no pull, caller 401s)', async () => {
    const deps = baseSyncDeps({ take: vi.fn(() => Promise.resolve(null)) });
    expect(await syncConnectedRoutes('SYNC-ID', deps)).toBeNull();
    expect(deps.fetchRoutes).not.toHaveBeenCalled();
  });
});
