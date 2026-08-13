import { describe, it, expect } from 'vitest';
import {
  encodeView,
  decodeView,
  slugify,
  type ViewState,
} from './url-state.ts';
import { defaultFilters, type Domains } from './filters.ts';

const domains: Domains = {
  distance: { min: 10, max: 150, hardMax: 500 },
  elevation: { min: 0, max: 2000, hardMax: 12000 },
};
const counties = ['Essex', 'Hertfordshire', 'Windsor and Maidenhead'];

describe('slugify', () => {
  it('lowercases and hyphenates, collapsing punctuation', () => {
    expect(slugify('Windsor and Maidenhead')).toBe('windsor-and-maidenhead');
    expect(slugify('Other/Ultra')).toBe('other-ultra');
    expect(slugify('Hub Velo trips')).toBe('hub-velo-trips');
  });
});

describe('encode/decode round-trip', () => {
  it('round-trips county, dist, elev, sort and near', () => {
    const view: ViewState = {
      filters: {
        ...defaultFilters(domains),
        counties: new Set(['Essex', 'Hertfordshire']),
        distance: [55, 95],
        elevation: [200, 800],
      },
      sort: 'distance-asc',
      near: 'Chelmsford',
    };
    const qs = encodeView(view, domains);
    expect(qs).toContain('county=essex%2Chertfordshire');
    expect(qs).toContain('dist=55-95');
    expect(qs).toContain('elev=200-800');
    expect(qs).toContain('sort=distance-asc');
    expect(qs).toContain('near=Chelmsford');

    const back = decodeView(qs, counties, domains);
    expect([...back.filters.counties].sort()).toEqual([
      'Essex',
      'Hertfordshire',
    ]);
    expect(back.filters.distance).toEqual([55, 95]);
    expect(back.filters.elevation).toEqual([200, 800]);
    expect(back.sort).toBe('distance-asc');
    expect(back.near).toBe('Chelmsford');
  });

  it('a clean view is an empty query string', () => {
    const view: ViewState = {
      filters: defaultFilters(domains),
      sort: 'name-az',
      near: '',
    };
    expect(encodeView(view, domains)).toBe('');
  });

  it('omits the sort when it equals the contextual default', () => {
    const base = defaultFilters(domains);
    // no search → name-az is the default, so it is not encoded
    expect(
      encodeView({ filters: base, sort: 'name-az', near: '' }, domains)
    ).toBe('');
    // with a search → nearest is the default, so it is not encoded
    expect(
      encodeView({ filters: base, sort: 'nearest', near: 'Ely' }, domains)
    ).toBe('near=Ely');
  });
});

describe('decode degrades, never errors', () => {
  it('drops unknown county slugs but keeps the known ones', () => {
    const back = decodeView('county=essex,atlantis', counties, domains);
    expect([...back.filters.counties]).toEqual(['Essex']);
  });

  it('clamps an out-of-domain range and drops it if it covers the whole domain', () => {
    const back = decodeView('dist=0-9999', counties, domains);
    // clamped to the domain edges → equivalent to no distance filter
    expect(back.filters.distance).toEqual([
      domains.distance.min,
      domains.distance.max,
    ]);
  });

  it('ignores a malformed range without throwing', () => {
    const back = decodeView('dist=abc&elev=5', counties, domains);
    expect(back.filters.distance).toEqual([
      domains.distance.min,
      domains.distance.max,
    ]);
    expect(back.filters.elevation).toEqual([
      domains.elevation.min,
      domains.elevation.max,
    ]);
  });

  it('falls back to the contextual sort for an unknown sort key', () => {
    expect(decodeView('sort=bogus', counties, domains).sort).toBe('name-az');
    expect(decodeView('sort=bogus&near=Ely', counties, domains).sort).toBe(
      'nearest'
    );
  });

  it('drops sort=nearest when there is no place (it needs one)', () => {
    // hand-edited / stale URL: nearest with no near would strand a disabled sort
    expect(decodeView('sort=nearest', counties, domains).sort).toBe('name-az');
    // but nearest is kept when a place is present
    expect(decodeView('sort=nearest&near=Ely', counties, domains).sort).toBe(
      'nearest'
    );
  });
});
