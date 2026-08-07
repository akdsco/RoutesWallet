import { describe, expect, it } from 'vitest';
import { nextRouteId, type NavKey } from './list-nav.ts';

const ids = ['a', 'b', 'c', 'd'];

describe('nextRouteId', () => {
  it('ArrowDown moves to the next id', () => {
    expect(nextRouteId(ids, 'b', 'ArrowDown')).toBe('c');
  });

  it('ArrowUp moves to the previous id', () => {
    expect(nextRouteId(ids, 'c', 'ArrowUp')).toBe('b');
  });

  it('clamps at the end (no wrap on ArrowDown)', () => {
    expect(nextRouteId(ids, 'd', 'ArrowDown')).toBe('d');
  });

  it('clamps at the start (no wrap on ArrowUp)', () => {
    expect(nextRouteId(ids, 'a', 'ArrowUp')).toBe('a');
  });

  it('Home jumps to the first id, End to the last', () => {
    expect(nextRouteId(ids, 'c', 'Home')).toBe('a');
    expect(nextRouteId(ids, 'b', 'End')).toBe('d');
  });

  it('enters at the first id when nothing is selected', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home'] as NavKey[]) {
      expect(nextRouteId(ids, null, key)).toBe('a');
    }
    expect(nextRouteId(ids, null, 'End')).toBe('d');
  });

  it('treats an unknown current id as no selection', () => {
    expect(nextRouteId(ids, 'zzz', 'ArrowDown')).toBe('a');
  });

  it('returns null for an empty list', () => {
    expect(nextRouteId([], null, 'ArrowDown')).toBeNull();
    expect(nextRouteId([], 'a', 'End')).toBeNull();
  });
});
