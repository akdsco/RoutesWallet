import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import type { Route } from './types.ts';

vi.mock('./lib/routes-data.ts', () => ({ loadRoutes: vi.fn() }));
vi.mock('./lib/geocode.ts', () => ({ geocode: vi.fn() }));
// Keep the real strava-connect module (buildAuthorizeUrl/readConnectStatus) but
// stub the network boundaries so we can sign a member in deterministically.
vi.mock('./lib/strava-connect.ts', async (importActual) => {
  const actual = await importActual<typeof import('./lib/strava-connect.ts')>();
  return {
    ...actual,
    fetchSession: vi.fn(),
    runSync: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('./components/RouteMap.tsx', () => ({
  RouteMap: (props: { routes: { id: string }[] }) => (
    <div
      data-testid="route-map"
      data-routes={props.routes
        .map((r) => r.id)
        .sort()
        .join(',')}
    />
  ),
}));

import { App } from './App.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { fetchSession } from './lib/strava-connect.ts';

const route = (id: string, owner?: string): Route => ({
  id,
  name: `Route ${id}`,
  link: `https://example.com/${id}`,
  distance_km: 40,
  source: owner ? 'club-member' : 'club-verified',
  country: 'United Kingdom',
  region: 'Cambridgeshire',
  notes: '',
  cafe: '',
  owner_strava_id: owner,
  geometry: {
    type: 'LineString',
    coordinates: [
      [0.1, 52.2],
      [0.14, 52.21],
    ],
  },
  centroid: [0.12, 52.205],
});

const POOL = [
  route('mine-1', '9'),
  route('theirs', '42'),
  route('mine-2', '9'),
  route('club'),
];

const mapRouteIds = () =>
  screen.getByTestId('route-map').getAttribute('data-routes');

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.mocked(loadRoutes).mockResolvedValue(POOL);
});

function renderApp() {
  render(
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  );
}

describe('App — my routes vs all club routes (TB-116)', () => {
  it('shows only the signed-in member’s routes when they switch to "My routes", then all again', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    renderApp();

    // Signed in → the scope toggle appears; the map starts on all club routes.
    const mine = await screen.findByRole('button', { name: /my routes/i });
    expect(mapRouteIds()).toBe('club,mine-1,mine-2,theirs');

    await userEvent.click(mine);
    expect(mapRouteIds()).toBe('mine-1,mine-2');

    await userEvent.click(screen.getByRole('button', { name: /all routes/i }));
    expect(mapRouteIds()).toBe('club,mine-1,mine-2,theirs');
  });

  it('offers no scope toggle to a signed-out visitor (pool is all club routes)', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ signedIn: false });
    renderApp();

    await screen.findByTestId('route-map');
    expect(
      screen.queryByRole('button', { name: /my routes/i })
    ).not.toBeInTheDocument();
    expect(mapRouteIds()).toBe('club,mine-1,mine-2,theirs');
  });
});
