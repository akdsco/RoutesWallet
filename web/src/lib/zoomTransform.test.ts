import { describe, it, expect } from 'vitest';
import {
  zoomAnchorOffset,
  projectUnderZoom,
  type Vec2,
} from './zoomTransform.ts';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('zoomAnchorOffset keeps the cursor point pinned', () => {
  const anchors: Vec2[] = [
    { x: 0, y: 0 },
    { x: 684, y: 314 },
    { x: -120, y: 900 },
  ];
  const panes: Vec2[] = [
    { x: 0, y: 0 },
    { x: -2048, y: -1536 },
    { x: 512, y: -300 },
  ];
  // zoom in (scale > 1), zoom out (scale < 1), and no-op
  const scales = [0.125, 0.5, 1, 2, 4, 11.3];

  for (const anchor of anchors) {
    for (const pane of panes) {
      for (const scale of scales) {
        it(`anchor (${anchor.x},${anchor.y}) pane (${pane.x},${pane.y}) x${scale} stays fixed`, () => {
          const offset = zoomAnchorOffset(anchor, pane, scale);
          const landed = projectUnderZoom(anchor, pane, offset, scale);
          expect(near(landed.x, anchor.x)).toBe(true);
          expect(near(landed.y, anchor.y)).toBe(true);
        });
      }
    }
  }

  it('scale of 1 is the identity (offset === pane)', () => {
    const pane = { x: 512, y: -300 };
    const offset = zoomAnchorOffset({ x: 684, y: 314 }, pane, 1);
    expect(near(offset.x, pane.x)).toBe(true);
    expect(near(offset.y, pane.y)).toBe(true);
  });

  it('points scale around the anchor by exactly `scale`', () => {
    const anchor = { x: 684, y: 314 };
    const pane = { x: -2048, y: -1536 };
    const scale = 4;
    const offset = zoomAnchorOffset(anchor, pane, scale);
    // a point 10px right / 6px up of the anchor should end up 4x as far away
    const p = { x: anchor.x + 10, y: anchor.y - 6 };
    const landed = projectUnderZoom(p, pane, offset, scale);
    expect(near(landed.x - anchor.x, 10 * scale)).toBe(true);
    expect(near(landed.y - anchor.y, -6 * scale)).toBe(true);
  });
});
