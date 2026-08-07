import { describe, it, expect, vi, afterEach } from 'vitest';
import { gazetteerLookup, countryFromLocales, geocode } from './geocode.ts';

function mockFetch(body: unknown) {
  const res = {
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(res))
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('gazetteerLookup', () => {
  it('resolves known places case- and whitespace-insensitively', () => {
    expect(gazetteerLookup('Girona')).toEqual([2.8214, 41.9794]);
    expect(gazetteerLookup('  cambridge ')).toEqual([0.1218, 52.2053]);
  });

  it('returns null for unknown places', () => {
    expect(gazetteerLookup('Timbuktu')).toBeNull();
  });
});

describe('countryFromLocales', () => {
  it('extracts the region as a lowercase country code', () => {
    expect(countryFromLocales(['en-GB'])).toBe('gb');
    expect(countryFromLocales(['fr-FR', 'fr'])).toBe('fr');
  });

  it('skips language-only tags and takes the first with a region', () => {
    expect(countryFromLocales(['en', 'en-US'])).toBe('us');
  });

  it('returns undefined when no locale carries a region', () => {
    expect(countryFromLocales(['en', 'fr'])).toBeUndefined();
    expect(countryFromLocales([])).toBeUndefined();
  });
});

describe('geocode (Nominatim path, fetch mocked)', () => {
  it('resolves a gazetteer place without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await geocode('London')).toEqual([-0.1276, 51.5072]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns [lng, lat] from a Nominatim hit', async () => {
    mockFetch([{ lon: '-2.5', lat: '51.4' }]);
    expect(await geocode('Somewhere')).toEqual([-2.5, 51.4]);
  });

  it('returns null when Nominatim finds nothing (empty array)', async () => {
    mockFetch([]);
    expect(await geocode('Nowhereville')).toBeNull();
  });

  it('returns null (not NaN coords) when a hit has unparseable numbers', async () => {
    mockFetch([{ lon: 'abc', lat: '' }]);
    expect(await geocode('Broken')).toBeNull();
  });

  it('returns null on an HTTP error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 429 } as unknown as Response)
      )
    );
    expect(await geocode('RateLimited')).toBeNull();
  });

  it('propagates a network error (caller treats it as a failed lookup)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    );
    await expect(geocode('Offline')).rejects.toBeInstanceOf(TypeError);
  });
});
