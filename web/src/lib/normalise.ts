import type { FeatureCollection } from 'geojson';
import {
  resolveRegionByVotes,
  sampleAlong,
  SAMPLE_COUNT,
  type CountyOf,
} from './region.ts';

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
 * Rewrite each LineString feature's `country` + `region` from its start point,
 * geometry-first (see `resolveCountryRegion`). Pure and deterministic, so running
 * it twice on the same input yields identical country/region — a re-runnable
 * transform, not hand edits. Non-LineString features pass through untouched.
 */
export function normaliseFeatures(
  fc: FeatureCollection,
  countyOf: CountyOf,
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
    // Vote on the county across points spread along the line, not just the start.
    const votes = sampleAlong(coords, count).map((c) =>
      countyOf(Number(c[0]), Number(c[1]))
    );
    const { country, region } = resolveRegionByVotes(votes, name);
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
