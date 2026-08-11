import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
import { sampleRoutes } from './test/fixtures.ts';

const loadRoutesMock = vi.mocked(loadRoutes);

// Force the mobile layout: min-width queries answer false (the shared setup
// answers them true for the desktop-by-default suite).
beforeEach(() => {
  loadRoutesMock.mockReset();
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
const routeCards = () =>
  within(sheet())
    .queryAllByRole('button')
    .filter((b) => b.hasAttribute('data-route-id'));

describe('App — mobile layout (§F)', () => {
  it('renders the bottom sheet + a floating search, and no desktop sidebar', async () => {
    await renderLoaded();

    expect(sheet()).toBeInTheDocument();
    // The desktop sidebar (an <aside>) must not be present on mobile.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    // Search floats (single textbox), with the theme toggle beside it.
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) theme/i })
    ).toBeInTheDocument();
  });

  it('the handle is a button that cycles snaps (non-gesture path)', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const handle = within(sheet()).getByRole('button', {
      name: /expand route list/i,
    });
    // Idle rests at peek → not expanded; a tap cycles peek → mid.
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    await user.click(handle);
    expect(handle).toHaveAttribute('aria-expanded', 'true');
  });

  it('selecting a route shows the detail panel in the sheet with the Open exit', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(routeCards()[0]!);

    const detail = screen.getByRole('region', { name: 'Route detail' });
    expect(
      within(detail).getByRole('button', { name: /back to/i })
    ).toBeInTheDocument();
    // The exit — the one action the product exists to deliver — is present.
    expect(within(detail).getByRole('link')).toBeInTheDocument();
    // Selection reflected to the map.
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected',
      sampleRoutes[0]!.id
    );
  });

  it('back from the detail returns to the list', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(routeCards()[0]!);
    const detail = screen.getByRole('region', { name: 'Route detail' });
    await user.click(within(detail).getByRole('button', { name: /back to/i }));

    expect(
      screen.queryByRole('region', { name: 'Route detail' })
    ).not.toBeInTheDocument();
    expect(routeCards().length).toBeGreaterThan(0);
  });
});
