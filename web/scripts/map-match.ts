/*
 * Offline map-match pipeline (TB-46).
 *
 * Snaps the club's ROAD routes onto the road network so their lines sit
 * pixel-perfect on the map. Runs OFFLINE at import time against the public
 * FOSSGIS Valhalla instance (`trace_attributes`, bicycle profile, map_snap) —
 * the app itself stays static and keyless. Gravel / off-road routes are never
 * touched, and any segment that fails the quality gate falls back to raw.
 *
 * WHY trace_attributes + margin chunks:
 *  - map_snap truncates a whole route at the first unroutable spot, so we chunk.
 *  - matching a bare chunk lets the matcher invent a detour near the chunk's
 *    edge (it lacks context there). So each chunk carries an overlap MARGIN of
 *    context points on both sides, and we keep only its CORE after matching
 *    (chunkWithMargins + coreFromMatch). trace_attributes returns matched_points
 *    (one per input point), which is what lets us trim to the core exactly.
 *  - a gross-detour backstop (maxStrayMeters) reverts any route whose snapped
 *    line still wanders too far from the drawn line.
 *
 * RUN (from web/):
 *   npx vite-node scripts/map-match.ts            # fresh run, all eligible routes
 *   npx vite-node scripts/map-match.ts --resume   # continue after an interruption
 *   npx vite-node scripts/map-match.ts --limit=5  # first 5 eligible (a probe)
 *
 * INPUT/OUTPUT:
 *   public/routes.raw.geojson       pristine snapshot (created once; the matching
 *                                   INPUT on every run — never re-matched)
 *   public/routes.geojson           matched output (served by the app)
 *   scripts/map-match-report.json   per-route disposition (also drives --resume)
 *
 * Progress is checkpointed every few routes so a long run survives interruption.
 * Be a good citizen: ~1 request/second, single retry on a transient failure.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import {
  isEligibleForMatch,
  GRAVEL_NAME_EXCLUSIONS,
  decodePolyline6,
  dedupeAndNormalize,
  chunkWithMargins,
  coreFromMatch,
  stitchChunks,
  maxStrayMeters,
} from '../src/lib/mapMatch';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../public');
const ROUTES = resolve(PUBLIC, 'routes.geojson');
const RAW = resolve(PUBLIC, 'routes.raw.geojson');
const REPORT = resolve(HERE, 'map-match-report.json');

const VALHALLA = 'https://valhalla1.openstreetmap.de/trace_attributes';
const SLEEP_MS = 1300; // ~1 req/s, FOSSGIS fair use
const REQUEST_TIMEOUT_MS = 60_000;
const CORE = 300; // core points kept per chunk
const MARGIN = 80; // context points added each side for matching
const MIN_CONFIDENCE = 0.5; // per-chunk map-match confidence floor
const MIN_MATCHED_FRACTION = 0.6; // else keep the whole route raw
// Stray gate. The point-to-point metric over-reads by ~half the raw spacing
// (~24 m), so a clean "few metres onto the road" nudge reads ~44-49 m while a
// mis-snap onto a neighbouring road reads ~74 m+. 60 m sits in that gap: keep the
// small on-road nudges (the ticket's actual goal), revert every big mover — a
// mis-snap OR a large correction — to the vetted raw line. See TB-46 notes.
const MAX_STRAY_M = 60;
const CHECKPOINT_EVERY = 3; // routes between checkpoint writes

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

type Props = {
  id: string;
  name: string;
  distance_km: number;
  route_type?: string;
  [k: string]: unknown;
};
type RouteFeature = Feature<LineString, Props>;
type RouteFC = FeatureCollection<LineString, Props>;

type Disposition =
  | { status: 'matched'; detail: string; ptsBefore: number; ptsAfter: number }
  | { status: 'fallback'; reason: string }
  | { status: 'excluded'; reason: 'gravel' | 'named-offroad' | 'untyped' };

type ReportRow = { id: string; name: string } & Disposition;

/** Reason a route is excluded from matching (never a road route). */
function excludeReason(p: Props): 'gravel' | 'named-offroad' | 'untyped' {
  if (p.route_type === 'Gravel') return 'gravel';
  if (GRAVEL_NAME_EXCLUSIONS.includes(p.name)) return 'named-offroad';
  return 'untyped';
}

type AttrResponse = {
  shape?: string;
  confidence_score?: number;
  matched_points?: { lat?: number; lon?: number; type?: string }[];
};

async function callValhalla(coords: number[][]): Promise<AttrResponse> {
  const body = JSON.stringify({
    shape: coords.map(([lng, lat]) => ({ lat, lon: lng })),
    costing: 'bicycle',
    shape_match: 'map_snap',
  });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(VALHALLA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as AttrResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Call Valhalla (one retry on a transient failure), then pause for fair use. */
async function trace(coords: number[][]): Promise<AttrResponse | null> {
  let out: AttrResponse | null = null;
  try {
    out = await callValhalla(coords);
  } catch {
    await sleep(3000);
    try {
      out = await callValhalla(coords);
    } catch {
      out = null;
    }
  }
  await sleep(SLEEP_MS);
  return out;
}

type MatchResult = { row: Disposition; coords?: [number, number][] };

/** Match one eligible route chunk-by-chunk with context margins, then stitch. */
async function matchRoute(coords: [number, number][]): Promise<MatchResult> {
  const chunks = chunkWithMargins(coords, CORE, MARGIN);
  const lines: [number, number][][] = [];
  let matchedCores = 0;

  for (const chunk of chunks) {
    const rawCore = dedupeAndNormalize([
      chunk.input.slice(chunk.coreStart, chunk.coreEnd + 1),
    ]);
    const resp = await trace(chunk.input);
    if (
      !resp?.shape ||
      !resp.matched_points ||
      (resp.confidence_score ?? 0) < MIN_CONFIDENCE
    ) {
      lines.push(rawCore); // this core stays as drawn
      continue;
    }
    const shape = decodePolyline6(resp.shape);
    const matched = resp.matched_points.map((m): [number, number] | null =>
      m &&
      m.type !== 'unmatched' &&
      typeof m.lon === 'number' &&
      typeof m.lat === 'number'
        ? [m.lon, m.lat]
        : null
    );
    const core = coreFromMatch(shape, matched, chunk.coreStart, chunk.coreEnd);
    if (core.length < 2) {
      lines.push(rawCore);
      continue;
    }
    lines.push(core);
    matchedCores++;
  }

  if (matchedCores / chunks.length < MIN_MATCHED_FRACTION) {
    return {
      row: {
        status: 'fallback',
        reason: `only ${matchedCores}/${chunks.length} cores matched`,
      },
    };
  }
  const stitched = stitchChunks(lines);
  if (stitched.length < 2)
    return { row: { status: 'fallback', reason: 'empty matched shape' } };

  const stray = Math.round(maxStrayMeters(stitched, coords));
  if (stray > MAX_STRAY_M) {
    return {
      row: { status: 'fallback', reason: `strays ${stray}m from drawn line` },
    };
  }
  return {
    row: {
      status: 'matched',
      detail: `${matchedCores}/${chunks.length} cores, ≤${stray}m off`,
      ptsBefore: coords.length,
      ptsAfter: stitched.length,
    },
    coords: stitched,
  };
}

function parseArgs(argv: string[]): { limit?: number; resume: boolean } {
  let limit: number | undefined;
  let resume = false;
  for (const a of argv) {
    const m = /^--limit=(\d+)$/.exec(a);
    if (m) limit = Number(m[1]);
    if (a === '--resume') resume = true;
  }
  return { limit, resume };
}

function writeOutputs(fc: RouteFC, report: ReportRow[]): void {
  writeFileSync(ROUTES, JSON.stringify(fc) + '\n');
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
}

async function main(): Promise<void> {
  const { limit, resume } = parseArgs(process.argv.slice(2));

  // Capture the pristine geometry once; always match FROM the raw file.
  if (!existsSync(RAW)) {
    copyFileSync(ROUTES, RAW);
    console.log('created public/routes.raw.geojson (pristine snapshot)');
  }
  const rawFC = JSON.parse(readFileSync(RAW, 'utf8')) as RouteFC;

  // Resume reuses the prior output + report; a fresh run starts from raw.
  const canResume = resume && existsSync(ROUTES) && existsSync(REPORT);
  const outFC: RouteFC = canResume
    ? (JSON.parse(readFileSync(ROUTES, 'utf8')) as RouteFC)
    : structuredClone(rawFC);
  const done = new Map<string, ReportRow>();
  if (canResume) {
    for (const r of JSON.parse(readFileSync(REPORT, 'utf8')) as ReportRow[])
      done.set(r.id, r);
    console.log(`resuming — ${done.size} routes already done`);
  }

  const report: ReportRow[] = [];
  let processed = 0;
  let matchedN = 0;

  for (let i = 0; i < rawFC.features.length; i++) {
    const rawF = rawFC.features[i] as RouteFeature;
    const outF = outFC.features[i] as RouteFeature;
    const p = rawF.properties;

    const prior = done.get(p.id);
    if (prior) {
      report.push(prior);
      if (prior.status === 'matched') matchedN++;
      continue;
    }

    if (!isEligibleForMatch(p)) {
      report.push({
        id: p.id,
        name: p.name,
        status: 'excluded',
        reason: excludeReason(p),
      });
      continue;
    }

    if (limit !== undefined && processed >= limit) {
      report.push({
        id: p.id,
        name: p.name,
        status: 'fallback',
        reason: 'skipped (--limit)',
      });
      continue;
    }

    const { row, coords } = await matchRoute(rawF.geometry.coordinates);
    if (coords) outF.geometry.coordinates = coords;
    report.push({ id: p.id, name: p.name, ...row });
    if (row.status === 'matched') matchedN++;
    processed++;

    const tag =
      row.status === 'matched' ? `✓ ${row.detail}` : `↩ raw (${row.reason})`;
    console.log(`${processed}: ${p.name} — ${tag}`);

    if (processed % CHECKPOINT_EVERY === 0) writeOutputs(outFC, report);
  }

  writeOutputs(outFC, report);

  const excluded = report.filter((r) => r.status === 'excluded').length;
  const fallback = report.filter((r) => r.status === 'fallback').length;
  console.log(
    `\nDONE — matched ${matchedN}, fell back ${fallback}, excluded ${excluded} of ${report.length} routes.`
  );
  console.log('Wrote public/routes.geojson + scripts/map-match-report.json.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
