import { describe, it, expect } from 'vitest';
import { gazetteerLookup } from './geocode.ts';

describe('gazetteerLookup', () => {
  it('resolves known places case- and whitespace-insensitively', () => {
    expect(gazetteerLookup('Girona')).toEqual([2.8214, 41.9794]);
    expect(gazetteerLookup('  cambridge ')).toEqual([0.1218, 52.2053]);
  });

  it('returns null for unknown places', () => {
    expect(gazetteerLookup('Timbuktu')).toBeNull();
  });
});
