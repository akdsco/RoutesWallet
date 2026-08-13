import type { Route } from '../types.ts';

/**
 * Sort orders survivors — it never changes membership (that's the filter), only
 * order. Keys double as the URL `sort=` slug. Pure — unit tested.
 */
export type SortKey =
  | 'nearest'
  | 'distance-asc'
  | 'distance-desc'
  | 'name-az'
  | 'most-ridden'
  | 'flattest'
  | 'hilliest';

export type SortOption = {
  key: SortKey;
  /** Menu label. */
  label: string;
  /** Compact form for the count-row trigger. */
  short: string;
  /** Disabled (with a "needs a place" hint) until a search is active. */
  needsSearch?: boolean;
  /** In the elevation group (below the menu divider). */
  needsElevation?: boolean;
};

/** Menu order per §G: nearest, distance ↑/↓, name, most-ridden, then elevation group. */
export const SORT_OPTIONS: readonly SortOption[] = [
  {
    key: 'nearest',
    label: 'Nearest first',
    short: 'Nearest',
    needsSearch: true,
  },
  { key: 'distance-asc', label: 'Distance, short → long', short: 'Distance ↑' },
  {
    key: 'distance-desc',
    label: 'Distance, long → short',
    short: 'Distance ↓',
  },
  { key: 'name-az', label: 'Name A–Z', short: 'Name A–Z' },
  { key: 'most-ridden', label: 'Most-ridden', short: 'Most-ridden' },
  {
    key: 'flattest',
    label: 'Flattest first',
    short: 'Flattest',
    needsElevation: true,
  },
  {
    key: 'hilliest',
    label: 'Hilliest first',
    short: 'Hilliest',
    needsElevation: true,
  },
];

const OPTION_BY_KEY = new Map(SORT_OPTIONS.map((o) => [o.key, o]));

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === 'string' && OPTION_BY_KEY.has(v as SortKey);
}

export function sortOption(key: SortKey): SortOption {
  return OPTION_BY_KEY.get(key)!;
}

export type SortContext = {
  /** route id → km from the searched place (for 'nearest'). */
  nearKm?: ReadonlyMap<string, number>;
  /** route id → ridden score (for 'most-ridden'). */
  riddenScore?: ReadonlyMap<string, number>;
};

/** Stable tiebreak so equal keys keep a deterministic order. */
function tiebreak(a: Route, b: Route): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/**
 * A sorted COPY of `routes` by `key`. Routes with no elevation sort last under
 * flattest/hilliest; a missing near/ridden value sorts to the back of its order.
 */
export function sortRoutes(
  routes: Route[],
  key: SortKey,
  ctx: SortContext = {}
): Route[] {
  const near = (r: Route) => ctx.nearKm?.get(r.id) ?? Infinity;
  const ridden = (r: Route) => ctx.riddenScore?.get(r.id) ?? 0;
  const copy = [...routes];
  switch (key) {
    case 'nearest':
      return copy.sort((a, b) => near(a) - near(b) || tiebreak(a, b));
    case 'distance-asc':
      return copy.sort(
        (a, b) => a.distance_km - b.distance_km || tiebreak(a, b)
      );
    case 'distance-desc':
      return copy.sort(
        (a, b) => b.distance_km - a.distance_km || tiebreak(a, b)
      );
    case 'most-ridden':
      return copy.sort((a, b) => ridden(b) - ridden(a) || tiebreak(a, b));
    case 'flattest':
      return copy.sort(
        (a, b) => elevOrLast(a, +1) - elevOrLast(b, +1) || tiebreak(a, b)
      );
    case 'hilliest':
      return copy.sort(
        (a, b) => elevOrLast(b, -1) - elevOrLast(a, -1) || tiebreak(a, b)
      );
    case 'name-az':
    default:
      return copy.sort(tiebreak);
  }
}

/** Elevation for sorting; routes without it are pushed to the far end either way. */
function elevOrLast(r: Route, dir: 1 | -1): number {
  return r.elevation_gain_m ?? dir * Infinity;
}

/**
 * Session sort state: the active `sort`, and whether the rider *chose* it (vs it
 * being the automatic default). `chose` is what makes a manual pick stick across
 * later searches (§G sort behaviour).
 */
export type SortState = { sort: SortKey; chose: boolean };

export const INITIAL_SORT: SortState = { sort: 'name-az', chose: false };

/** A search resolved: switch to nearest first — unless the rider chose a sort. */
export function sortOnSearch(state: SortState): SortState {
  return state.chose ? state : { sort: 'nearest', chose: false };
}

/**
 * The search cleared: fall back to Name A–Z only if the rider never chose a sort
 * (a chosen sort sticks) — but 'nearest' can't survive without a place, so it
 * always falls back.
 */
export function sortOnClear(state: SortState): SortState {
  // A chosen non-nearest sort sticks; everything else (auto sort, or a now-invalid
  // 'nearest' with no place) falls back to the default and forgets the choice.
  return state.chose && state.sort !== 'nearest' ? state : INITIAL_SORT;
}

/** The rider picked a sort — it sticks for the session. */
export function sortOnPick(key: SortKey): SortState {
  return { sort: key, chose: true };
}
