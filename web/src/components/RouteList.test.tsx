import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteList, type FilterEmpty, type GroupVM } from './RouteList.tsx';
import type { Route } from '../types.ts';

function route(id: string, name: string): Route {
  return {
    id,
    name,
    link: `https://example.com/${id}`,
    distance_km: 40,
    source: 'club-verified',
    country: 'United Kingdom',
    region: 'Home Counties', // deliberately NOT a county label, so 'Essex'/'Kent'
    notes: '', //                only ever appear on the group headers
    cafe: '',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0.1, 0.1],
      ],
    },
    centroid: [0.05, 0.05],
  };
}

const groups: GroupVM[] = [
  {
    label: 'Essex',
    count: 2,
    items: [{ route: route('e1', 'Coastal') }, { route: route('e2', 'Marsh') }],
  },
  { label: 'Kent', count: 1, items: [{ route: route('k1', 'Downs') }] },
];

function Harness({
  onToggleSpy,
  countLine,
  sortControl,
}: {
  onToggleSpy?: (c: string) => void;
  countLine?: string;
  sortControl?: React.ReactNode;
}) {
  const [open, setOpen] = useState(new Set(['Essex', 'Kent']));
  return (
    <RouteList
      query=""
      banner="none"
      placeLabel=""
      groups={groups}
      selectedId={null}
      backLabel="Back"
      theme="light"
      countLine={countLine}
      sortControl={sortControl}
      openGroups={open}
      onToggleGroup={(c) => {
        onToggleSpy?.(c);
        setOpen((prev) => {
          const n = new Set(prev);
          if (n.has(c)) n.delete(c);
          else n.add(c);
          return n;
        });
      }}
      onClear={() => {}}
      onSelect={() => {}}
      onDeselect={() => {}}
      onHover={() => {}}
    />
  );
}

const essexHeader = () => screen.getByRole('button', { name: /essex/i });

describe('RouteList — county groups', () => {
  it('gives each header aria-expanded + aria-controls its body', () => {
    render(<Harness />);
    const header = essexHeader();
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(header).toHaveAttribute('aria-controls');
  });

  it('folding a group removes its cards from the DOM', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(
      screen.getByRole('button', { name: /coastal/i })
    ).toBeInTheDocument();
    await user.click(essexHeader());
    expect(essexHeader()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /coastal/i })).toBeNull();
    // the other group is untouched
    expect(screen.getByRole('button', { name: /downs/i })).toBeInTheDocument();
  });

  it('← folds an open header (keyboard)', async () => {
    const user = userEvent.setup();
    const onToggleSpy = vi.fn();
    render(<Harness onToggleSpy={onToggleSpy} />);
    act(() => essexHeader().focus());
    await user.keyboard('{ArrowLeft}');
    expect(onToggleSpy).toHaveBeenCalledWith('Essex');
    expect(screen.queryByRole('button', { name: /coastal/i })).toBeNull();
  });

  it('renders the count line and the sort control on the count row', () => {
    render(
      <Harness
        countLine="2 of 5 routes"
        sortControl={<button type="button">Sort</button>}
      />
    );
    expect(screen.getByText('2 of 5 routes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
  });

  it('shows total climb paired with distance on a card when elevation is known (§H)', () => {
    const withEle = route('ele', 'Climby');
    withEle.elevation_gain_m = 1036;
    render(
      <RouteList
        query=""
        banner="none"
        placeLabel=""
        groups={[{ label: 'Essex', count: 1, items: [{ route: withEle }] }]}
        selectedId={null}
        backLabel="Back"
        theme="light"
        onClear={() => {}}
        onSelect={() => {}}
        onDeselect={() => {}}
        onHover={() => {}}
      />
    );
    const card = screen.getByText('Climby').closest('[data-route-id]')!;
    expect(card).toHaveTextContent('40 km');
    expect(card).toHaveTextContent('1,036 m');
    // The ◺ glyph is decorative; AT hears "climb" instead (matches the detail views).
    expect(card).toHaveTextContent(/climb/i);
    const hiddenHasGlyph = [
      ...card.querySelectorAll('[aria-hidden="true"]'),
    ].some((el) => el.textContent?.includes('◺'));
    expect(hiddenHasGlyph).toBe(true);
  });
});

describe('RouteList — contributor attribution (TB-114)', () => {
  function renderCard(r: Route) {
    render(
      <RouteList
        query=""
        banner="none"
        placeLabel=""
        groups={[{ label: 'Essex', count: 1, items: [{ route: r }] }]}
        selectedId={null}
        backLabel="Back"
        theme="light"
        onClear={() => {}}
        onSelect={() => {}}
        onDeselect={() => {}}
        onHover={() => {}}
      />
    );
    return screen.getByText(r.name).closest('[data-route-id]')!;
  }

  it('names the contributor on the card when the route has an owner', () => {
    const r = route('own', 'Owned');
    r.owner_name = 'Robbie de Santos';
    const card = renderCard(r);
    expect(card).toHaveTextContent(/by Robbie de Santos/i);
  });

  it('shows the name verbatim, keeping any club tag', () => {
    const r = route('tag', 'Tagged');
    r.owner_name = 'Arkadiusz | HV';
    const card = renderCard(r);
    expect(card).toHaveTextContent(/by Arkadiusz \| HV/i);
  });

  it('shows no attribution when the route has no owner', () => {
    const card = renderCard(route('anon', 'Anonymous'));
    expect(card).not.toHaveTextContent(/\bby\b/i);
  });
});

describe('RouteList — filter-empty state', () => {
  function renderEmpty(empty: FilterEmpty) {
    render(
      <RouteList
        query=""
        banner="none"
        placeLabel=""
        groups={[]}
        selectedId={null}
        backLabel="Back"
        theme="light"
        countLine="0 of 5 routes"
        filterEmpty={empty}
        onClear={() => {}}
        onSelect={() => {}}
        onDeselect={() => {}}
        onHover={() => {}}
      />
    );
  }

  it('names the way out with working Clear-all and Widen actions', async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const onWiden = vi.fn();
    renderEmpty({
      detail: 'Widening the distance range would add 12 routes.',
      onClearAll,
      onWiden,
    });
    expect(
      screen.getByText(/no routes match these filters/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/add 12 routes/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /clear all filters/i })
    );
    expect(onClearAll).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /widen distance/i }));
    expect(onWiden).toHaveBeenCalled();
  });

  it('omits the Widen action when widening would not help', () => {
    renderEmpty({ detail: 'Nothing here.', onClearAll: () => {} });
    expect(
      screen.queryByRole('button', { name: /widen distance/i })
    ).toBeNull();
  });
});
