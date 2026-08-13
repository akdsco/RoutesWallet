import { describe, it, expect } from 'vitest';
import { countLine } from './count-line.ts';

const base = {
  total: 96,
  poolCount: 96,
  matchCount: 0,
  hasFilters: false,
  place: '',
  radiusKm: 25,
};

describe('countLine', () => {
  it('idle, no filters: a bare total', () => {
    expect(countLine(base)).toBe('96 routes');
  });

  it('filters only: K of N routes', () => {
    expect(countLine({ ...base, poolCount: 34, hasFilters: true })).toBe(
      '34 of 96 routes'
    );
  });

  it('search only: within-radius head with a bare count', () => {
    expect(countLine({ ...base, place: 'Chelmsford', matchCount: 21 })).toBe(
      'Within 25 km of Chelmsford · 21 routes'
    );
  });

  it('filters + search: the load-bearing "K of M filtered" phrasing', () => {
    expect(
      countLine({
        ...base,
        hasFilters: true,
        poolCount: 34,
        place: 'Chelmsford',
        matchCount: 8,
      })
    ).toBe('Within 25 km of Chelmsford · 8 of 34 filtered');
  });

  it('never collapses to a bare number while filters are active', () => {
    // even at zero matches the phrasing keeps the "of N" context
    expect(countLine({ ...base, poolCount: 0, hasFilters: true })).toBe(
      '0 of 96 routes'
    );
  });
});
