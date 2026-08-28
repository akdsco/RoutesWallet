import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildAuthorizeUrl,
  fetchSession,
  runSync,
  signOut,
  readConnectStatus,
} from './strava-connect.ts';

const jsonRes = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

afterEach(() => vi.restoreAllMocks());

describe('buildAuthorizeUrl', () => {
  it('builds the Strava authorize URL with the callback redirect, route scope + CSRF state', () => {
    const url = new URL(
      buildAuthorizeUrl('CID', 'https://routeswallet.app', 'STATE123')
    );
    expect(url.origin + url.pathname).toBe(
      'https://www.strava.com/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('CID');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://routeswallet.app/connect/callback'
    );
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
    expect(url.searchParams.get('state')).toBe('STATE123');
  });
});

describe('readConnectStatus', () => {
  it('parses the callback statuses (start = signed in, sync begins)', () => {
    expect(readConnectStatus('?connect=start')).toBe('start');
    expect(readConnectStatus('?connect=denied')).toBe('denied');
    expect(readConnectStatus('?connect=scope')).toBe('scope');
    expect(readConnectStatus('?connect=error')).toBe('error');
  });

  it('is null when there is no connect param, and ignores unknown values', () => {
    expect(readConnectStatus('')).toBeNull();
    expect(readConnectStatus('?connect=weird')).toBeNull();
  });
});

describe('fetchSession', () => {
  it('GETs /api/me and returns the session state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ signedIn: true, athleteId: 9, name: 'Jo' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchSession()).toEqual({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/me');
  });
});

describe('runSync', () => {
  it('POSTs /connect/sync and returns the added/skipped counts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ added: 12, skipped: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await runSync()).toEqual({ added: 12, skipped: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/connect/sync');
    expect(init.method).toBe('POST');
  });

  it('throws loudly on a non-ok sync (no silent success)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({}, false, 401)));
    await expect(runSync()).rejects.toThrow(/401/);
  });
});

describe('signOut', () => {
  it('POSTs /connect/logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ signedIn: false }));
    vi.stubGlobal('fetch', fetchMock);
    await signOut();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/connect/logout');
    expect(init.method).toBe('POST');
  });
});
