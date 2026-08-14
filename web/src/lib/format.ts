// Small UI formatters. Kept pure and unit-tested so the components stay dumb.

const GAIN = new Intl.NumberFormat('en-GB'); // thousands-separated, no decimals

/**
 * Total climb for the §H meta line: a whole-metre, thousands-separated value with
 * its unit, e.g. `1,240 m`. Empty string when there is no elevation, so the meta
 * line never renders a bare "m" (§H: climb is always paired with distance).
 */
export function formatGain(metres: number | null | undefined): string {
  if (metres == null) return '';
  return `${GAIN.format(Math.round(metres))} m`;
}
