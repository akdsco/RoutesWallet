// Bottom-sheet geometry + snap resolution (Claude Design spec §B). Pure maths so
// it's unit-tested; the component owns pointer plumbing and the DOM transform.

export type Snap = 'peek' | 'mid' | 'full';

export const SNAP_ORDER: readonly Snap[] = ['peek', 'mid', 'full'];

// Tunable, like the heat tiers — keep them here as named constants, not inline
// literals, so they're retunable by eye without touching the component.
export const PEEK_PX = 132; // handle + search header ("header + one card")
export const MAP_STRIP_PX = 132; // map kept visible above a full sheet
export const MID_FRACTION = 0.56; // mid = 56dvh
// A release faster than this (px of height-change per ms) throws to the next
// snap in the drag direction; slower settles to the nearest.
export const THROW_VELOCITY = 0.5;

/** Visible sheet height (px) at each snap, for a given viewport height. */
export function snapHeights(viewportPx: number): Record<Snap, number> {
  return {
    peek: PEEK_PX,
    mid: Math.round(viewportPx * MID_FRACTION),
    full: Math.max(PEEK_PX, viewportPx - MAP_STRIP_PX),
  };
}

/**
 * Which snap a drag should settle to.
 * @param heightPx   current visible sheet height at release
 * @param velocity   px of visible-height change per ms; +expanding / −collapsing
 * @param heights    snap heights from {@link snapHeights}
 */
export function resolveSnap(
  heightPx: number,
  velocity: number,
  heights: Record<Snap, number>
): Snap {
  const ordered = SNAP_ORDER.map((s) => ({ snap: s, h: heights[s] }));

  if (velocity > THROW_VELOCITY) {
    // Expanding fast: the next snap taller than where we let go (else the top).
    const up = ordered.find((o) => o.h > heightPx);
    return (up ?? ordered[ordered.length - 1]!).snap;
  }
  if (velocity < -THROW_VELOCITY) {
    // Collapsing fast: the next snap shorter than where we let go (else the floor).
    const down = [...ordered].reverse().find((o) => o.h < heightPx);
    return (down ?? ordered[0]!).snap;
  }

  // Otherwise settle to the nearest snap by height.
  return ordered.reduce((best, o) =>
    Math.abs(o.h - heightPx) < Math.abs(best.h - heightPx) ? o : best
  ).snap;
}

/** Tap-handle order: peek → mid → full → peek. */
export function cycleSnap(current: Snap): Snap {
  const i = SNAP_ORDER.indexOf(current);
  return SNAP_ORDER[(i + 1) % SNAP_ORDER.length]!;
}
