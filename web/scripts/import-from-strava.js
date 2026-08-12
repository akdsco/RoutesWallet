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
 *
 * WHAT EACH ROUTE CARRIES
 * - geometry: [lng, lat, ele] — elevation is the standard GeoJSON 3rd coordinate,
 *   read straight from the GPX <ele> tags (whole metres). The profile chart is
 *   derived from this (distance-along vs the 3rd axis); we store no separate array.
 * - elevation_gain_m: Strava's OWN displayed total, read off the rendered route
 *   page (an iframe, since it is client-rendered — not in the GPX). We deliberately
 *   do NOT recompute gain locally; a different smoothing rule would disagree.
 * - owner_name / owner_strava_id: from the GPX <metadata><author> block.
 *
 * The parsing logic mirrors src/lib/gpx.ts (unit-tested); it is inlined here only
 * because a console paste cannot import ES modules. Keep the two in sync.
 */

// Fill from the Google Sheet: one entry per route.
const META = [
  // { id: '3079343783499010458', name: 'Girona - just Girona', distance_km: 34,
  //   region: 'Hub Velo trips', type: 'Road', cafe: '', notes: '' },
];

// QUALITY RULE: keep FULL resolution. Do NOT decimate to a fixed point cap —
// that cuts corners and makes routes look jumpy at zoom (a 150-pt cap gave ~669 m
// between vertices; full res is ~47 m). We only normalise coordinate precision to
// 6 decimals (~0.11 m, well below GPS accuracy). If a route ever needs thinning,
// use geometry-preserving Douglas–Peucker at a tight (<=2 m) tolerance, never
// every-Nth-point decimation.
const COORD_DP = 6; // decimal places; precision normalisation, not point-dropping
const SLEEP_MS = 2000; // be a good citizen between requests

// --- mirror of src/lib/gpx.ts (unit-tested there) ---
const roundDp = (n, dp) => Number(n.toFixed(dp));

function parseTrackpoints(gpx) {
  const out = [];
  const re =
    /<trkpt\s+lat="([-0-9.]+)"\s+lon="([-0-9.]+)"\s*\/?>([\s\S]*?)(?=<trkpt|<\/trkseg|<\/trk>|$)/g;
  for (const m of gpx.matchAll(re)) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const pos = [roundDp(lng, COORD_DP), roundDp(lat, COORD_DP)];
    const ele = (m[3] || '').match(/<ele>([-0-9.]+)<\/ele>/);
    if (ele && ele[1]) pos.push(Math.round(parseFloat(ele[1])));
    out.push(pos);
  }
  return out;
}

function parseAuthor(gpx) {
  const block = (gpx.match(/<author>([\s\S]*?)<\/author>/) || [])[1];
  if (!block) return null;
  const name = (block.match(/<name>([^<]*)<\/name>/) || [])[1];
  if (!name) return null;
  const sid = (block.match(/\/athletes\/(\d+)/) || [])[1] || '';
  // strip Strava's enclosed-alphanumeric "verified" badge glyph, collapse spaces
  const clean = [...name.trim()]
    .filter((c) => !(c.codePointAt(0) >= 0x2460 && c.codePointAt(0) <= 0x24ff))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: clean, stravaId: sid };
}

function parseStatMeters(s) {
  const m = s.trim().match(/^([\d,]+(?:\.\d+)?)\s*m$/);
  if (!m || !m[1]) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, '')));
}

// Strava's total-elevation figure is client-rendered, not in the GPX. Load the
// route page in a same-origin iframe and read the summary stat (the smallest
// block holding a km distance, an "N m" elevation, and a H:MM:SS time).
async function readPageElevation(id) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const kmRe = /^\d[\d,.]*\s*km$/;
  const mRe = /^\d[\d,.]*\s*m$/;
  const timeRe = /^\d+:\d{2}(:\d{2})?$/;
  const readElev = (doc) => {
    const leaf = (el) =>
      [...el.querySelectorAll('*')]
        .filter((x) => x.children.length === 0)
        .map((x) => x.textContent.trim());
    let best = null;
    for (const el of doc.querySelectorAll('div,section,ul,header')) {
      const t = leaf(el);
      if (
        t.some((x) => kmRe.test(x)) &&
        t.some((x) => mRe.test(x)) &&
        t.some((x) => timeRe.test(x))
      ) {
        if (!best || t.length < best.count) {
          best = { count: t.length, elev: t.find((x) => mRe.test(x)) };
        }
      }
    }
    return best ? parseStatMeters(best.elev) : null;
  };
  const f = document.createElement('iframe');
  f.style.cssText =
    'width:1200px;height:900px;position:fixed;left:-9999px;top:-9999px';
  f.src = `/routes/${id}`;
  document.body.appendChild(f);
  try {
    await new Promise((ok, bad) => {
      f.onload = ok;
      f.onerror = () => bad('onerror');
      setTimeout(() => bad('timeout'), 25000);
    });
    for (let i = 0; i < 50; i++) {
      const doc = f.contentDocument;
      if (doc) {
        const e = readElev(doc);
        if (e != null) return e;
      }
      await sleep(400);
    }
    return null;
  } finally {
    f.remove();
  }
}

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
      const coords = parseTrackpoints(text);
      const author = parseAuthor(text);
      const elevation_gain_m = await readPageElevation(m.id);
      features.push({
        type: 'Feature',
        properties: {
          id: m.id,
          name: m.name,
          link: `https://www.strava.com/routes/${m.id}`,
          distance_km: m.distance_km,
          source: 'club-verified',
          region: m.region,
          route_type: m.type,
          cafe: m.cafe ?? '',
          notes: m.notes ?? '',
          elevation_gain_m,
          owner_name: author ? author.name : '',
          owner_strava_id: author ? author.stravaId : '',
        },
        geometry: { type: 'LineString', coordinates: coords },
      });
      console.log(
        `ok ${i + 1}/${meta.length}: ${m.name} (${coords.length} pts, ${elevation_gain_m ?? '?'} m)`
      );
    } catch (e) {
      console.warn(`error ${m.id}:`, e);
    }
    if (i < meta.length - 1) await sleep(SLEEP_MS);
  }
  return { type: 'FeatureCollection', features };
}

// eslint-disable-next-line no-unused-expressions
importRoutes(META).then((fc) => {
  console.log(
    'DONE — copy(JSON.stringify(fc)) then save as web/public/routes.geojson'
  );
  window.__routesGeojson = fc;
});
