/**
 * Roving-tabindex keyboard model for the grouped route list (§G, extends §D's
 * flat list nav). The visible sequence is group headers interleaved with their
 * cards; a folded group contributes its header but NOT its cards, so focus never
 * enters hidden content. ↑/↓ walk the sequence (header → cards → next header),
 * ←/→ fold/unfold explicitly. Enter/Space are NOT handled here — a header is a
 * real <button>, so the component lets its native activation own the toggle (one
 * fold path, no divergence). Pure — unit tested; the component maps the returned
 * intent onto real focus + fold state.
 */

export type NavRow =
  | { kind: 'header'; county: string; open: boolean }
  | { kind: 'card'; id: string; county: string };

export type NavTarget =
  { kind: 'header'; county: string } | { kind: 'card'; id: string };

export type NavResult =
  | { type: 'move'; target: NavTarget }
  | { type: 'fold'; county: string; open: boolean }
  | null;

export type GroupRows = { label: string; itemIds: string[] };

/** Flatten groups to the visible sequence — folded groups drop their cards. */
export function buildNavRows(
  groups: GroupRows[],
  open: ReadonlySet<string>
): NavRow[] {
  const rows: NavRow[] = [];
  for (const g of groups) {
    const isOpen = open.has(g.label);
    rows.push({ kind: 'header', county: g.label, open: isOpen });
    if (isOpen) {
      for (const id of g.itemIds) {
        rows.push({ kind: 'card', id, county: g.label });
      }
    }
  }
  return rows;
}

function targetOf(row: NavRow): NavTarget {
  return row.kind === 'header'
    ? { kind: 'header', county: row.county }
    : { kind: 'card', id: row.id };
}

function indexOf(rows: NavRow[], current: NavTarget | null): number {
  if (!current) return -1;
  return rows.findIndex((r) =>
    current.kind === 'header'
      ? r.kind === 'header' && r.county === current.county
      : r.kind === 'card' && r.id === current.id
  );
}

function move(rows: NavRow[], i: number): NavResult {
  const row = rows[i];
  return row ? { type: 'move', target: targetOf(row) } : null;
}

/** Resolve a key press to a move/fold intent (or null when the key does nothing). */
export function groupNav(
  rows: NavRow[],
  current: NavTarget | null,
  key: string
): NavResult {
  if (rows.length === 0) return null;
  const last = rows.length - 1;
  const idx = indexOf(rows, current);
  const cur = idx >= 0 ? rows[idx]! : null;

  switch (key) {
    case 'ArrowDown':
      return move(rows, idx < 0 ? 0 : Math.min(idx + 1, last));
    case 'ArrowUp':
      return move(rows, idx < 0 ? 0 : Math.max(idx - 1, 0));
    case 'Home':
      return move(rows, 0);
    case 'End':
      return move(rows, last);
    case 'ArrowRight':
      // Unfold a folded header; on a card, no-op (don't leave the row).
      if (cur?.kind === 'header' && !cur.open)
        return { type: 'fold', county: cur.county, open: true };
      return null;
    case 'ArrowLeft':
      // Fold an open header; from a card, step out to its header.
      if (cur?.kind === 'header' && cur.open)
        return { type: 'fold', county: cur.county, open: false };
      if (cur?.kind === 'card')
        return { type: 'move', target: { kind: 'header', county: cur.county } };
      return null;
    default:
      // Enter/Space are intentionally not handled — the header <button>'s native
      // activation owns the fold toggle in the component.
      return null;
  }
}
