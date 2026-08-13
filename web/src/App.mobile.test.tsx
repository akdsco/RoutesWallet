import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';

// Same boundary mocks as App.test.tsx — the flow under test is App's own wiring.
vi.mock('./lib/routes-data.ts', () => ({ loadRoutes: vi.fn() }));
vi.mock('./lib/geocode.ts', () => ({ geocode: vi.fn() }));
vi.mock('./components/RouteMap.tsx', () => ({
  RouteMap: (props: { selectedId: string | null }) => (
    <div data-testid="route-map" data-selected={props.selectedId ?? ''} />
  ),
}));

import { App } from './App.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { sampleRoutes, CAMBRIDGE } from './test/fixtures.ts';

const loadRoutesMock = vi.mocked(loadRoutes);
const geocodeMock = vi.mocked(geocode);

// Force the mobile layout: min-width queries answer false (the shared setup
// answers them true for the desktop-by-default suite).
beforeEach(() => {
  loadRoutesMock.mockReset();
  geocodeMock.mockReset();
  window.history.replaceState(null, '', '/'); // reset the app-written URL per test
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

async function renderLoaded() {
  loadRoutesMock.mockResolvedValue(sampleRoutes);
  render(
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  );
  await screen.findByText('Cambridge Loop');
}

const sheet = () => screen.getByRole('dialog', { name: 'Routes' });
// Queried by accessible NAME: the mobile floating bar has no visible <label>, so
// this also guards that the field carries an aria-label (not just a placeholder).
const searchBox = () =>
  screen.getByRole('textbox', { name: /find routes near a place/i });
const routeCards = () =>
  within(sheet())
    .queryAllByRole('button')
    .filter((b) => b.hasAttribute('data-route-id'));

// The handle button. Its (aria-expanded, aria-label) pair identifies the snap:
//   peek → (false, Expand) · mid → (true, Expand) · full → (true, Collapse)
// while selected the sheet shows the detail region instead of the list.
const handle = () =>
  within(sheet()).getByRole('button', { name: /route list/i });
function snapOf(): 'peek' | 'mid' | 'full' {
  const h = handle();
  const expanded = h.getAttribute('aria-expanded') === 'true';
  const collapse = /collapse/i.test(h.getAttribute('aria-label') ?? '');
  if (!expanded) return 'peek';
  return collapse ? 'full' : 'mid';
}

describe('App — mobile layout (§F)', () => {
  it('renders the bottom sheet + a floating search, and no desktop sidebar', async () => {
    await renderLoaded();

    expect(sheet()).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(searchBox()).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) theme/i })
    ).toBeInTheDocument();
  });

  it('the handle is a button that cycles snaps peek → mid → full → peek', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    expect(snapOf()).toBe('peek');
    await user.click(handle());
    expect(snapOf()).toBe('mid');
    await user.click(handle());
    expect(snapOf()).toBe('full');
    await user.click(handle());
    expect(snapOf()).toBe('peek');
  });

  it('Enter and Space on the handle cycle snaps (keyboard, non-gesture path)', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    expect(snapOf()).toBe('peek');
    handle().focus();
    await user.keyboard('{Enter}');
    expect(snapOf()).toBe('mid');
    await user.keyboard('[Space]');
    expect(snapOf()).toBe('full');
  });

  it('Escape at the full snap returns to mid', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(handle()); // mid
    await user.click(handle()); // full
    expect(snapOf()).toBe('full');

    handle().focus();
    await user.keyboard('{Escape}');
    expect(snapOf()).toBe('mid');
  });

  it('a resolved search snaps the sheet to mid', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();
    expect(snapOf()).toBe('peek');

    await user.type(searchBox(), 'Cambridge{Enter}');

    await waitFor(() => expect(routeCards()).toHaveLength(2));
    expect(snapOf()).toBe('mid');
  });

  it('selecting a route shows the detail panel with the Open exit; back returns to the list', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const firstCard = routeCards()[0]!;
    const firstId = firstCard.getAttribute('data-route-id'); // order-independent
    await user.click(firstCard);

    const detail = screen.getByRole('region', { name: 'Route detail' });
    expect(
      within(detail).getByRole('button', { name: /back to/i })
    ).toBeInTheDocument();
    expect(within(detail).getByRole('link')).toBeInTheDocument(); // the exit
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected',
      firstId!
    );

    await user.click(within(detail).getByRole('button', { name: /back to/i }));
    expect(
      screen.queryByRole('region', { name: 'Route detail' })
    ).not.toBeInTheDocument();
    expect(routeCards().length).toBeGreaterThan(0);
  });

  it('deselecting restores the pre-selection snap (full), not mid', async () => {
    geocodeMock.mockResolvedValue(CAMBRIDGE);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(searchBox(), 'Cambridge{Enter}'); // → mid
    await waitFor(() => expect(routeCards()).toHaveLength(2));
    await user.click(handle()); // mid → full
    expect(snapOf()).toBe('full');

    await user.click(routeCards()[0]!); // → detail
    await user.click(
      within(screen.getByRole('region', { name: 'Route detail' })).getByRole(
        'button',
        { name: /back to/i }
      )
    );

    expect(snapOf()).toBe('full'); // restored, would be 'mid' under the old bug
  });

  it('hides the legend while a route is selected, and shows it again on exit', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    expect(screen.queryByLabelText('Map legend')).toBeInTheDocument();

    await user.click(routeCards()[0]!);
    expect(screen.queryByLabelText('Map legend')).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole('region', { name: 'Route detail' })).getByRole(
        'button',
        { name: /back to/i }
      )
    );
    expect(screen.queryByLabelText('Map legend')).toBeInTheDocument();
  });

  it('keeps the theme toggle reachable while a route is selected', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(routeCards()[0]!);
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) theme/i })
    ).toBeInTheDocument();
  });

  it('opens the filter view from the Filters pill and commits back to the list', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    // The Filters pill leads the chip row on mobile.
    const pill = screen.getByRole('button', { name: /^filters$/i });
    await user.click(pill);

    // The sheet swaps to the filter view: a "Show N routes" commit footer appears
    // and the list cards are gone.
    const commit = await screen.findByRole('button', {
      name: /show 3 routes/i,
    });
    expect(commit).toBeInTheDocument();
    expect(routeCards()).toHaveLength(0);

    // Narrowing a county updates the commit count…
    await user.click(
      screen
        .getAllByRole('button', { name: /cambridgeshire/i })
        .find((b) => b.hasAttribute('aria-pressed'))!
    );
    expect(
      await screen.findByRole('button', { name: /show 2 routes/i })
    ).toBeInTheDocument();

    // …and committing returns to the (now filtered) list.
    await user.click(screen.getByRole('button', { name: /show 2 routes/i }));
    await waitFor(() => expect(routeCards()).toHaveLength(2));
  });

  it('shows the active basemap credit in the sheet and updates it on switch', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    // Default (Standard) credit rides the list end.
    expect(
      within(sheet()).getByText(/© CARTO · © OpenStreetMap/)
    ).toBeInTheDocument();

    // Switch to CyclOSM via the mobile layers button + popover.
    await user.click(screen.getByRole('button', { name: /map style/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /cyclosm/i }));

    expect(within(sheet()).getByText(/CyclOSM/)).toBeInTheDocument();
    expect(within(sheet()).queryByText(/CARTO/)).not.toBeInTheDocument();
  });
});
