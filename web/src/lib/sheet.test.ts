import { describe, it, expect } from 'vitest';
import {
  SNAP_ORDER,
  PEEK_PX,
  MAP_STRIP_PX,
  snapHeights,
  resolveSnap,
  cycleSnap,
  type Snap,
} from './sheet.ts';

// A phone-ish viewport for the height maths.
const VP = 800;
const H = snapHeights(VP);

describe('snapHeights', () => {
  it('peek is the fixed peek height', () => {
    expect(H.peek).toBe(PEEK_PX);
  });

  it('full leaves a map strip above the sheet', () => {
    expect(H.full).toBe(VP - MAP_STRIP_PX);
  });

  it('orders peek < mid < full', () => {
    expect(H.peek).toBeLessThan(H.mid);
    expect(H.mid).toBeLessThan(H.full);
  });

  it('never collapses below peek on a tiny viewport', () => {
    const tiny = snapHeights(120);
    expect(tiny.full).toBeGreaterThanOrEqual(PEEK_PX);
  });
});

describe('resolveSnap — no throw (velocity below threshold) picks the nearest', () => {
  it('a slow release just above peek settles back to peek', () => {
    expect(resolveSnap(H.peek + 20, 0, H)).toBe('peek');
  });

  it('a slow release near mid settles to mid', () => {
    expect(resolveSnap(H.mid + 10, 0.1, H)).toBe('mid');
  });

  it('a slow release near full settles to full', () => {
    expect(resolveSnap(H.full - 15, -0.2, H)).toBe('full');
  });

  it('exactly between peek and mid rounds to the nearer (peek)', () => {
    const between = (H.peek + H.mid) / 2 - 1;
    expect(resolveSnap(between, 0, H)).toBe('peek');
  });
});

describe('resolveSnap — a fast throw jumps to the next snap in the drag direction', () => {
  it('a hard upward flick just above peek reaches mid, not full', () => {
    expect(resolveSnap(H.peek + 10, 1.5, H)).toBe('mid');
  });

  it('a hard upward flick just below full reaches full', () => {
    expect(resolveSnap(H.full - 10, 1.5, H)).toBe('full');
  });

  it('a hard downward flick from near full drops to mid, not peek', () => {
    expect(resolveSnap(H.full - 10, -1.5, H)).toBe('mid');
  });

  it('a hard downward flick from near mid drops to peek', () => {
    expect(resolveSnap(H.mid - 5, -1.5, H)).toBe('peek');
  });

  it('an upward throw already at full clamps to full', () => {
    expect(resolveSnap(H.full, 2, H)).toBe('full');
  });

  it('a downward throw already at peek clamps to peek', () => {
    expect(resolveSnap(H.peek, -2, H)).toBe('peek');
  });
});

describe('cycleSnap — the tap-handle order', () => {
  it('cycles peek -> mid -> full -> peek', () => {
    expect(cycleSnap('peek')).toBe('mid');
    expect(cycleSnap('mid')).toBe('full');
    expect(cycleSnap('full')).toBe('peek');
  });

  it('SNAP_ORDER is peek, mid, full', () => {
    expect(SNAP_ORDER).toEqual<Snap[]>(['peek', 'mid', 'full']);
  });
});
