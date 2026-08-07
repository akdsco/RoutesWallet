/**
 * Pure keyboard-navigation logic for the route list. Given the routes in the
 * order they render, the currently selected id, and a nav key, returns the id
 * that navigation should land on. Clamps at both ends (no wrap), which is the
 * expected feel for a vertical option list. UI wiring (focus, scroll, map
 * highlight) lives in the component; this stays pure so it can be unit-tested.
 */

export type NavKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function nextRouteId(
  orderedIds: string[],
  currentId: string | null,
  key: NavKey
): string | null {
  if (orderedIds.length === 0) return null;
  const last = orderedIds.length - 1;

  if (key === 'Home') return orderedIds[0] ?? null;
  if (key === 'End') return orderedIds[last] ?? null;

  // An unknown/absent selection means the list isn't entered yet: the first
  // arrow lands on the top card.
  const i = currentId ? orderedIds.indexOf(currentId) : -1;
  if (i === -1) return orderedIds[0] ?? null;

  const next = key === 'ArrowDown' ? Math.min(i + 1, last) : Math.max(i - 1, 0);
  return orderedIds[next] ?? null;
}
