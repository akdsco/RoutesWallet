import { describe, it, expect } from 'vitest';
import { relativeTime } from './ago.ts';

const now = 1_000_000_000_000;
const ago = (ms: number) => relativeTime(now - ms, now);

describe('relativeTime', () => {
  it('reads recent times in the largest sensible unit', () => {
    expect(ago(10_000)).toBe('just now');
    expect(ago(5 * 60_000)).toBe('5 minutes ago');
    expect(ago(60_000)).toBe('1 minute ago');
    expect(ago(3 * 3_600_000)).toBe('3 hours ago');
    expect(ago(2 * 86_400_000)).toBe('2 days ago');
    expect(ago(86_400_000)).toBe('1 day ago');
  });
});
