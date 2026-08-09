/*
 * Offline map-match pipeline (TB-46).
 *
 * Snaps the club's ROAD routes onto the road network so their lines sit
 * pixel-perfect on the map. Runs OFFLINE at import time against the public
 * FOSSGIS Valhalla instance (`trace_route`, bicycle profile) — the app itself
 * stays static and keyless. Gravel / off-road routes are never touched, and any
 * segment that fails the quality gate falls back to the raw geometry.
 *
 * Valhalla `map_snap` truncates a whole route at the first unroutable spot, so
 * each route is matched in CHUNKS (see chunkTrace/stitchChunks): a bad spot only
 * costs its own chunk, which falls back to raw while the rest stays snapped.
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
  assembleMatchedCoords,
  dedupeAndNormalize,
  chunkTrace,
  stitchChunks,
  acceptMatch,
} from '../src/lib/mapMatch';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../public');
const ROUTES = resolve(PUBLIC, 'routes.geojson');
const RAW = resolve(PUBLIC, 'routes.raw.geojson');
const REPORT = resolve(HERE, 'map-match-report.json');

const VALHALLA = 'https://valhalla1.openstreetmap.de/trace_route';
const SLEEP_MS = 1300; // ~1 req/s, FOSSGIS fair use
const REQUEST_TIMEOUT_MS = 60_000;
const CHUNK_SIZE = 300; // points per chunk
const MIN_CHUNK_COVERAGE = 0.95; // a chunk must match nearly end-to-end
const MIN_MATCHED_FRACTION = 0.6; // else keep the whole route raw
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
  | {
      status: 'matched';
      mode: 'single' | 'chunked';
      detail: string;
      ptsBefore: number;
      ptsAfter: number;
    }
  | { status: 'fallback'; reason: string }
  | { status: 'excluded'; reason: 'gravel' | 'named-offroad' | 'untyped' };

type ReportRow = { id: string; name: string } & Disposition;

/** Reason a route is excluded from matching (never a road route). */
function excludeReason(p: Props): 'gravel' | 'named-offroad' | 'untyped' {
  if (p.route_type === 'Gravel') return 'gravel';
  if (GRAVEL_NAME_EXCLUSIONS.includes(p.name)) return 'named-offroad';
  return 'untyped';
}

type TraceResponse = {
  trip?: {
    status?: number;
    summary?: { length?: number };
    locations?: { original_index?: number }[];
    legs?: { shape?: string }[];
  };
};

async function callValhalla(coords: number[][]): Promise<TraceResponse> {
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
    return (await res.json()) as TraceResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Call Valhalla (one retry on a transient failure), then pause for fair use. */
async function trace(coords: number[][]): Promise<TraceResponse | null> {
  let out: TraceResponse | null = null;
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

/** Coverage of a single trace response: fraction of input points matched. */
function coverageOf(resp: TraceResponse, inputPts: number): number {
  const idx = Math.max(
    ...(resp.trip?.locations ?? []).map((l) => l.original_index ?? 0)
  );
  return (idx + 1) / inputPts;
}

type MatchResult = { row: Disposition; coords?: [number, number][] };

/** Match one eligible route. Returns its disposition and, on success, new coords. */
async function matchRoute(
  coords: [number, number][],
  rawKm: number
): Promise<MatchResult> {
  // Short routes fit in one request — use the strict single-shot gate.
  if (coords.length <= CHUNK_SIZE) {
    const resp = await trace(coords);
    if (!resp?.trip || resp.trip.status !== 0 || !resp.trip.legs?.length) {
      return { row: { status: 'fallback', reason: 'no route' } };
    }
    const coveredFraction = coverageOf(resp, coords.length);
    const matchedKm = resp.trip.summary?.length ?? 0;
    const gate = acceptMatch({ rawKm, matchedKm, coveredFraction });
    if (!gate.ok)
      return { row: { status: 'fallback', reason: gate.reason ?? 'gate' } };
    const line = assembleMatchedCoords(
      resp.trip.legs.map((l) => l.shape ?? '')
    );
    if (line.length < 2)
      return { row: { status: 'fallback', reason: 'empty shape' } };
    return {
      row: {
        status: 'matched',
        mode: 'single',
        detail: `${(coveredFraction * 100).toFixed(0)}% cover`,
        ptsBefore: coords.length,
        ptsAfter: line.length,
      },
      coords: line,
    };
  }

  // Long routes: match chunk-by-chunk, fall back per-chunk, then stitch.
  const chunks = chunkTrace(coords, CHUNK_SIZE);
  const lines: [number, number][][] = [];
  let matchedChunks = 0;
  for (const chunk of chunks) {
    const resp = await trace(chunk);
    const legs = resp?.trip?.status === 0 ? resp.trip.legs : undefined;
    if (legs?.length && coverageOf(resp!, chunk.length) >= MIN_CHUNK_COVERAGE) {
      const line = assembleMatchedCoords(legs.map((l) => l.shape ?? ''));
      if (line.length >= 2) {
        lines.push(line);
        matchedChunks++;
        continue;
      }
    }
    lines.push(dedupeAndNormalize([chunk])); // raw fallback for this chunk
  }

  const matchedFraction = matchedChunks / chunks.length;
  if (matchedFraction < MIN_MATCHED_FRACTION) {
    return {
      row: {
        status: 'fallback',
        reason: `only ${matchedChunks}/${chunks.length} chunks matched`,
      },
    };
  }
  const stitched = stitchChunks(lines);
  return {
    row: {
      status: 'matched',
      mode: 'chunked',
      detail: `${matchedChunks}/${chunks.length} chunks`,
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

    const { row, coords } = await matchRoute(
      rawF.geometry.coordinates,
      p.distance_km
    );
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
