import { describe, it, expect } from 'vitest';
import {
  PEEK_PX,
  DETAIL_PX,
  MAP_STRIP_PX,
  STALE_MOVE_MS,
  snapHeights,
  snapsFor,
  resolveSnap,
  cycleSnap,
  settleVelocity,
  type Snap,
} from './sheet.ts';

// A phone-ish viewport for the height maths.
const VP = 800;
const H = snapHeights(VP);
const IDLE = snapsFor(false); // ['peek','mid','full']
const SEL = snapsFor(true); // ['detail','mid','full']

describe('snapHeights', () => {
  it('peek and detail are the fixed entry heights', () => {
    expect(H.peek).toBe(PEEK_PX);
    expect(H.detail).toBe(DETAIL_PX);
  });

  it('full leaves a map strip above the sheet', () => {
    expect(H.full).toBe(VP - MAP_STRIP_PX);
  });

  it('orders peek < detail < mid < full', () => {
    expect(H.peek).toBeLessThan(H.detail);
    expect(H.detail).toBeLessThan(H.mid);
    expect(H.mid).toBeLessThan(H.full);
  });

  it('never collapses full below the detail floor on a tiny viewport', () => {
    const tiny = snapHeights(120);
    expect(tiny.full).toBeGreaterThanOrEqual(PEEK_PX);
  });
});

describe('snapsFor — the reachable snaps depend on selection (design §F)', () => {
  it('idle/search can reach peek but not detail', () => {
    expect(snapsFor(false)).toEqual<Snap[]>(['peek', 'mid', 'full']);
  });

  it('selected floors at detail; peek is unreachable', () => {
    expect(snapsFor(true)).toEqual<Snap[]>(['detail', 'mid', 'full']);
  });
});

describe('resolveSnap — slow release settles to the nearest reachable snap', () => {
  it('idle: a slow release just above peek settles to peek', () => {
    expect(resolveSnap(H.peek + 20, 0, H, IDLE)).toBe('peek');
  });

  it('selected: a slow release near the detail floor settles to detail, not peek', () => {
    expect(resolveSnap(H.detail + 15, 0, H, SEL)).toBe('detail');
  });

  it('selected: peek height rounds up to detail (peek is unreachable)', () => {
    expect(resolveSnap(H.peek, 0, H, SEL)).toBe('detail');
  });

  it('a slow release near full settles to full', () => {
    expect(resolveSnap(H.full - 15, -0.2, H, IDLE)).toBe('full');
  });
});

describe('resolveSnap — a fast throw jumps to the next reachable snap in the drag direction', () => {
  it('idle: hard upward flick just above peek reaches mid, not full', () => {
    expect(resolveSnap(H.peek + 10, 1.5, H, IDLE)).toBe('mid');
  });

  it('selected: hard downward flick from near full drops to mid, not detail', () => {
    expect(resolveSnap(H.full - 10, -1.5, H, SEL)).toBe('mid');
  });

  it('selected: downward throw already at the detail floor clamps to detail', () => {
    expect(resolveSnap(H.detail, -2, H, SEL)).toBe('detail');
  });

  it('idle: downward throw already at peek clamps to peek', () => {
    expect(resolveSnap(H.peek, -2, H, IDLE)).toBe('peek');
  });
});

describe('settleVelocity — a paused release must not throw (design §F drag)', () => {
  it('keeps the sampled velocity when the finger was still moving', () => {
    expect(settleVelocity(16, 1.5)).toBe(1.5);
    expect(settleVelocity(STALE_MOVE_MS, -1.2)).toBe(-1.2);
  });

  it('zeroes the velocity when the finger paused before lifting (stale sample)', () => {
    // Flick fast, hold ~300ms, then lift → the last sample is stale, so settle
    // nearest rather than fling to the next snap.
    expect(settleVelocity(300, 1.5)).toBe(0);
    expect(settleVelocity(STALE_MOVE_MS + 1, 2)).toBe(0);
  });
});

describe('cycleSnap — the tap-handle order within the reachable set', () => {
  it('idle cycles peek -> mid -> full -> peek', () => {
    expect(cycleSnap('peek', IDLE)).toBe('mid');
    expect(cycleSnap('mid', IDLE)).toBe('full');
    expect(cycleSnap('full', IDLE)).toBe('peek');
  });

  it('selected cycles detail -> mid -> full -> detail', () => {
    expect(cycleSnap('detail', SEL)).toBe('mid');
    expect(cycleSnap('full', SEL)).toBe('detail');
  });

  it('a snap outside the set restarts at the first reachable one', () => {
    expect(cycleSnap('peek', SEL)).toBe('detail');
  });
});
