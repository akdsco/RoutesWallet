import type { Domain, Domains, Filters, Range } from './filters.ts';
import { defaultFilters, rangeIsDefault } from './filters.ts';
import { isSortKey, type SortKey } from './sort.ts';

/**
 * The shareable view: filters + sort + search place, as URL query params. Fold and
 * selection are deliberately NOT encoded (ergonomics, not a shareable view).
 * Params: `?county=&dist=&elev=&sort=&near=`. Slugged county names survive a data
 * reimport; anything omitted is at its default; decode degrades (drops unknown
 * counties / out-of-domain ranges) rather than erroring. Pure — unit tested.
 */

export type ViewState = { filters: Filters; sort: SortKey; near: string };

/** URL-safe slug for a county name — lowercase, non-alphanumerics to single hyphens. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function encodeRange(range: Range, domain: Domain): string | null {
  return rangeIsDefault(range, domain) ? null : `${range[0]}-${range[1]}`;
}

/** The sort implied by context — the default we don't bother encoding. */
export function contextualSort(near: string): SortKey {
  return near ? 'nearest' : 'name-az';
}

/** Encode a view to a query string (no leading `?`); a clean view is an empty string. */
export function encodeView(view: ViewState, domains: Domains): string {
  const p = new URLSearchParams();
  if (view.filters.counties.size) {
    p.set('county', [...view.filters.counties].map(slugify).join(','));
  }
  const dist = encodeRange(view.filters.distance, domains.distance);
  if (dist) p.set('dist', dist);
  const elev = encodeRange(view.filters.elevation, domains.elevation);
  if (elev) p.set('elev', elev);
  if (view.sort !== contextualSort(view.near)) p.set('sort', view.sort);
  if (view.near) p.set('near', view.near);
  return p.toString();
}

function parseRange(raw: string, domain: Domain): Range | null {
  const parts = raw.split('-');
  if (parts.length !== 2) return null;
  const lo = Number(parts[0]);
  const hi = Number(parts[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return null;
  const clamp = (v: number) => Math.min(domain.max, Math.max(domain.min, v));
  const range: Range = [clamp(lo), clamp(hi)];
  return rangeIsDefault(range, domain) ? null : range;
}

/**
 * Decode a query string into a view, keyed on the known `counties` (to resolve
 * slugs) and `domains` (to clamp ranges). Unknown counties and out-of-domain
 * ranges are dropped silently; the rest is applied on top of the defaults.
 */
export function decodeView(
  search: string | URLSearchParams,
  counties: string[],
  domains: Domains
): ViewState {
  const p = typeof search === 'string' ? new URLSearchParams(search) : search;
  const filters = defaultFilters(domains);

  const near = p.get('near') ?? '';

  const countyParam = p.get('county');
  if (countyParam) {
    const bySlug = new Map(counties.map((c) => [slugify(c), c]));
    const chosen = new Set<string>();
    for (const slug of countyParam.split(',')) {
      const name = bySlug.get(slug);
      if (name) chosen.add(name); // unknown slug → dropped
    }
    if (chosen.size) filters.counties = chosen;
  }

  const dist = p.get('dist');
  if (dist) {
    const r = parseRange(dist, domains.distance);
    if (r) filters.distance = r;
  }
  const elev = p.get('elev');
  if (elev) {
    const r = parseRange(elev, domains.elevation);
    if (r) filters.elevation = r;
  }

  const sortParam = p.get('sort');
  let sort: SortKey = isSortKey(sortParam) ? sortParam : contextualSort(near);
  // 'nearest' is meaningless without a place — a shared URL carrying it (or a
  // hand-edited one) would strand the rider on a disabled sort. Fall back.
  if (sort === 'nearest' && !near) sort = 'name-az';

  return { filters, sort, near };
}
