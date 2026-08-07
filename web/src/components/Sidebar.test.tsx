import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LineString } from 'geojson';
import { Sidebar, type GroupVM } from './Sidebar.tsx';
import type { Route } from '../types.ts';

function route(id: string, name: string): Route {
  const geometry: LineString = {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0.1, 0.1],
    ],
  };
  return {
    id,
    name,
    link: `https://example.com/${id}`,
    distance_km: 42,
    source: 'club-verified',
    region: 'Kent',
    notes: '',
    cafe: '',
    geometry,
    centroid: [0.05, 0.05],
  };
}

const groups: GroupVM[] = [
  {
    label: 'Kent',
    count: 3,
    items: [
      { route: route('a', 'Alpha Loop') },
      { route: route('b', 'Bravo Circuit') },
      { route: route('c', 'Charlie Traverse') },
    ],
  },
];

/** Stateful harness so selection actually moves as keys are pressed. */
function Harness({ onSelect }: { onSelect?: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <Sidebar
      totalCount={3}
      query=""
      hint="Shows routes passing within 25 km"
      banner="none"
      placeLabel=""
      groups={groups}
      selectedId={selectedId}
      theme="light"
      onQueryChange={() => {}}
      onSubmit={() => {}}
      onClear={() => {}}
      onSelect={(id) => {
        onSelect?.(id);
        setSelectedId(id);
      }}
      onHover={() => {}}
      onToggleTheme={() => {}}
      onSearchFocusChange={() => {}}
    />
  );
}

const card = (name: RegExp) => screen.getByRole('button', { name });

describe('Sidebar route list a11y', () => {
  it('renders each route as a button carrying its name', () => {
    render(<Harness />);
    expect(card(/Alpha Loop/)).toBeInTheDocument();
    expect(card(/Bravo Circuit/)).toBeInTheDocument();
    // Not a listitem any more.
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('reflects selection via aria-pressed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(card(/Alpha Loop/)).toHaveAttribute('aria-pressed', 'false');
    await user.click(card(/Alpha Loop/));
    expect(card(/Alpha Loop/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses a roving tabindex: one entry point, others removed from Tab order', () => {
    render(<Harness />);
    // Nothing selected → the first card is the single tab stop.
    expect(card(/Alpha Loop/)).toHaveAttribute('tabindex', '0');
    expect(card(/Bravo Circuit/)).toHaveAttribute('tabindex', '-1');
    expect(card(/Charlie Traverse/)).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowDown/ArrowUp move selection and focus through the list', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    card(/Alpha Loop/).focus();
    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenLastCalledWith('b');
    expect(card(/Bravo Circuit/)).toHaveFocus();
    expect(card(/Bravo Circuit/)).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowUp}');
    expect(onSelect).toHaveBeenLastCalledWith('a');
    expect(card(/Alpha Loop/)).toHaveFocus();
  });

  it('End jumps to the last card, Home back to the first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    card(/Alpha Loop/).focus();
    await user.keyboard('{End}');
    expect(card(/Charlie Traverse/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(card(/Alpha Loop/)).toHaveFocus();
  });

  it('Enter and Space select the focused card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    card(/Bravo Circuit/).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('b');
    card(/Charlie Traverse/).focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith('c');
  });

  it('exposes the Open link on the selected card without nesting it in Tab twice', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(card(/Alpha Loop/));
    const selected = card(/Alpha Loop/);
    const link = within(selected).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/a');
  });
});
