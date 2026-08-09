import type { Route } from '../types.ts';

// A tiny, deterministic route set for integration tests. Two routes hug
// Cambridge (well within the 25 km search radius of the gazetteer point
// [0.1218, 52.2053]); one sits by London, ~70 km away, so a Cambridge search
// filters it out. Regions are chosen so the idle list renders two groups.
//
// Order matters: the FARTHER Cambridge route (Grantchester, ~1.9 km) is listed
// BEFORE the nearer one (Cambridge Loop, ~0.3 km). So a "near Cambridge" search
// must reorder them (nearest-first) — the array order alone would put them the
// wrong way round. That makes the search's distance sort observable end-to-end,
// not just in the search.ts unit test.
export const CAMBRIDGE: [number, number] = [0.1218, 52.2053];
export const GIRONA: [number, number] = [2.8214, 41.9794];

export const sampleRoutes: Route[] = [
  {
    id: 'grantchester',
    name: 'Grantchester Spin',
    link: 'https://www.ridewithgps.com/routes/2',
    distance_km: 28,
    source: 'club-member',
    region: 'Cambridgeshire',
    notes: '',
    cafe: 'The Orchard Tea Garden',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0.095, 52.176],
        [0.11, 52.19],
      ],
    },
    centroid: [0.1, 52.183],
  },
  {
    id: 'cam-loop',
    name: 'Cambridge Loop',
    link: 'https://www.strava.com/routes/1',
    distance_km: 42,
    source: 'club-verified',
    region: 'Cambridgeshire',
    notes: '',
    cafe: '',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0.1, 52.2],
        [0.14, 52.21],
      ],
    },
    centroid: [0.12, 52.205],
  },
  {
    id: 'london-orbital',
    name: 'London Orbital',
    link: 'https://www.strava.com/routes/3',
    distance_km: 61,
    source: 'third-party',
    region: 'London',
    notes: '',
    cafe: '',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.13, 51.5],
        [-0.1, 51.52],
      ],
    },
    centroid: [-0.115, 51.51],
  },
];
