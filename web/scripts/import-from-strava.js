/*
 * Strava → routes.geojson importer (manual, browser-console).
 *
 * These are Hub Velo's OWN routes, exported as GPX by a logged-in member — a
 * first-party Strava feature. The exported files become user-uploaded content in
 * our app, which is why this sidesteps the Strava API's own-data-only rule. Do NOT
 * turn this into an unattended scraper; keep it gentle (it sleeps between fetches).
 *
 * HOW TO RUN
 * 1. Log in to https://www.strava.com in a browser.
 * 2. Open DevTools console on any strava.com page.
 * 3. Paste the `META` array (id + sheet metadata for the routes you want) below.
 * 4. Paste this whole file, run it, then save the returned object as
 *    web/public/routes.geojson.
 *
 * `id` is the number in a route URL: strava.com/routes/<id>.
 */

// Fill from the Google Sheet: one entry per route.
const META = [
  // { id: '3079343783499010458', name: 'Girona - just Girona', distance_km: 34,
  //   region: 'Hub Velo trips', type: 'Road', cafe: '', notes: '' },
];

const MAX_POINTS = 200; // downsample cap per route, to keep the file light
const SLEEP_MS = 2000; // be a good citizen between requests

async function importRoutes(meta) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const features = [];
  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    try {
      const res = await fetch(`/routes/${m.id}/export_gpx`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn(`skip ${m.id}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      const pts = [...text.matchAll(/<trkpt\s+lat="([-0-9.]+)"\s+lon="([-0-9.]+)"/g)].map(
        (x) => [parseFloat(x[2]), parseFloat(x[1])] // [lng, lat]
      );
      const step = Math.max(1, Math.ceil(pts.length / MAX_POINTS));
      const coords = pts.filter((_, idx) => idx % step === 0);
      if (coords.length && coords[coords.length - 1] !== pts[pts.length - 1]) {
        coords.push(pts[pts.length - 1]);
      }
      features.push({
        type: 'Feature',
        properties: {
          id: m.id,
          name: m.name,
          link: `https://www.strava.com/routes/${m.id}`,
          distance_km: m.distance_km,
          source: 'HV-signed',
          region: m.region,
          route_type: m.type,
          cafe: m.cafe ?? '',
          notes: m.notes ?? '',
        },
        geometry: { type: 'LineString', coordinates: coords },
      });
      console.log(`ok ${i + 1}/${meta.length}: ${m.name} (${coords.length} pts)`);
    } catch (e) {
      console.warn(`error ${m.id}:`, e);
    }
    if (i < meta.length - 1) await sleep(SLEEP_MS);
  }
  return { type: 'FeatureCollection', features };
}

// eslint-disable-next-line no-unused-expressions
importRoutes(META).then((fc) => {
  console.log('DONE — copy(JSON.stringify(fc)) then save as web/public/routes.geojson');
  window.__routesGeojson = fc;
});
