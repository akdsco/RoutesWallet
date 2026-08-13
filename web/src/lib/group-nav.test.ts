import { describe, it, expect } from 'vitest';
import { buildNavRows, groupNav, type NavRow } from './group-nav.ts';

const groups = [
  { label: 'Essex', itemIds: ['e1', 'e2'] },
  { label: 'Kent', itemIds: ['k1'] },
];

describe('buildNavRows', () => {
  it('interleaves headers and cards, dropping a folded group’s cards', () => {
    const rows = buildNavRows(groups, new Set(['Essex'])); // Kent folded
    expect(rows).toEqual<NavRow[]>([
      { kind: 'header', county: 'Essex', open: true },
      { kind: 'card', id: 'e1', county: 'Essex' },
      { kind: 'card', id: 'e2', county: 'Essex' },
      { kind: 'header', county: 'Kent', open: false }, // header present, no cards
    ]);
  });
});

describe('groupNav', () => {
  const rows = buildNavRows(groups, new Set(['Essex', 'Kent']));

  it('↓ walks header → cards → next header', () => {
    expect(
      groupNav(rows, { kind: 'header', county: 'Essex' }, 'ArrowDown')
    ).toEqual({ type: 'move', target: { kind: 'card', id: 'e1' } });
    expect(groupNav(rows, { kind: 'card', id: 'e2' }, 'ArrowDown')).toEqual({
      type: 'move',
      target: { kind: 'header', county: 'Kent' },
    });
  });

  it('↑/↓ clamp at the ends', () => {
    expect(
      groupNav(rows, { kind: 'header', county: 'Essex' }, 'ArrowUp')
    ).toEqual({ type: 'move', target: { kind: 'header', county: 'Essex' } });
    // k1 is the last row (both groups open) — ↓ stays put
    expect(groupNav(rows, { kind: 'card', id: 'k1' }, 'ArrowDown')).toEqual({
      type: 'move',
      target: { kind: 'card', id: 'k1' },
    });
  });

  it('skips a folded group’s cards entirely when walking down', () => {
    const folded = buildNavRows(groups, new Set(['Essex'])); // Kent folded
    // from Essex's last card, ↓ lands on the Kent header, never a Kent card
    expect(groupNav(folded, { kind: 'card', id: 'e2' }, 'ArrowDown')).toEqual({
      type: 'move',
      target: { kind: 'header', county: 'Kent' },
    });
  });

  it('→ unfolds a folded header, ← folds an open one', () => {
    const folded = buildNavRows(groups, new Set(['Essex']));
    expect(
      groupNav(folded, { kind: 'header', county: 'Kent' }, 'ArrowRight')
    ).toEqual({ type: 'fold', county: 'Kent', open: true });
    expect(
      groupNav(rows, { kind: 'header', county: 'Essex' }, 'ArrowLeft')
    ).toEqual({ type: 'fold', county: 'Essex', open: false });
  });

  it('→ on a card is a no-op (doesn’t toggle or leave the row)', () => {
    expect(groupNav(rows, { kind: 'card', id: 'e1' }, 'ArrowRight')).toBeNull();
  });

  it('← from a card steps out to its group header', () => {
    expect(groupNav(rows, { kind: 'card', id: 'e1' }, 'ArrowLeft')).toEqual({
      type: 'move',
      target: { kind: 'header', county: 'Essex' },
    });
  });

  it('Enter/Space toggle a header, but not a card', () => {
    expect(
      groupNav(rows, { kind: 'header', county: 'Essex' }, 'Enter')
    ).toEqual({ type: 'fold', county: 'Essex', open: false });
    expect(groupNav(rows, { kind: 'card', id: 'e1' }, ' ')).toBeNull();
  });
});
