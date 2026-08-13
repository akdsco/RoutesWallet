import type { FeatureCollection } from 'geojson';
import {
  resolveRegionByVotes,
  resolveCountryByVotes,
  sampleAlong,
  SAMPLE_COUNT,
  type PointLookup,
} from './region.ts';

/** Point-in-polygon lookups the normaliser votes with, one per grouping level. */
export type Lookups = { countyOf: PointLookup; countryOf: PointLookup };

/** A route whose derived region differs from its old (informal) label. */
export type Mismatch = {
  id: string;
  name: string;
  was: string | null;
  now: string | null;
};

export type NormaliseReport = {
  /** LineString features processed (non-lines are passed through, not counted). */
  total: number;
  byRegion: Record<string, number>;
  byCountry: Record<string, number>;
  mismatches: Mismatch[];
};

const asStr = (v: unknown): string | null =>
  typeof v === 'string' && v !== '' ? v : null;

/**
 * Rewrite each LineString feature's `country` + `region` by majority vote over
 * points sampled along its line — country from the world-country lookup, region
 * from the UK-county lookup (see `resolveRegionByVotes`/`resolveCountryByVotes`).
 * Pure and deterministic, so running it twice yields an identical file — a
 * re-runnable transform, not hand edits. Non-LineString features pass through.
 */
export function normaliseFeatures(
  fc: FeatureCollection,
  { countyOf, countryOf }: Lookups,
  count = SAMPLE_COUNT
): { fc: FeatureCollection; report: NormaliseReport } {
  const features: FeatureCollection['features'] = [];
  const report: NormaliseReport = {
    total: 0,
    byRegion: {},
    byCountry: {},
    mismatches: [],
  };

  for (const f of fc.features ?? []) {
    const coords =
      f?.geometry?.type === 'LineString' ? f.geometry.coordinates : undefined;
    if (!coords || coords.length < 2) {
      features.push(f);
      continue;
    }
    const props = { ...(f.properties ?? {}) } as Record<string, unknown>;
    const name = typeof props.name === 'string' ? props.name : '';
    const was = asStr(props.region);
    // Vote on region + country across points spread along the line, not the start.
    const pts = sampleAlong(coords, count).map(
      (c) => [Number(c[0]), Number(c[1])] as const
    );
    const region = resolveRegionByVotes(
      pts.map(([lng, lat]) => countyOf(lng, lat))
    );
    const country = resolveCountryByVotes(
      pts.map(([lng, lat]) => countryOf(lng, lat))
    );
    props.country = country;
    props.region = region;
    features.push({ ...f, properties: props });

    report.total += 1;
    const rk = region ?? '(null)';
    const ck = country ?? '(null)';
    report.byRegion[rk] = (report.byRegion[rk] ?? 0) + 1;
    report.byCountry[ck] = (report.byCountry[ck] ?? 0) + 1;
    if (was !== region) {
      report.mismatches.push({
        id: typeof props.id === 'string' ? props.id : '',
        name,
        was,
        now: region,
      });
    }
  }

  return { fc: { ...fc, features }, report };
}
