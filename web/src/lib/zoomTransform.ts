/**
 * Pure math behind the smooth, cursor-anchored wheel zoom (see RouteMap). During
 * a gesture we scale the whole map pane with a CSS transform instead of
 * re-rendering; this computes the transform so the point under the cursor stays
 * pinned. If it regresses, the map slides out from under the pointer.
 */
export type Vec2 = { x: number; y: number };

/**
 * The transform offset that scales pane content by `scale` around the FIXED
 * screen point `anchor`, given the pane's current translate `pane`.
 *
 * Content at screen position s sits at pane-local `s - pane`, and the transform
 * `translate(offset) scale(scale)` renders it at `offset + scale*(s - pane)`.
 * Picking `offset = anchor - (anchor - pane) * scale` makes the anchor map back
 * to itself while everything else scales around it.
 */
export function zoomAnchorOffset(
  anchor: Vec2,
  pane: Vec2,
  scale: number
): Vec2 {
  return {
    x: anchor.x - (anchor.x - pane.x) * scale,
    y: anchor.y - (anchor.y - pane.y) * scale,
  };
}

/**
 * Where the content currently at screen point `screen` lands after applying
 * `translate(offset) scale(scale)` to a pane translated by `pane`. Used by the
 * tests to prove the anchor stays fixed.
 */
export function projectUnderZoom(
  screen: Vec2,
  pane: Vec2,
  offset: Vec2,
  scale: number
): Vec2 {
  return {
    x: offset.x + scale * (screen.x - pane.x),
    y: offset.y + scale * (screen.y - pane.y),
  };
}
