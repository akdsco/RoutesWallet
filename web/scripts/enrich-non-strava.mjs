/*
 * Non-Strava route enrichment (TB-64) — the 2 RideWithGPS + 1 Garmin routes that
 * TB-60's logged-in Strava re-fetch couldn't reach. Gives them the same shape as
 * the 122 Strava routes: elevation as the GeoJSON 3rd coordinate, an
 * `elevation_gain_m`, and owner where the source provides it.
 *
 * THE NON-STRAVA RULE (the ticket's "decide + document"):
 *   - elevation series  → straight from the source GPX <ele> tags (same as Strava)
 *   - elevation_gain_m  → COMPUTED from that series (hysteresis, 3 m — see
 *                         src/lib/elevation.ts). This is the documented exception
 *                         to TB-60's never-recompute rule, which only held because
 *                         Strava displayed its own figure; RWGPS/Garmin show none,
 *                         and hand-typing one would be the "hand-edited" data the
 *                         ticket forbids.
 *   - owner             → only when the GPX carries <author> (RWGPS/Garmin don't),
 *                         and owner_strava_id stays absent for non-Strava sources.
 *
 * This is thin glue: all the real logic is the pure, unit-tested src/lib fns
 * (parseTrackpoints, parseAuthor, elevationGainM, enrichFeatureFromGpx), imported
 * directly — Node 24 strips the TS types, so there is NO second copy of the
 * parsers to keep in sync (unlike the browser-console import-from-strava.js).
 *
 * RUN (from web/):  npm run enrich:non-strava
 * Public GPX is fetched + cached into scripts/non-strava-gpx/; authed exports
 * must be dropped there by hand (see that folder's README). Re-running with the
 * same inputs rewrites routes.geojson identically. Any route whose GPX is missing
 * is logged, never silently dropped.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enrichFeatureFromGpx } from '../src/lib/enrich.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = join(here, '..', 'public', 'routes.geojson');
const GPX_DIR = join(here, 'non-strava-gpx');

// One entry per non-Strava route. `fetchUrl` is set only where the source GPX is
// publicly downloadable; authed sources are supplied as local files.
const TARGETS = [
  {
    id: 'rwgps-50433954',
    fetchUrl: 'https://ridewithgps.com/routes/50433954.gpx?sub_format=track',
  },
  {
    // Private route — RWGPS returns 401; must be exported by the owner.
    id: 'rwgps-39193814',
    fetchUrl: 'https://ridewithgps.com/routes/39193814.gpx?sub_format=track',
  },
  {
    // Garmin course — GPX export needs a logged-in session; supply as a file.
    id: 'garmin-451746090',
  },
];

/** Read a route's GPX: prefer the cached/dropped file; else fetch+cache a public one. */
async function loadGpx({ id, fetchUrl }) {
  const file = join(GPX_DIR, `${id}.gpx`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  if (fetchUrl) {
    const res = await fetch(fetchUrl);
    if (res.ok) {
      const text = await res.text();
      mkdirSync(GPX_DIR, { recursive: true });
      writeFileSync(file, text); // cache so re-runs are deterministic + offline
      console.log(`  fetched ${fetchUrl} → ${id}.gpx`);
      return text;
    }
    console.warn(
      `  fetch ${fetchUrl} → HTTP ${res.status} (needs manual export)`
    );
  }
  return null;
}

async function main() {
  const fc = JSON.parse(readFileSync(ROUTES_PATH, 'utf8'));
  const indexById = new Map(fc.features.map((f, i) => [f.properties?.id, i]));

  let enriched = 0;
  const missing = [];
  for (const target of TARGETS) {
    const idx = indexById.get(target.id);
    if (idx === undefined) {
      console.warn(`! ${target.id}: not found in routes.geojson — skipping`);
      continue;
    }
    const gpx = await loadGpx(target);
    if (!gpx) {
      missing.push(target.id);
      console.warn(`! ${target.id}: no GPX available — leaving as-is`);
      continue;
    }
    const out = enrichFeatureFromGpx(fc.features[idx], gpx);
    fc.features[idx] = out;
    const p = out.properties;
    console.log(
      `✓ ${target.id}: ${out.geometry.coordinates.length} pts, ` +
        `${p.elevation_gain_m} m gain, owner ${p.owner_name ?? '—'}`
    );
    enriched++;
  }

  // Match the on-disk format exactly (minified, no trailing newline) so the 122
  // untouched features stay byte-identical and the diff is only the 3 routes.
  writeFileSync(ROUTES_PATH, JSON.stringify(fc));

  console.log(
    `\nEnriched ${enriched}/${TARGETS.length} non-Strava routes.` +
      (missing.length ? ` Missing GPX: ${missing.join(', ')}.` : '')
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
