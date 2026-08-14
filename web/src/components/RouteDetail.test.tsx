import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RouteDetail } from './RouteDetail.tsx';
import type { Route } from '../types.ts';

function makeRoute(over: Partial<Route> = {}): Route {
  return {
    id: 'r1',
    name: 'Leith Hill circuit',
    link: 'https://www.strava.com/routes/123',
    distance_km: 58,
    source: 'club-verified',
    country: 'United Kingdom',
    region: 'Surrey',
    notes: '',
    cafe: '',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    centroid: [0.5, 0.5],
    ...over,
  };
}

function render(route: Route, extra: { nearKm?: number } = {}) {
  return renderToStaticMarkup(
    <RouteDetail
      route={route}
      nearKm={extra.nearKm}
      backLabel="Back to all routes"
      backRef={createRef<HTMLButtonElement>()}
      theme="light"
      onBack={() => {}}
    />
  );
}

describe('RouteDetail', () => {
  it('shows name, distance, region, trust badge and a source-named link to the route', () => {
    const html = render(makeRoute());
    expect(html).toContain('Leith Hill circuit');
    expect(html).toContain('58 km');
    expect(html).toContain('Surrey');
    expect(html).toContain('Verified'); // trust badge label
    expect(html).toContain('Strava'); // §H: source-named exit ("Strava ↗")
    expect(html).toContain('↗');
    expect(html).toContain('href="https://www.strava.com/routes/123"');
  });

  it('pairs total climb with distance in the meta when elevation is known (§H)', () => {
    const withEle = render(makeRoute({ elevation_gain_m: 1036 }));
    expect(withEle).toContain('1,036 m');
    expect(withEle).toContain('◺');
    // …and shows no elevation glyph when the figure is absent.
    expect(render(makeRoute())).not.toContain('◺');
  });

  it('names the exit destination on the back row', () => {
    expect(render(makeRoute())).toContain('Back to all routes');
  });

  it('shows a placeholder when both cafe and notes are empty', () => {
    const empty = render(makeRoute());
    expect(empty).not.toContain('☕');
    expect(empty).toContain('No notes for this route.');
  });

  it('shows cafe + notes when present', () => {
    const full = render(
      makeRoute({ cafe: 'The Pantry', notes: 'Gravel after Ranmore' })
    );
    expect(full).toContain('The Pantry');
    expect(full).toContain('Gravel after Ranmore');
    expect(full).not.toContain('No notes for this route.');
  });

  it('shows the distance-away only when nearKm is provided', () => {
    expect(render(makeRoute(), { nearKm: 3.2 })).toContain('3.2 km away');
    expect(render(makeRoute())).not.toContain('km away');
  });

  // Overseas / unresolved routes carry region: null — the meta line must not
  // render "null" or a dangling separator.
  it('renders cleanly when region is null', () => {
    const html = render(makeRoute({ region: null }), { nearKm: 3.2 });
    expect(html).not.toContain('null');
    expect(html).toContain('3.2 km away');
    expect(html).not.toContain('· · '); // no doubled/orphan separator
  });

  const DOT = 'h-[3px] w-[3px] rounded-full bg-muted';

  it('drops the separator dot when there is no region and no distance-away', () => {
    // Otherwise a Spain/Italy route with no active search reads "34 km ·".
    expect(render(makeRoute({ region: null }))).not.toContain(DOT);
  });

  it('keeps the separator dot when there is meta to separate', () => {
    expect(render(makeRoute())).toContain(DOT); // region present
    expect(render(makeRoute({ region: null }), { nearKm: 3.2 })).toContain(DOT);
  });
});
