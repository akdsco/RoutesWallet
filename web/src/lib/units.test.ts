import { describe, it, expect } from 'vitest';
import { formatDistance, readUnits, UNITS_KEY } from './units.ts';

describe('formatDistance', () => {
  it('renders km unchanged (whole or decimal)', () => {
    expect(formatDistance(42, 'km')).toBe('42 km');
    expect(formatDistance(3.2, 'km', 1)).toBe('3.2 km');
  });
  it('converts to miles, rounding whole and honouring decimals', () => {
    expect(formatDistance(16.0934, 'mi')).toBe('10 mi');
    expect(formatDistance(1.60934, 'mi', 1)).toBe('1.0 mi');
  });
});

describe('readUnits', () => {
  it('defaults to km and round-trips a stored choice', () => {
    localStorage.removeItem(UNITS_KEY);
    expect(readUnits()).toBe('km');
    localStorage.setItem(UNITS_KEY, 'mi');
    expect(readUnits()).toBe('mi');
    localStorage.setItem(UNITS_KEY, 'garbage');
    expect(readUnits()).toBe('km');
  });
});
