import { describe, it, expect } from 'vitest';
import {
  UK_COUNTIES,
  isUkCounty,
  nameHintCountry,
  resolveCountryRegion,
  type CountyOf,
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

describe('resolveCountryRegion', () => {
  const inEssex: CountyOf = () => 'Essex';
  const nowhere: CountyOf = () => null;

  it('a start inside a UK county → United Kingdom + that county', () => {
    expect(
      resolveCountryRegion({ start: [0.5, 51.7], name: 'x' }, inEssex)
    ).toEqual({
      country: 'United Kingdom',
      region: 'Essex',
    });
  });

  it('a start outside all counties, overseas name → country hint, region null', () => {
    expect(
      resolveCountryRegion(
        { start: [2.8, 41.98], name: 'Girona - 70km' },
        nowhere
      )
    ).toEqual({ country: 'Spain', region: null });
  });

  it('a start outside all counties, unknown name → both null (never empty string)', () => {
    const r = resolveCountryRegion(
      { start: [0, 0], name: "Liam's route" },
      nowhere
    );
    expect(r).toEqual({ country: null, region: null });
    expect(r.region).not.toBe('');
    expect(r.country).not.toBe('');
  });
});
