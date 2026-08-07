import { describe, it, expect } from 'vitest';
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

describe('tileConfig', () => {
  it('Standard is theme-aware — light and dark differ', () => {
    const light = tileConfig('standard', 'light');
    const dark = tileConfig('standard', 'dark');
    expect(light.url).not.toBe(dark.url);
    expect(light.url).toContain('voyager');
    expect(dark.url).toContain('dark_all');
  });

  it('CyclOSM is light-only — the same tiles in both themes', () => {
    const light = tileConfig('cyclosm', 'light');
    const dark = tileConfig('cyclosm', 'dark');
    expect(light.url).toBe(dark.url);
    expect(light.url).toContain('cyclosm');
  });

  it('carries the basemap-specific attribution, subdomains and maxZoom', () => {
    const carto = tileConfig('standard', 'light');
    expect(carto.attribution).toContain('CARTO');
    expect(carto.subdomains).toBe('abcd');
    expect(carto.maxZoom).toBeGreaterThanOrEqual(19);

    const cyclosm = tileConfig('cyclosm', 'light');
    expect(cyclosm.attribution).toContain('CyclOSM');
    expect(cyclosm.attribution).toContain('OpenStreetMap');
    expect(cyclosm.subdomains).toBe('abc');
  });

  it('every config keeps the {s}/{z}/{x}/{y} tile placeholders', () => {
    for (const id of BASEMAP_ORDER) {
      for (const theme of ['light', 'dark'] as const) {
        const { url } = tileConfig(id, theme);
        for (const ph of ['{s}', '{z}', '{x}', '{y}']) {
          expect(url).toContain(ph);
        }
      }
    }
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
