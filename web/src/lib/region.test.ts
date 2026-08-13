import { describe, it, expect } from 'vitest';
import {
  UK_COUNTIES,
  isUkCounty,
  nameHintCountry,
  resolveRegionByVotes,
  sampleAlong,
} from './region.ts';

describe('UK_COUNTIES canonical set', () => {
  it('is a closed, frozen list of full county names', () => {
    expect(Object.isFrozen(UK_COUNTIES)).toBe(true);
    // representative members the legacy data maps onto (full names, not abbrevs)
    for (const c of [
      'Essex',
      'Kent',
      'Hertfordshire',
      'Buckinghamshire',
      'Surrey',
      'Greater London',
      'Berkshire',
      'Devon',
      'Somerset',
    ]) {
      expect(UK_COUNTIES).toContain(c);
    }
    // the informal legacy labels are NOT members
    for (const bad of ['Herts', 'Bucks', 'Windsor and Maidenhead', 'London']) {
      expect(UK_COUNTIES).not.toContain(bad);
    }
  });

  it('isUkCounty recognises canonical names only', () => {
    expect(isUkCounty('Hertfordshire')).toBe(true);
    expect(isUkCounty('Herts')).toBe(false);
    expect(isUkCounty('')).toBe(false);
  });
});

describe('nameHintCountry', () => {
  it('maps overseas training-camp names to their country', () => {
    expect(nameHintCountry('Girona - just Girona')).toBe('Spain');
    expect(nameHintCountry('Calpe: Coll de Rates (longer)')).toBe('Spain');
    expect(nameHintCountry('Girona (Tia’s favourite)')).toBe('Spain');
  });

  it('returns null when no country can be inferred from the name', () => {
    expect(nameHintCountry('Better route to Brighton')).toBeNull();
    expect(nameHintCountry("Liam's route")).toBeNull();
    expect(nameHintCountry('')).toBeNull();
  });
});

describe('sampleAlong', () => {
  it('samples count points evenly by index, endpoints included', () => {
    expect(sampleAlong([0, 1, 2, 3, 4, 5, 6, 7, 8], 5)).toEqual([
      0, 2, 4, 6, 8,
    ]);
    expect(sampleAlong(['a', 'b', 'c', 'd', 'e'], 5)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('handles short / degenerate inputs', () => {
    expect(sampleAlong([42], 5)).toEqual([42]);
    expect(sampleAlong([], 5)).toEqual([]);
    expect(sampleAlong([1, 2, 3], 1)).toEqual([1]);
  });
});

describe('resolveRegionByVotes', () => {
  it('the majority county wins (a London start/finish is outvoted)', () => {
    expect(
      resolveRegionByVotes(
        ['Greater London', 'Kent', 'Kent', 'Kent', 'Greater London'],
        'Kent Hills'
      )
    ).toEqual({ country: 'United Kingdom', region: 'Kent' });
  });

  it('a route wholly in one county resolves to it', () => {
    expect(
      resolveRegionByVotes(['Essex', 'Essex', 'Essex', 'Essex', 'Essex'], 'x')
    ).toEqual({ country: 'United Kingdom', region: 'Essex' });
  });

  it('an away county beats a London majority (London is the home county)', () => {
    // London leads 4–1 on raw votes, but the ride reaches Kent, so it is a Kent ride.
    expect(
      resolveRegionByVotes(
        [
          'Greater London',
          'Greater London',
          'Greater London',
          'Greater London',
          'Kent',
        ],
        'Kent Hills'
      )
    ).toEqual({ country: 'United Kingdom', region: 'Kent' });
  });

  it('among multiple away counties, the most-voted wins (ties alphabetical)', () => {
    expect(
      resolveRegionByVotes(
        ['Greater London', 'Surrey', 'Kent', 'Kent', 'Greater London'],
        'x'
      )
    ).toEqual({ country: 'United Kingdom', region: 'Kent' });
  });

  it('a London-only ride stays Greater London', () => {
    expect(
      resolveRegionByVotes(
        ['Greater London', 'Greater London', 'Greater London'],
        'Olympic Park loop'
      )
    ).toEqual({ country: 'United Kingdom', region: 'Greater London' });
  });

  it('no UK county among votes, overseas name → country hint, region null', () => {
    expect(
      resolveRegionByVotes([null, null, null, null, null], 'Girona - 70km')
    ).toEqual({ country: 'Spain', region: null });
  });

  it('no UK county, unknown name → both null (never empty string)', () => {
    const r = resolveRegionByVotes([null, null, null], "Liam's route");
    expect(r).toEqual({ country: null, region: null });
    expect(r.region).not.toBe('');
    expect(r.country).not.toBe('');
  });

  it('ignores non-canonical vote values', () => {
    expect(resolveRegionByVotes(['Herts', 'Herts', null], 'x')).toEqual({
      country: null,
      region: null,
    });
  });
});
