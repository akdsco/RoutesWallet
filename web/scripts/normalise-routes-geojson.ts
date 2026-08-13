/*
 * One-time, re-runnable normalisation of `public/routes.geojson` (TB-63).
 *
 * Rewrites each route's `country` + `region` by MAJORITY VOTE over points sampled
 * along its line (Turf point-in-polygon): region against the committed English
 * ceremonial-county boundaries (home-county away-rule — see region.ts), country
 * against the world-country boundaries. Overseas rides get their real country and
 * region null.
 *
 * Deterministic and idempotent — run it again after re-importing and the file is
 * unchanged. The transform core is `src/lib/normalise.ts` (unit-tested).
 *
 *   npm run normalise:routes            # rewrite the file + print a summary
 *   npm run normalise:routes -- --dry   # summary only, write nothing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { makePointLookup } from '../src/lib/county-lookup.ts';
import { normaliseFeatures } from '../src/lib/normalise.ts';

const COUNTIES = 'scripts/data/uk-ceremonial-counties.geojson';
const COUNTRIES = 'scripts/data/world-countries.geojson';
const ROUTES = 'public/routes.geojson';
const dry = process.argv.includes('--dry');

const readPolys = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as FeatureCollection<
    Polygon | MultiPolygon
  >;
const routes = JSON.parse(readFileSync(ROUTES, 'utf8')) as FeatureCollection;

const { fc, report } = normaliseFeatures(routes, {
  countyOf: makePointLookup(readPolys(COUNTIES)),
  countryOf: makePointLookup(readPolys(COUNTRIES)),
});

const sort = (rec: Record<string, number>) =>
  Object.entries(rec).sort((a, b) => b[1] - a[1]);

console.log(`\nNormalised ${report.total} routes.\n`);
console.log('By country:');
for (const [k, n] of sort(report.byCountry))
  console.log(`  ${n.toString().padStart(3)}  ${k}`);
console.log('\nBy region:');
for (const [k, n] of sort(report.byRegion))
  console.log(`  ${n.toString().padStart(3)}  ${k}`);
console.log(
  `\n${report.mismatches.length} label→geometry change(s) (old region ≠ derived):`
);
for (const m of report.mismatches) {
  console.log(`  ${m.was ?? '(null)'} → ${m.now ?? '(null)'}  ·  ${m.name}`);
}

if (dry) {
  console.log('\n--dry: no file written.');
} else {
  writeFileSync(ROUTES, JSON.stringify(fc));
  console.log(`\nWrote ${ROUTES}.`);
}
