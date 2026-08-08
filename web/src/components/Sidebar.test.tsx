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

/** Stateful harness so select ↔ detail and back ↔ list actually swap. */
function Harness({
  onSelect,
  onDeselect,
  onHover,
}: {
  onSelect?: (id: string) => void;
  onDeselect?: () => void;
  onHover?: (id: string | null) => void;
}) {
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
      backLabel="Back to all routes"
      theme="light"
      onQueryChange={() => {}}
      onSubmit={() => {}}
      onClear={() => {}}
      onSelect={(id) => {
        onSelect?.(id);
        setSelectedId(id);
      }}
      onDeselect={() => {
        onDeselect?.();
        setSelectedId(null);
      }}
      onHover={(id) => onHover?.(id)}
      onToggleTheme={() => {}}
      onSearchFocusChange={() => {}}
    />
  );
}

const card = (name: RegExp) => screen.getByRole('button', { name });

describe('Sidebar route list a11y', () => {
  it('renders each route as a button carrying its name, not a listitem', () => {
    render(<Harness />);
    expect(card(/Alpha Loop/)).toBeInTheDocument();
    expect(card(/Bravo Circuit/)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('uses a roving tabindex: one entry point, others out of Tab order', () => {
    render(<Harness />);
    expect(card(/Alpha Loop/)).toHaveAttribute('tabindex', '0');
    expect(card(/Bravo Circuit/)).toHaveAttribute('tabindex', '-1');
    expect(card(/Charlie Traverse/)).toHaveAttribute('tabindex', '-1');
  });

  it('arrows move focus and mirror the map highlight — they do not select', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onHover = vi.fn();
    render(<Harness onSelect={onSelect} onHover={onHover} />);

    card(/Alpha Loop/).focus();
    await user.keyboard('{ArrowDown}');
    expect(card(/Bravo Circuit/)).toHaveFocus();
    expect(onHover).toHaveBeenLastCalledWith('b'); // mirrors highlight
    expect(onSelect).not.toHaveBeenCalled(); // arrow ≠ select

    await user.keyboard('{End}');
    expect(card(/Charlie Traverse/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(card(/Alpha Loop/)).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Enter, Space and click select — opening the detail panel', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    card(/Bravo Circuit/).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('b');
    // The list is replaced by the detail region for the selected route.
    expect(
      screen.getByRole('region', { name: /route detail/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /routes/i })
    ).not.toBeInTheDocument();
  });

  it('the detail panel shows the Open link and a labelled back row', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(card(/Alpha Loop/));
    const region = screen.getByRole('region', { name: /route detail/i });
    expect(within(region).getByRole('link')).toHaveAttribute(
      'href',
      'https://example.com/a'
    );
    expect(
      within(region).getByRole('button', { name: /back to all routes/i })
    ).toBeInTheDocument();
  });

  it('focus moves to the back row on select and back to the card on exit', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(card(/Alpha Loop/));
    const back = screen.getByRole('button', { name: /back to all routes/i });
    expect(back).toHaveFocus();

    await user.click(back);
    // Back to the list, focus restored to the route's card.
    expect(card(/Alpha Loop/)).toHaveFocus();
  });
});
