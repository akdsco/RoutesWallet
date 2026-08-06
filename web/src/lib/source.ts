import type { RouteSource } from '../types.ts';

/**
 * Display metadata for each trust tier. Club-agnostic labels so another club can
 * reuse this as-is; swap `label`/`blurb` here if a club wants its own wording.
 */
export const SOURCE_META: Record<
  RouteSource,
  { label: string; blurb: string }
> = {
  'club-verified': { label: 'Verified', blurb: 'Club-verified route' },
  'club-member': { label: 'Member', blurb: 'Shared by a club member' },
  'third-party': { label: '3rd-party', blurb: 'Third-party route' },
};

/** Only third-party routes are drawn dashed on the map (untrusted source). */
export function isDashed(source: RouteSource): boolean {
  return source === 'third-party';
}
