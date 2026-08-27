import { describe, it, expect, vi } from 'vitest';
import {
  exchangeToken,
  fetchAllRoutes,
  hasRequiredScope,
  type FetchLike,
} from './strava-api.ts';

const ok = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const fail = (status: number): Response =>
  ({ ok: false, status, json: async () => ({}) }) as Response;

describe('hasRequiredScope', () => {
  it('requires activity:read_all (Strava returns "read,activity:read_all")', () => {
    expect(hasRequiredScope('read,activity:read_all')).toBe(true);
    expect(hasRequiredScope('read')).toBe(false);
    expect(hasRequiredScope(null)).toBe(false);
  });
});

describe('exchangeToken', () => {
  it('POSTs the code + secret and returns the token + athlete id', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(ok({ access_token: 'AT', athlete: { id: 42 } }));

    const res = await exchangeToken(
      { code: 'C', clientId: 'CID', clientSecret: 'SEC' },
      fetchImpl
    );

    expect(res).toEqual({ accessToken: 'AT', athleteId: 42 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain('/oauth/token');
    expect(init!.method).toBe('POST');
    const sent = JSON.parse(init!.body as string);
    expect(sent).toMatchObject({
      code: 'C',
      client_id: 'CID',
      client_secret: 'SEC',
      grant_type: 'authorization_code',
    });
  });

  it('throws loudly on a non-ok token response', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(fail(400));
    await expect(
      exchangeToken({ code: 'C', clientId: 'x', clientSecret: 'y' }, fetchImpl)
    ).rejects.toThrow(/token exchange failed: 400/);
  });
});

describe('fetchAllRoutes', () => {
  it('paginates until a short/empty page and Bearer-authorises each call', async () => {
    const page1 = Array.from({ length: 200 }, (_, i) => ({
      id_str: String(i),
    }));
    const page2 = [{ id_str: '200' }];
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(ok(page1))
      .mockResolvedValueOnce(ok(page2));

    const routes = await fetchAllRoutes('AT', 42, fetchImpl);

    expect(routes).toHaveLength(201);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain('/athletes/42/routes');
    expect((init!.headers as Record<string, string>).Authorization).toBe(
      'Bearer AT'
    );
  });

  it('stops at the first empty page', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([]));
    expect(await fetchAllRoutes('AT', 1, fetchImpl)).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws loudly on a non-ok routes response', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(fail(429));
    await expect(fetchAllRoutes('AT', 1, fetchImpl)).rejects.toThrow(
      /routes fetch failed: 429/
    );
  });
});
