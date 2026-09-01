import { describe, it, expect } from 'vitest';
import { initialsOf } from './initials.ts';

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Arkadiusz K')).toBe('AK');
    expect(initialsOf('Ada Lovelace')).toBe('AL');
  });
  it('falls back to the first two characters for a single word', () => {
    expect(initialsOf('Jo')).toBe('JO');
  });
});
