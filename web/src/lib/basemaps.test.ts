import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BASEMAPS,
  BASEMAP_ORDER,
  DEFAULT_BASEMAP,
  DARK_CAVEAT,
  tileConfig,
  isBasemapId,
  showsDarkCaveat,
  cycleBasemap,
} from './basemaps.ts';

describe('basemap config', () => {
  it('the default is Standard and it comes first', () => {
    expect(DEFAULT_BASEMAP).toBe('standard');
    expect(BASEMAP_ORDER[0]).toBe('standard');
  });

  it('every ordered id has a definition', () => {
    for (const id of BASEMAP_ORDER) expect(BASEMAPS[id]).toBeDefined();
  });

  it('every option carries a label, description and short credit', () => {
    for (const id of BASEMAP_ORDER) {
      const def = BASEMAPS[id];
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.credit).toContain('OpenStreetMap');
    }
    expect(BASEMAPS.standard.credit).toContain('CARTO');
    expect(BASEMAPS.cyclosm.credit).toContain('CyclOSM');
  });
});

describe('showsDarkCaveat', () => {
  it('is true only for CyclOSM in the dark theme (its one caveat)', () => {
    expect(showsDarkCaveat('cyclosm', 'dark')).toBe(true);
    expect(showsDarkCaveat('cyclosm', 'light')).toBe(false);
    expect(showsDarkCaveat('standard', 'dark')).toBe(false);
    expect(showsDarkCaveat('standard', 'light')).toBe(false);
  });

  it('has caveat copy to announce', () => {
    expect(DARK_CAVEAT.toLowerCase()).toContain('no dark');
  });
});

describe('cycleBasemap (arrow-key navigation over the ordered list)', () => {
  it('steps forward and wraps', () => {
    expect(cycleBasemap('standard', 1)).toBe('cyclosm');
    expect(cycleBasemap('cyclosm', 1)).toBe('standard');
  });

  it('steps backward and wraps', () => {
    expect(cycleBasemap('standard', -1)).toBe('cyclosm');
    expect(cycleBasemap('cyclosm', -1)).toBe('standard');
  });
});

// A stand-in CARTO basemap key for the keyed-path tests.
const KEY = 'k_test_123';

describe('tileConfig (with a CARTO key configured)', () => {
  it('Standard is theme-aware — light and dark differ', () => {
    const light = tileConfig('standard', 'light', KEY);
    const dark = tileConfig('standard', 'dark', KEY);
    expect(light.url).not.toBe(dark.url);
    expect(light.url).toContain('voyager');
    expect(dark.url).toContain('dark_all');
  });

  it('CyclOSM is light-only — the same tiles in both themes', () => {
    const light = tileConfig('cyclosm', 'light', KEY);
    const dark = tileConfig('cyclosm', 'dark', KEY);
    expect(light.url).toBe(dark.url);
    expect(light.url).toContain('cyclosm');
  });

  it('carries the basemap-specific attribution, subdomains and maxZoom', () => {
    const carto = tileConfig('standard', 'light', KEY);
    expect(carto.attribution).toContain('CARTO');
    expect(carto.subdomains).toBe('abcd');
    expect(carto.maxZoom).toBeGreaterThanOrEqual(19);

    const cyclosm = tileConfig('cyclosm', 'light', KEY);
    expect(cyclosm.attribution).toContain('CyclOSM');
    expect(cyclosm.attribution).toContain('OpenStreetMap');
    expect(cyclosm.subdomains).toBe('abc');
  });

  it('every keyed config keeps the {s}/{z}/{x}/{y} tile placeholders', () => {
    for (const id of BASEMAP_ORDER) {
      for (const theme of ['light', 'dark'] as const) {
        const { url } = tileConfig(id, theme, KEY);
        for (const ph of ['{s}', '{z}', '{x}', '{y}']) {
          expect(url).toContain(ph);
        }
      }
    }
  });
});

describe('tileConfig — CARTO API key handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('appends ?key to the CARTO Standard tiles in both themes (B1/B2)', () => {
    // CARTO authenticates with ?key= (not ?api_key=, which it ignores).
    const light = tileConfig('standard', 'light', KEY);
    const dark = tileConfig('standard', 'dark', KEY);
    expect(light.url).toContain('cartocdn');
    expect(light.url).toContain('voyager');
    expect(light.url.endsWith(`?key=${KEY}`)).toBe(true);
    expect(dark.url).toContain('dark_all');
    expect(dark.url.endsWith(`?key=${KEY}`)).toBe(true);
    // Guard against the ignored-param regression that shipped the watermark.
    expect(light.url).not.toContain('api_key');
    // The retina placeholder must survive the query-string append.
    expect(light.url).toContain('{r}');
  });

  it('ignores the key for CyclOSM — it stays keyless in both themes (B4)', () => {
    for (const theme of ['light', 'dark'] as const) {
      const { url } = tileConfig('cyclosm', theme, KEY);
      expect(url).not.toContain('key=');
      expect(url).toContain('cyclosm');
    }
  });

  it('without a key, Standard stays CARTO (unauthenticated → visible watermark) and never masks with CyclOSM (B3)', () => {
    // A missing key is a misconfiguration we WANT to see in review/prod — so
    // Standard still requests CARTO (which renders its own "API KEY REQUIRED"
    // watermark) rather than silently swapping to a plausible CyclOSM map that
    // lies about what's selected. The failure must be visible, not masked.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const theme of ['light', 'dark'] as const) {
      const { url } = tileConfig('standard', theme);
      expect(url).toContain('cartocdn'); // still the CARTO Standard source
      expect(url).not.toContain('key='); // unauthenticated → watermark shows
      expect(url).not.toContain('cyclosm'); // never masked by CyclOSM
    }
    expect(err).toHaveBeenCalled();
    expect(String(err.mock.calls[0]?.[0])).toContain('VITE_CARTO_BASEMAP_KEY');
  });

  it('treats an empty-string key the same as no key (B3)', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { url } = tileConfig('standard', 'light', '');
    expect(url).toContain('cartocdn');
    expect(url).not.toContain('key=');
    expect(url).not.toContain('cyclosm');
    // Same visible-failure contract as the no-key path: an empty key must also
    // surface the misconfiguration loudly, not just render the keyless url.
    expect(err).toHaveBeenCalled();
    expect(String(err.mock.calls[0]?.[0])).toContain('VITE_CARTO_BASEMAP_KEY');
  });
});

describe('isBasemapId', () => {
  it('accepts known ids only', () => {
    expect(isBasemapId('standard')).toBe(true);
    expect(isBasemapId('cyclosm')).toBe(true);
  });

  it('rejects anything else (for a stale/hostile persisted value)', () => {
    expect(isBasemapId('carto')).toBe(false);
    expect(isBasemapId('')).toBe(false);
    expect(isBasemapId(null)).toBe(false);
    expect(isBasemapId(undefined)).toBe(false);
    expect(isBasemapId(42)).toBe(false);
  });
});
