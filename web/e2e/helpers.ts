import type { Page } from '@playwright/test';

// A deterministic routes feed mirroring src/test/fixtures.ts: two routes hug
// Cambridge (within the 25 km radius of the gazetteer point [0.1218, 52.2053]),
// one sits by London ~70 km away. Kept small so E2E never touches the 6 MB
// production feed or the club's real geography. Same deliberate order as the
// integration fixture: the farther Cambridge route (Grantchester) comes first.
const ROUTES_FEED = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'grantchester',
        name: 'Grantchester Spin',
        link: 'https://www.ridewithgps.com/routes/2',
        distance_km: 28,
        source: 'club-member',
        country: 'United Kingdom',
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
        id: 'cam-loop',
        name: 'Cambridge Loop',
        link: 'https://www.strava.com/routes/1',
        distance_km: 42,
        source: 'club-verified',
        country: 'United Kingdom',
        region: 'Cambridgeshire',
        // Elevation + notes so the §H content-fit open has something to size to
        // (Grantchester stays bare — the short/tall contrast the e2e asserts).
        elevation_gain_m: 850,
        cafe: 'Fitzbillies',
        notes: 'Quiet fen lanes; gravel option past Grantchester.',
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
        id: 'london-orbital',
        name: 'London Orbital',
        link: 'https://www.strava.com/routes/3',
        distance_km: 61,
        source: 'third-party',
        country: 'United Kingdom',
        region: 'Greater London',
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

  // The live source is now /api/routes (the Cloudflare Function reading the D1
  // pool). `vite preview` doesn't run Functions, so serve the same fixture feed
  // there. routes.geojson is kept stubbed as the (now inert) on-disk seed source.
  await page.route('**/api/routes', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ROUTES_FEED),
    })
  );

  await page.route('**/routes.geojson', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ROUTES_FEED),
    })
  );

  // The member-session endpoints (TB-116). `vite preview` doesn't run Functions,
  // so default them to "signed out" / no-ops; a connect journey overrides these
  // per-test (Playwright matches the last-registered handler first).
  await page.route('**/api/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ signedIn: false }),
    })
  );
  await page.route('**/connect/logout', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ signedIn: false }),
    })
  );
  await page.route('**/connect/sync', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ added: 0, skipped: 0 }),
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
