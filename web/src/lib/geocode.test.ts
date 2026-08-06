import { describe, it, expect } from 'vitest';
import { gazetteerLookup, countryFromLocales } from './geocode.ts';

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
