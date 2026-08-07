import type { Page } from '@playwright/test';

// A deterministic routes feed mirroring src/test/fixtures.ts: two routes hug
// Cambridge (within the 25 km radius of the gazetteer point [0.1218, 52.2053]),
// one sits by London ~70 km away. Kept small so E2E never touches the 6 MB
// production feed or the club's real geography.
const ROUTES_FEED = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'cam-loop',
        name: 'Cambridge Loop',
        link: 'https://www.strava.com/routes/1',
        distance_km: 42,
        source: 'club-verified',
        region: 'Cambridgeshire',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.1, 52.2],
          [0.14, 52.21],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'grantchester',
        name: 'Grantchester Spin',
        link: 'https://www.ridewithgps.com/routes/2',
        distance_km: 28,
        source: 'club-member',
        region: 'Cambridgeshire',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.095, 52.176],
          [0.11, 52.19],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'london-orbital',
        name: 'London Orbital',
        link: 'https://www.strava.com/routes/3',
        distance_km: 61,
        source: 'third-party',
        region: 'London',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.13, 51.5],
          [-0.1, 51.52],
        ],
      },
    },
  ],
};

/**
 * Stub every external dependency so a journey is deterministic and offline:
 * block map tiles (pixels we never assert), serve the fixture routes feed, and
 * return canned coordinates for the postcode + Nominatim geocoders. Call before
 * navigating.
 */
export async function stubExternal(page: Page): Promise<void> {
  // Registered first, so it has the LOWEST priority (Playwright matches handlers
  // last-registered-first). Any external host NOT explicitly stubbed below is
  // aborted — so a stub whose URL silently drifts fails loudly instead of
  // leaking a real network call that happens to still pass. Local preview
  // requests (localhost) are left untouched and served normally.
  await page.route(
    (url) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
    (route) => route.abort()
  );

  await page.route('**/routes.geojson', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ROUTES_FEED),
    })
  );

  // UK postcode → postcodes.io, fixed to a Cambridge point so a postcode search
  // matches the two Cambridge routes.
  await page.route(/api\.postcodes\.io\//, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        result: { longitude: 0.1218, latitude: 52.2053 },
      }),
    })
  );

  // Nominatim is the FALLBACK. Return a deliberately out-of-range point (Girona,
  // ~1,000 km away) so the postcode journey is load-bearing: if the postcode
  // path breaks and falls through to here, the search yields zero matches and
  // the test fails, instead of both geocoders returning the same Cambridge hit.
  await page.route(/nominatim\.openstreetmap\.org/, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ lon: '2.8214', lat: '41.9794' }]),
    })
  );
}
