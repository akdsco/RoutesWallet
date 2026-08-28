import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MobileRouteDetail } from './MobileRouteDetail.tsx';
import type { Route } from '../types.ts';

const base: Route = {
  id: 'r1',
  name: 'Ware and Hertfordshire',
  link: 'https://www.strava.com/routes/1',
  distance_km: 106,
  source: 'club-verified',
  country: 'United Kingdom',
  region: 'Essex',
  notes: 'gravel after Ranmore rides fine on 28s',
  cafe: 'Denbies Farm Shop',
  elevation_gain_m: 1240,
  geometry: { type: 'LineString', coordinates: [] },
  centroid: [0, 0],
};

const setup = (r: Partial<Route> = {}) =>
  render(<MobileRouteDetail route={{ ...base, ...r }} theme="light" />);

describe('MobileRouteDetail — §H compact selected sheet', () => {
  it('shows the name, a trust glyph, and a source-named link with the arrow', () => {
    setup();
    const region = screen.getByRole('region', { name: 'Route detail' });
    expect(within(region).getByText('Ware and Hertfordshire')).toBeVisible();
    expect(
      within(region).getByRole('img', { name: /club-verified route/i })
    ).toBeInTheDocument();
    // Source-named exit (not "Open in Strava"), opening in a new tab, with the
    // open arrow (the space between is flex gap, so not in textContent).
    const open = within(region).getByRole('link', { name: /strava/i });
    expect(open).toHaveTextContent('Strava');
    expect(open).toHaveTextContent('↗');
    expect(open).toHaveAttribute('target', '_blank');
  });

  it('renders a GPX link as a download (↓, not ↗)', () => {
    setup({ link: 'https://cdn.example.com/loop.gpx' });
    const open = screen.getByRole('link', { name: /gpx/i });
    expect(open).toHaveTextContent('GPX');
    expect(open).toHaveTextContent('↓');
  });

  it('pairs elevation with distance in the meta line', () => {
    setup();
    const region = screen.getByRole('region', { name: 'Route detail' });
    expect(within(region).getByText('106 km')).toBeInTheDocument();
    expect(within(region).getByText('1,240 m')).toBeInTheDocument();
    expect(within(region).getByText('Essex')).toBeInTheDocument();
  });

  it('shows the café + notes, and a placeholder when there are none', () => {
    setup();
    expect(screen.getByText(/denbies farm shop/i)).toBeInTheDocument();
    expect(screen.getByText(/gravel after ranmore/i)).toBeInTheDocument();

    setup({ cafe: '', notes: '' });
    expect(screen.getByText(/no notes for this route/i)).toBeInTheDocument();
  });

  it('reports its content height so the sheet can open content-fit (§H)', () => {
    const onMeasure = vi.fn();
    render(
      <MobileRouteDetail route={base} theme="light" onMeasure={onMeasure} />
    );
    expect(onMeasure).toHaveBeenCalled();
    expect(typeof onMeasure.mock.calls[0]![0]).toBe('number');
  });

  it('attributes the contributor with a link to their Strava profile (TB-114)', () => {
    setup({ owner_name: 'Robbie de Santos', owner_strava_id: '12955681' });
    const region = screen.getByRole('region', { name: 'Route detail' });
    // Byline text is split across the <p> and the link, so match on the region.
    expect(region).toHaveTextContent(/by Robbie de Santos/i);
    const profile = within(region).getByRole('link', {
      name: /view Robbie de Santos on strava/i,
    });
    expect(profile).toHaveAttribute(
      'href',
      'https://www.strava.com/athletes/12955681'
    );
    expect(profile).toHaveAttribute('target', '_blank');
  });

  it('shows the contributor as plain text when the strava id is unusable', () => {
    setup({ owner_name: 'Nicolas Laurent', owner_strava_id: 'nope' });
    const region = screen.getByRole('region', { name: 'Route detail' });
    expect(region).toHaveTextContent(/by Nicolas Laurent/i);
    expect(
      within(region).queryByRole('link', { name: /nicolas laurent/i })
    ).toBeNull();
  });

  it('shows no attribution when the route has no owner', () => {
    setup();
    const region = screen.getByRole('region', { name: 'Route detail' });
    expect(region).not.toHaveTextContent(/\bby /i);
  });
});
