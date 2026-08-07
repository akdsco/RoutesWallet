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

describe('RouteDetail', () => {
  it('shows name, distance, region, trust badge and an Open link to the route', () => {
    const html = renderToStaticMarkup(
      <RouteDetail route={makeRoute()} onClose={() => {}} />
    );
    expect(html).toContain('Leith Hill circuit');
    expect(html).toContain('58 km');
    expect(html).toContain('Surrey');
    expect(html).toContain('Verified'); // trust badge label
    expect(html).toContain('href="https://www.strava.com/routes/123"');
  });

  it('omits cafe + notes when empty, shows them when present', () => {
    const empty = renderToStaticMarkup(
      <RouteDetail route={makeRoute()} onClose={() => {}} />
    );
    expect(empty).not.toContain('☕');

    const full = renderToStaticMarkup(
      <RouteDetail
        route={makeRoute({ cafe: 'The Pantry', notes: 'Gravel after Ranmore' })}
        onClose={() => {}}
      />
    );
    expect(full).toContain('The Pantry');
    expect(full).toContain('Gravel after Ranmore');
  });

  it('shows the distance-away only when nearKm is provided', () => {
    const html = renderToStaticMarkup(
      <RouteDetail route={makeRoute()} nearKm={3.2} onClose={() => {}} />
    );
    expect(html).toContain('3.2 km away');
  });
});
