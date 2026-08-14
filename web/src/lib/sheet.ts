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
// carries the sheet handle + a back row + name + meta + an always-present trust
// badge (§7) + a 48px Open. §F requires Open visible without scrolling at the
// entry snap, so the floor is sized to our real content (measured by eye); the
// slim handle (HANDLE_PX) leaves it comfortably in view.
export const DETAIL_PX = 260;
export const MAP_STRIP_PX = 132; // map kept visible above a full sheet
// The drag handle's height (BottomSheet's handle button is `min-h-7` = 28px).
// A content view that pins a footer to the visible bottom must subtract it — see
// visibleContentPx.
export const HANDLE_PX = 28;
export const MID_FRACTION = 0.56; // mid = 56dvh
// A release faster than this (px of height-change per ms) throws to the next
// snap in the drag direction; slower settles to the nearest.
export const THROW_VELOCITY = 0.5;
// If the last drag sample is older than this at release, the finger paused —
// its velocity is stale, so we treat the release as a settle, not a throw.
export const STALE_MOVE_MS = 80;

/** Velocity to resolve a release with: the sampled value, unless the finger
 *  paused (last move older than STALE_MOVE_MS), in which case 0 (settle). */
export function settleVelocity(gapMs: number, velocity: number): number {
  return gapMs > STALE_MOVE_MS ? 0 : velocity;
}

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
 * Height (px) available to a sheet view's content at a snap — the visible window
 * (snapHeights[snap]) minus the handle above it. The sheet element is 100dvh
 * translated down, so a view laid out to *this* height (rather than filling the
 * 100dvh element) keeps a pinned footer at the visible bottom edge, not off-screen
 * below it. Used by the mobile filter form's commit button (TB-66).
 */
export function visibleContentPx(viewportPx: number, snap: Snap): number {
  return snapHeights(viewportPx)[snap] - HANDLE_PX;
}

/**
 * Reachable snaps, shortest→tallest, for the current mode. Selecting a route
 * swaps peek for the taller detail floor (§F: peek is unreachable while selected).
 * The mobile filter form floors at mid: its pinned commit footer can't fit the
 * peek content budget (88px), so peek would re-trap the user (TB-66). Filtering
 * wins over selection — the two are mutually exclusive on mobile (the pill hides
 * while a route is selected).
 */
export function snapsFor(selected: boolean, filtering = false): Snap[] {
  if (filtering) return ['mid', 'full'];
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
