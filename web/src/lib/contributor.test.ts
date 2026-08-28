import { describe, it, expect } from 'vitest';
import { contributorName, stravaProfileUrl } from './contributor.ts';

describe('contributorName', () => {
  it('returns the name verbatim, including a club tag (no normalisation)', () => {
    expect(contributorName('Arkadiusz | HV')).toBe('Arkadiusz | HV');
    expect(contributorName('Robbie de Santos')).toBe('Robbie de Santos');
    expect(contributorName('kate n')).toBe('kate n');
  });

  it('trims surrounding whitespace', () => {
    expect(contributorName('  Alex Booker  ')).toBe('Alex Booker');
  });

  it('returns null when absent, empty, or whitespace-only', () => {
    expect(contributorName(undefined)).toBeNull();
    expect(contributorName('')).toBeNull();
    expect(contributorName('   ')).toBeNull();
  });
});

describe('stravaProfileUrl', () => {
  it('builds the athlete profile URL for a numeric id', () => {
    expect(stravaProfileUrl('24005105')).toBe(
      'https://www.strava.com/athletes/24005105'
    );
  });

  it('returns null for a missing, empty, or non-numeric id', () => {
    expect(stravaProfileUrl(undefined)).toBeNull();
    expect(stravaProfileUrl('')).toBeNull();
    expect(stravaProfileUrl('abc')).toBeNull();
    expect(stravaProfileUrl('12 3')).toBeNull();
    expect(stravaProfileUrl('12a')).toBeNull();
  });
});
