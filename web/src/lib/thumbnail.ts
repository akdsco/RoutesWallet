/**
 * Render a route's [lng, lat] line into an SVG `points` string, bbox-fitted into
 * a small box (default 52×36) with an inset. Latitude is flipped so north is up.
 * Pure — unit tested. Used for the route-card thumbnail; no extra data needed.
 */
export function routeThumbnail(
  coords: number[][],
  width = 52,
  height = 36,
  inset = 4
): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of coords) {
    const x = p[0] ?? 0;
    const y = p[1] ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const scale = Math.min((width - 2 * inset) / bw, (height - 2 * inset) / bh);
  const ox = (width - bw * scale) / 2;
  const oy = (height - bh * scale) / 2;
  return coords
    .map((p) => {
      const x = ox + ((p[0] ?? 0) - minX) * scale;
      const y = oy + (maxY - (p[1] ?? 0)) * scale; // flip: north up
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
