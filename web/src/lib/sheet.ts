// Bottom-sheet geometry + snap resolution (Claude Design §B/§F). Pure maths so
// it's unit-tested; the component owns pointer plumbing and the DOM transform.
//
// Four snaps, but which are reachable depends on mode (§F): idle/search rests at
// peek; selecting a route floors the sheet at `detail` (peek unreachable) so you
// never see a sliver of a route you can't name. See snapsFor().

export type Snap = 'peek' | 'detail' | 'mid' | 'full';

// Tunable, like the heat tiers — named constants, not inline literals.
export const PEEK_PX = 132; // idle/search: results header + first card
// Selected entry snap. §F sketched 192, but that predated our RouteDetail, which
// carries the 44px sheet handle + a back row + name + meta + an always-present
// trust badge (§7) + a 48px Open. §F requires Open visible without scrolling at
// the entry snap, so the floor is sized to our real content (measured by eye).
export const DETAIL_PX = 260;
export const MAP_STRIP_PX = 132; // map kept visible above a full sheet
export const MID_FRACTION = 0.56; // mid = 56dvh
// A release faster than this (px of height-change per ms) throws to the next
// snap in the drag direction; slower settles to the nearest.
export const THROW_VELOCITY = 0.5;

/** Visible sheet height (px) at each snap, for a given viewport height. */
export function snapHeights(viewportPx: number): Record<Snap, number> {
  return {
    peek: PEEK_PX,
    detail: DETAIL_PX,
    mid: Math.round(viewportPx * MID_FRACTION),
    full: Math.max(PEEK_PX, viewportPx - MAP_STRIP_PX),
  };
}

/**
 * Reachable snaps, shortest→tallest, for the current mode. Selecting a route
 * swaps peek for the taller detail floor (§F: peek is unreachable while selected).
 */
export function snapsFor(selected: boolean): Snap[] {
  return selected ? ['detail', 'mid', 'full'] : ['peek', 'mid', 'full'];
}

/**
 * Which reachable snap a drag should settle to.
 * @param heightPx current visible sheet height at release
 * @param velocity px of visible-height change per ms; +expanding / −collapsing
 * @param heights  snap heights from {@link snapHeights}
 * @param allowed  reachable snaps for the mode, from {@link snapsFor}
 */
export function resolveSnap(
  heightPx: number,
  velocity: number,
  heights: Record<Snap, number>,
  allowed: Snap[]
): Snap {
  const ordered = allowed
    .map((s) => ({ snap: s, h: heights[s] }))
    .sort((a, b) => a.h - b.h);

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

  // Otherwise settle to the nearest reachable snap by height.
  return ordered.reduce((best, o) =>
    Math.abs(o.h - heightPx) < Math.abs(best.h - heightPx) ? o : best
  ).snap;
}

/** Tap-handle order: next reachable snap, wrapping. A snap outside the current
 *  set restarts at the first reachable one (e.g. peek→detail after selecting). */
export function cycleSnap(current: Snap, allowed: Snap[]): Snap {
  const i = allowed.indexOf(current);
  if (i === -1) return allowed[0]!;
  return allowed[(i + 1) % allowed.length]!;
}
