/**
 * Reduce a list to at most `maxPts` items by even stride, always keeping the
 * first and last. Used only for the invisible fat hover/click "hit" lines — at
 * full resolution 125 routes were ~316k SVG points re-projected every zoom
 * frame, which juddered the map. Display lines are never decimated.
 */
export function decimate<T>(pts: readonly T[], maxPts: number): T[] {
  if (maxPts < 2) throw new Error('decimate: maxPts must be >= 2');
  if (pts.length <= maxPts) return pts.slice();
  const stride = Math.ceil(pts.length / maxPts);
  const out: T[] = [];
  for (let i = 0; i < pts.length; i += stride) out.push(pts[i]!);
  const last = pts[pts.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
