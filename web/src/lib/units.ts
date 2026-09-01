/**
 * Distance units (account redesign, Settings). A per-browser preference — km by
 * default — applied through `formatDistance` so every distance in the app reads in
 * the rider's chosen unit. km values render exactly as before (no rounding), so
 * turning this off is a no-op; only miles convert.
 */
export type Units = 'km' | 'mi';

export const UNITS_KEY = 'rw:units';
const KM_PER_MI = 1.60934;

/** Format a distance in km into the chosen unit, optionally with N decimals. */
export function formatDistance(km: number, units: Units, decimals = 0): string {
  if (units === 'km') {
    return decimals > 0 ? `${km.toFixed(decimals)} km` : `${km} km`;
  }
  const mi = km / KM_PER_MI;
  return decimals > 0 ? `${mi.toFixed(decimals)} mi` : `${Math.round(mi)} mi`;
}

/** The saved units choice, or 'km' if unset/invalid/unavailable. */
export function readUnits(): Units {
  try {
    return window.localStorage.getItem(UNITS_KEY) === 'mi' ? 'mi' : 'km';
  } catch {
    // silent-ok: storage disabled (private mode) → default to km.
    return 'km';
  }
}

/** Persist the units choice; best-effort (storage may be disabled). */
export function saveUnits(units: Units): void {
  try {
    window.localStorage.setItem(UNITS_KEY, units);
  } catch {
    // silent-ok: storage disabled → the choice just won't persist across visits.
  }
}
