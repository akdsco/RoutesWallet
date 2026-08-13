import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import type { Route } from './types.ts';

// Mock the network + map boundaries; the flow logic under test is App's own.
// loadRoutes/geocode are exercised for real at the unit level (lib/*.test.ts);
// here we pin them so the App orchestration is deterministic.
vi.mock('./lib/routes-data.ts', () => ({ loadRoutes: vi.fn() }));
vi.mock('./lib/geocode.ts', () => ({ geocode: vi.fn() }));

// Leaflet needs a real canvas/layout; jsdom has neither. Swap RouteMap for a
// stub that reflects the props we care about into data-* so map-driven state
// (selection, matches, the search marker) stays observable without pixels.
vi.mock('./components/RouteMap.tsx', () => ({
  RouteMap: (props: {
    routes: { id: string }[];
    selectedId: string | null;
    matchedIds: Set<string> | null;
    searchPoint: [number, number] | null;
    poiTypes: ReadonlySet<string>;
  }) => (
    <div
      data-testid="route-map"
      data-routes={props.routes
        .map((r) => r.id)
        .sort()
        .join(',')}
      data-selected={props.selectedId ?? ''}
      data-matched={
        props.matchedIds ? [...props.matchedIds].sort().join(',') : ''
      }
      data-search={props.searchPoint ? props.searchPoint.join(',') : ''}
      data-poi={[...props.poiTypes].sort().join(',')}
    />
  ),
}));

import { App } from './App.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { sampleRoutes, CAMBRIDGE, GIRONA } from './test/fixtures.ts';

const loadRoutesMock = vi.mocked(loadRoutes);
const geocodeMock = vi.mocked(geocode);

function renderApp() {
  return render(
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  );
}

/** Render with routes loaded and wait for the cards to appear. */
async function renderLoaded() {
  loadRoutesMock.mockResolvedValue(sampleRoutes);
  const utils = renderApp();
  await screen.findByText('Cambridge Loop');
  return utils;
}

const routeList = () => screen.getByRole('group', { name: 'Routes' });
// Route cards are role=button now (a11y: real buttons, not listitems). The list
// group can also hold a "Show all routes" button in notice states, so match the
// cards by their stable data-route-id rather than role alone.
const routeCards = () =>
  within(routeList())
    .queryAllByRole('button')
    .filter((b) => b.hasAttribute('data-route-id'));
const searchBox = () =>
  screen.getByRole('textbox', { name: /find routes near a place/i });
const mapProps = () => screen.getByTestId('route-map');

/** A promise whose resolution we control, to drive out-of-order async flows. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  loadRoutesMock.mockReset();
  geocodeMock.mockReset();
  // The app writes its view into the URL (replaceState); jsdom keeps that across
  // tests in the shared window, so reset it so each test starts from a clean URL.
  window.history.replaceState(null, '', '/');
});

describe('App — loading + listing', () => {
  it('shows all routes grouped by region once data loads', async () => {
    await renderLoaded();

    const items = routeCards();
    expect(items).toHaveLength(sampleRoutes.length);

    // Grouping is the idle-list behaviour: each region gets a section header on
    // top of its per-card region labels, so a region with N cards names itself
    // N + 1 times. That extra occurrence is the header.
    expect(screen.getAllByText('Cambridgeshire')).toHaveLength(3); // header + 2 cards
    expect(screen.getAllByText('Greater London')).toHaveLength(2); // header + 1 card

    // The header count reflects the loaded total.
    expect(screen.getByText('3 routes')).toBeInTheDocument();
  });

  it('shows the empty notice when the data fails to load', async () => {
    loadRoutesMock.mockRejectedValue(new Error('boom'));
    renderApp();

    expect(await screen.findByText('No routes yet')).toBeInTheDocument();
    expect(routeCards()).toHaveLength(0);
  });
});

describe('App — search', () => {
  it('filters to routes within 25 km of the searched place', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}');

    // London Orbital (~70 km away) drops out; the two Cambridge routes remain.
    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(screen.getByText('Cambridge Loop')).toBeInTheDocument();
    expect(screen.queryByText('London Orbital')).not.toBeInTheDocument();

    // The screen-reader announcement reports the count semantically.
    expect(
      screen.getByText('2 routes within 25 km of Cambridge')
    ).toBeInTheDocument();

    // The same filtered set + search marker reach the map, not just the list.
    expect(mapProps()).toHaveAttribute('data-search', CAMBRIDGE.join(','));
    expect(mapProps().getAttribute('data-matched')?.split(',')).toEqual([
      'cam-loop',
      'grantchester',
    ]);

    // Nearest-first ordering (the group is labelled "nearest first"). The
    // fixture lists Grantchester before Cambridge Loop, so this only holds if
    // the distance sort actually ran — it's load-bearing, not incidental.
    const matched = routeCards();
    expect(within(matched[0]!).getByText('Cambridge Loop')).toBeInTheDocument();
    expect(
      within(matched[1]!).getByText('Grantchester Spin')
    ).toBeInTheDocument();
  });

  // NB: geocode is mocked here, so the postcode *branch* (ukPostcodeKind,
  // postcodes.io) is NOT exercised — that lives in geocode.test.ts (unit) and
  // e2e/app.spec.ts (real geocode vs a stubbed postcodes.io). This only proves
  // App forwards the raw query untrimmed-of-shape and treats the result like
  // any other place.
  it('forwards a postcode-shaped query verbatim to the geocoder', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'CB2 1TN{Enter}');

    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(geocodeMock).toHaveBeenCalledWith('CB2 1TN');
  });

  it('announces a no-match when nothing is within range', async () => {
    geocodeMock.mockResolvedValue(GIRONA);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Girona{Enter}');

    // The "show all routes" escape hatch marks a dismissible search notice
    // (empty-state has none), distinguishing it from the idle list.
    expect(
      await screen.findByRole('button', { name: /show all routes/i })
    ).toBeInTheDocument();
    // The copy lands in both the visible notice and the aria-live announcement.
    expect(
      screen.getAllByText('No routes within 25 km of Girona')
    ).toHaveLength(2);
    expect(routeCards()).toHaveLength(0);
  });

  it('warns when the place cannot be geocoded', async () => {
    geocodeMock.mockResolvedValue(null);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Nowheresville{Enter}');

    expect(
      await screen.findByText('Couldn’t find that place')
    ).toBeInTheDocument();
    // The distinct geofail aria-live announcement (interpolating the query) is
    // its own screen-reader contract, separate from the visible notice copy.
    expect(
      screen.getByText(/Couldn.t find .Nowheresville.\. Try a town/i)
    ).toBeInTheDocument();
  });

  it('warns when the geocode lookup throws (network failure)', async () => {
    geocodeMock.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}');

    expect(
      await screen.findByText('Couldn’t find that place')
    ).toBeInTheDocument();
  });

  it('ignores a slow earlier search once a newer one has resolved', async () => {
    // The searchSeq guard: an out-of-order geocode must not clobber fresher
    // results. Drive two overlapping searches, resolving the stale one LAST.
    const slow = deferred<[number, number] | null>();
    const fast = deferred<[number, number] | null>();
    geocodeMock
      .mockReturnValueOnce(slow.promise)
      .mockReturnValueOnce(fast.promise);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Girona{Enter}'); // seq 1 — pending
    await user.clear(searchBox());
    await user.type(searchBox(), 'Cambridge{Enter}'); // seq 2 — pending

    await act(async () => {
      fast.resolve(CAMBRIDGE);
      await Promise.resolve();
    });
    await waitFor(() => expect(routeCards()).toHaveLength(2));

    // The stale seq-1 query now resolves to a far point; the guard must drop it.
    await act(async () => {
      slow.resolve(GIRONA);
      await Promise.resolve();
    });
    expect(routeCards()).toHaveLength(2);
  });

  it('does not search before the routes have loaded', async () => {
    // Hold loadRoutes open so the app stays in its loading state.
    const gate = deferred<Route[]>();
    loadRoutesMock.mockReturnValue(gate.promise);
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    renderApp();

    await user.type(searchBox(), 'Cambridge{Enter}');
    // The guard means an early submit is a no-op — no false "no routes" banner.
    expect(geocodeMock).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve(sampleRoutes);
      await Promise.resolve();
    });
    await waitFor(() => expect(routeCards()).toHaveLength(3));
  });

  it('clears the search and restores the full list', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}');
    await waitFor(() => expect(routeCards()).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    await waitFor(() => expect(routeCards()).toHaveLength(3));
  });
});

describe('App — filters, sort & grouping', () => {
  const openFilters = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /^filters$/i }));
  // The county chip is the one control carrying aria-pressed with that name (the
  // group header uses aria-expanded; cards carry neither).
  const countyChip = (name: RegExp) =>
    screen
      .getAllByRole('button', { name })
      .find((b) => b.hasAttribute('aria-pressed'))!;

  it('idle count line reads the bare total', async () => {
    await renderLoaded();
    expect(screen.getByText('3 routes')).toBeInTheDocument();
  });

  it('a county filter narrows the pool + map, survives a search, and survives clear', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await openFilters(user);
    await user.click(countyChip(/cambridgeshire/i));

    // pool narrows to the two Cambridgeshire routes; the count line + map agree
    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(screen.getByText('2 of 3 routes')).toBeInTheDocument();
    expect(mapProps().getAttribute('data-routes')).toBe(
      'cam-loop,grantchester'
    );

    // a search ranks WITHIN the filtered pool: "K of M filtered"
    await user.type(searchBox(), 'Cambridge{Enter}');
    await waitFor(() =>
      expect(
        screen.getByText('Within 25 km of Cambridge · 2 of 2 filtered')
      ).toBeInTheDocument()
    );

    // clearing the search returns to the filtered pool, not to everything
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(screen.getByText('2 of 3 routes')).toBeInTheDocument();
  });

  it('a failed search after a successful one does not strand a nearest sort', async () => {
    geocodeMock
      .mockResolvedValueOnce(CAMBRIDGE) // first search succeeds → nearest
      .mockResolvedValueOnce(null); // second fails to geocode
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}');
    await waitFor(() => expect(routeCards()).toHaveLength(2));

    await user.clear(searchBox());
    await user.type(searchBox(), 'Nowhere{Enter}');
    await screen.findByText('Couldn’t find that place');

    // Losing the place must drop the 'nearest' sort — otherwise the view is
    // flat/ungrouped with a disabled sort, and the URL carries an invalid
    // sort=nearest with no place.
    await waitFor(() =>
      expect(window.location.search).not.toContain('sort=nearest')
    );
  });

  it('a search switches sort to Nearest first and announces it', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}');
    await waitFor(() => expect(routeCards()).toHaveLength(2));

    expect(screen.getByText('Sorted by nearest first.')).toBeInTheDocument();
    // the sort trigger now reads "Nearest"
    expect(
      screen.getByRole('button', { name: /sort: nearest/i })
    ).toBeInTheDocument();
  });

  it('writes the active filters into the URL (replaceState)', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await openFilters(user);
    await user.click(countyChip(/cambridgeshire/i));

    await waitFor(() =>
      expect(window.location.search).toContain('county=cambridgeshire')
    );
  });

  it('restores a filtered/sorted view from the URL and drops unknown params', async () => {
    // A shared link: a known county + an unknown one + an explicit sort.
    window.history.replaceState(
      null,
      '',
      '/?county=cambridgeshire,atlantis&sort=distance-desc'
    );
    await renderLoaded();

    // cambridgeshire is applied (2 routes); 'atlantis' is dropped without error
    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(screen.getByText('2 of 3 routes')).toBeInTheDocument();
    // the shared sort is restored
    expect(screen.getByRole('button', { name: /sort:/i })).toHaveTextContent(
      /distance ↓/i
    );
  });

  it('a slider drag previews the count live but re-renders the list only on release', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await openFilters(user);

    const maxSlider = screen.getByRole('slider', { name: /maximum distance/i });
    // Drag (onChange) — the count line previews the narrower pool immediately…
    fireEvent.change(maxSlider, { target: { value: '30' } });
    await waitFor(() =>
      expect(screen.getByText(/of 3 routes/)).toBeInTheDocument()
    );
    // …but the list has NOT yet dropped the out-of-range routes (commit pending).
    expect(routeCards()).toHaveLength(3);

    // Release commits: the list re-renders to the filtered pool.
    fireEvent.blur(maxSlider);
    await waitFor(() => expect(routeCards().length).toBeLessThan(3));
  });

  it('filters that exclude everything show the empty state with a way out', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await openFilters(user);
    // London only (its one route is ~61 km)…
    await user.click(countyChip(/london/i));
    // …then squeeze the distance max below it → nothing matches. onChange only
    // drafts (live count); the list re-renders on release, so commit via blur.
    const maxSlider = screen.getByRole('slider', { name: /maximum distance/i });
    fireEvent.change(maxSlider, { target: { value: '30' } });
    fireEvent.blur(maxSlider);

    expect(
      await screen.findByText(/no routes match these filters/i)
    ).toBeInTheDocument();
    // Clearing the filters brings the routes back.
    await user.click(
      screen.getByRole('button', { name: /clear all filters/i })
    );
    await waitFor(() => expect(routeCards()).toHaveLength(3));
  });
});

describe('App — selecting a route', () => {
  it('opens the detail panel with the route’s Open link when a card is chosen', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    // Target a specific card by name, not by index — order-independent.
    const card = within(routeList())
      .getByText('Cambridge Loop')
      .closest('[data-route-id]');
    await user.click(card as HTMLElement);

    // Selecting replaces the list with the detail region (§E), which owns the
    // single Open exit for the route.
    const detail = await screen.findByRole('region', { name: /route detail/i });
    const link = within(detail).getByRole('link', { name: /open in strava/i });
    expect(link).toHaveAttribute('href', 'https://www.strava.com/routes/1');
    expect(link).toHaveAttribute('target', '_blank');
    // The list is gone while the detail is shown.
    expect(
      screen.queryByRole('group', { name: 'Routes' })
    ).not.toBeInTheDocument();

    // Selection propagates to the map.
    expect(mapProps()).toHaveAttribute('data-selected', 'cam-loop');
  });
});

describe('App — POI + theme controls', () => {
  // The chips are found by their visible label — legitimate here: the label is
  // the control's identity (disambiguating otherwise-identical toggles), and we
  // assert the behaviour (aria-pressed + the layer set that reaches the map).
  it('toggles POI layers, and the change reaches the map', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    // Defaults: cafés off (they swamp the map); toilets/water/stations on.
    expect(mapProps().getAttribute('data-poi')?.split(',')).toEqual([
      'station',
      'toilet',
      'water',
    ]);
    const cafe = screen.getByRole('button', { name: 'Cafés' });
    const toilets = screen.getByRole('button', { name: 'Toilets' });
    expect(cafe).toHaveAttribute('aria-pressed', 'false');
    expect(toilets).toHaveAttribute('aria-pressed', 'true');

    // Toggle cafés ON (the add branch)…
    await user.click(cafe);
    expect(cafe).toHaveAttribute('aria-pressed', 'true');
    expect(mapProps().getAttribute('data-poi')).toContain('cafe');

    // …and toilets OFF (the delete branch) — both propagate to the map props.
    await user.click(toilets);
    expect(toilets).toHaveAttribute('aria-pressed', 'false');
    expect(mapProps().getAttribute('data-poi')).not.toContain('toilet');
  });

  // NB: the toggle is located by its aria-label, which itself flips with state
  // ("Switch to dark" ⇄ "Switch to light"). That couples this to copy — but a
  // pure `getByRole('button', { pressed })` is ambiguous (the POI chips also
  // carry aria-pressed). A stable, state-independent aria-label on the toggle
  // (Sidebar.tsx) would let this assert only aria-pressed. Flagged for the
  // Sidebar owner; not changed here (shared, churning surface).
  it('flips the theme toggle state', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const toggle = screen.getByRole('button', {
      name: /switch to dark theme/i,
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /switch to light theme/i })
      ).toHaveAttribute('aria-pressed', 'true')
    );
  });
});
