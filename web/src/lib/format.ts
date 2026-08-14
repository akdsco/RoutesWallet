// Small UI formatters. Kept pure and unit-tested so the components stay dumb.

const GAIN = new Intl.NumberFormat('en-GB'); // thousands-separated, no decimals

/**
 * Total climb for the §H meta line: a whole-metre, thousands-separated value with
 * its unit, e.g. `1,240 m`. Empty string when there is no meaningful climb — null,
 * undefined, or 0 — so the `{gain && …}` guards never render a bare "m" or a
 * misleading "◺ 0 m" (§H: climb is shown only when known and non-trivial).
 */
export function formatGain(metres: number | null | undefined): string {
  if (!metres) return '';
  return `${GAIN.format(Math.round(metres))} m`;
}
