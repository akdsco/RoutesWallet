import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';

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
    selectedId: string | null;
    matchedIds: Set<string> | null;
    searchPoint: [number, number] | null;
  }) => (
    <div
      data-testid="route-map"
      data-selected={props.selectedId ?? ''}
      data-matched={props.matchedIds ? [...props.matchedIds].join(',') : ''}
      data-search={props.searchPoint ? props.searchPoint.join(',') : ''}
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

const routeList = () => screen.getByRole('list', { name: 'Routes' });

beforeEach(() => {
  loadRoutesMock.mockReset();
  geocodeMock.mockReset();
});

describe('App — loading + listing', () => {
  it('shows all routes grouped by region once data loads', async () => {
    await renderLoaded();

    const items = within(routeList()).getAllByRole('listitem');
    expect(items).toHaveLength(sampleRoutes.length);

    // Grouping is the idle-list behaviour: each region gets a section header on
    // top of its per-card region labels, so a region with N cards names itself
    // N + 1 times. That extra occurrence is the header.
    expect(screen.getAllByText('Cambridgeshire')).toHaveLength(3); // header + 2 cards
    expect(screen.getAllByText('London')).toHaveLength(2); // header + 1 card

    // The header count reflects the loaded total.
    expect(screen.getByText('3 routes')).toBeInTheDocument();
  });

  it('shows the empty notice when the data fails to load', async () => {
    loadRoutesMock.mockRejectedValue(new Error('boom'));
    renderApp();

    expect(await screen.findByText('No routes yet')).toBeInTheDocument();
    expect(within(routeList()).queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('App — search', () => {
  it('filters to routes within 25 km of the searched place', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'Cambridge{Enter}'
    );

    // London Orbital (~70 km away) drops out; the two Cambridge routes remain.
    await waitFor(() =>
      expect(within(routeList()).getAllByRole('listitem')).toHaveLength(2)
    );
    expect(screen.getByText('Cambridge Loop')).toBeInTheDocument();
    expect(screen.queryByText('London Orbital')).not.toBeInTheDocument();

    // The screen-reader announcement reports the count semantically.
    expect(
      screen.getByText('2 routes within 25 km of Cambridge')
    ).toBeInTheDocument();

    // The map receives the same match set + search marker.
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-search',
      CAMBRIDGE.join(',')
    );
  });

  it('resolves a UK postcode the same as any place', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'CB2 1TN{Enter}'
    );

    await waitFor(() =>
      expect(within(routeList()).getAllByRole('listitem')).toHaveLength(2)
    );
    expect(geocodeMock).toHaveBeenCalledWith('CB2 1TN');
  });

  it('announces a no-match when nothing is within range', async () => {
    geocodeMock.mockResolvedValue(GIRONA);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'Girona{Enter}'
    );

    // The "show all routes" escape hatch marks a dismissible search notice
    // (empty-state has none), distinguishing it from the idle list.
    expect(
      await screen.findByRole('button', { name: /show all routes/i })
    ).toBeInTheDocument();
    // The copy lands in both the visible notice and the aria-live announcement.
    expect(
      screen.getAllByText('No routes within 25 km of Girona')
    ).toHaveLength(2);
    expect(within(routeList()).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('warns when the place cannot be geocoded', async () => {
    geocodeMock.mockResolvedValue(null);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'Nowheresville{Enter}'
    );

    expect(
      await screen.findByText('Couldn’t find that place')
    ).toBeInTheDocument();
  });

  it('warns when the geocode lookup throws (network failure)', async () => {
    geocodeMock.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'Cambridge{Enter}'
    );

    expect(
      await screen.findByText('Couldn’t find that place')
    ).toBeInTheDocument();
  });

  it('clears the search and restores the full list', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(
      screen.getByRole('textbox', { name: /find routes near a place/i }),
      'Cambridge{Enter}'
    );
    await waitFor(() =>
      expect(within(routeList()).getAllByRole('listitem')).toHaveLength(2)
    );

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    await waitFor(() =>
      expect(within(routeList()).getAllByRole('listitem')).toHaveLength(3)
    );
  });
});

describe('App — selecting a route', () => {
  it('reveals the open-in link with the route’s href when a card is chosen', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const items = within(routeList()).getAllByRole('listitem');
    await user.click(items[0]!);

    const link = await screen.findByRole('link', { name: /open in strava/i });
    expect(link).toHaveAttribute('href', 'https://www.strava.com/routes/1');
    expect(link).toHaveAttribute('target', '_blank');

    // Selection propagates to the map.
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected',
      'cam-loop'
    );
  });
});

describe('App — POI + theme controls', () => {
  it('toggles the café POI layer via aria-pressed', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const cafe = screen.getByRole('button', { name: 'Cafés' });
    // Cafés default off (they swamp the map); the rest default on.
    expect(cafe).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Toilets' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(cafe);
    expect(cafe).toHaveAttribute('aria-pressed', 'true');
  });

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
