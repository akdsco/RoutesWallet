import { describe, it, expect } from 'vitest';
import { formatGain } from './format.ts';

describe('formatGain — total climb for the §H meta line', () => {
  it('is an integer metre value, thousands-separated', () => {
    expect(formatGain(1240)).toBe('1,240 m');
    expect(formatGain(410)).toBe('410 m');
    expect(formatGain(12000)).toBe('12,000 m');
  });

  it('rounds to a whole metre (no decimals in the UI)', () => {
    expect(formatGain(1240.6)).toBe('1,241 m');
  });

  it('is empty when there is no elevation (never renders a bare "m")', () => {
    expect(formatGain(undefined)).toBe('');
    expect(formatGain(null)).toBe('');
  });
});
