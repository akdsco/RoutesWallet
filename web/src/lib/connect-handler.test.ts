import { describe, it, expect, vi } from 'vitest';
import { handleConnect, type ConnectDeps } from './connect-handler.ts';
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
    run: async () => {
      if (args.length) written.push(args[0] as string);
      return {};
    },
    all: async () => ({ results: [] }),
  });
  return { written, prepare: () => prepared([]) };
}

const baseDeps = (over: Partial<ConnectDeps> = {}): ConnectDeps => ({
  exchangeToken: vi.fn(async () => ({ accessToken: 'AT', athleteId: 9 })),
  fetchRoutes: vi.fn(async () => [route('a'), route('b')]),
  lookups: { countyOf: () => 'Kent', countryOf: () => 'United Kingdom' },
  store: fakeStore(),
  ...over,
});

describe('handleConnect', () => {
  it('exchanges the code, fetches routes, ingests and upserts them', async () => {
    const store = fakeStore();
    const deps = baseDeps({ store });
    const res = await handleConnect('CODE', deps);

    expect(deps.exchangeToken).toHaveBeenCalledWith('CODE');
    expect(deps.fetchRoutes).toHaveBeenCalledWith('AT', 9);
    expect(res).toMatchObject({ ingested: 2, skipped: 0, athleteId: 9 });
    expect(store.written.sort()).toEqual(['a', 'b']);
  });

  it('counts skipped lineless routes and only upserts the usable ones', async () => {
    const store = fakeStore();
    const deps = baseDeps({
      store,
      fetchRoutes: vi.fn(async () => [
        route('good'),
        { ...route('bad'), map: { summary_polyline: '' } },
      ]),
    });
    const res = await handleConnect('CODE', deps);
    expect(res).toMatchObject({ ingested: 1, skipped: 1 });
    expect(store.written).toEqual(['good']);
  });

  it('propagates a token-exchange failure (fail loud, no swallow)', async () => {
    const deps = baseDeps({
      exchangeToken: vi.fn(async () => {
        throw new Error('token exchange failed: 400');
      }),
    });
    await expect(handleConnect('CODE', deps)).rejects.toThrow(/token exchange/);
  });
});
