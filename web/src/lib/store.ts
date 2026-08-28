import type { Feature, FeatureCollection, LineString } from 'geojson';

/**
 * The shared route pool store, backed by one Cloudflare D1 table:
 *
 *   routes(id_str TEXT PRIMARY KEY, owner_strava_id TEXT, feature TEXT NOT NULL)
 *
 * A row is one route stored as its whole `routes.geojson` Feature (JSON in
 * `feature`). Keying on the stable Strava `id_str` makes writes idempotent — a
 * member re-connecting upserts their routes instead of duplicating them.
 *
 * Only the minimal D1 surface we use is typed here (`D1Like`), so this logic is
 * pure and unit-testable against a fake; the real `D1Database` satisfies it
 * structurally, no cast needed.
 */
export interface D1PreparedLike {
  bind(...values: unknown[]): D1PreparedLike;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
export interface D1Like {
  prepare(query: string): D1PreparedLike;
}

export type StoredFeature = Feature<
  LineString,
  Record<string, unknown> & { id: string }
>;

const UPSERT =
  'INSERT INTO routes (id_str, owner_strava_id, feature) VALUES (?, ?, ?) ' +
  'ON CONFLICT(id_str) DO UPDATE SET ' +
  'owner_strava_id = excluded.owner_strava_id, feature = excluded.feature';

/** Read the whole pool back as a FeatureCollection for `/api/routes`. */
export async function readAllFeatures(db: D1Like): Promise<FeatureCollection> {
  const { results } = await db
    .prepare('SELECT feature FROM routes')
    .all<{ feature: string }>();
  const features: FeatureCollection['features'] = [];
  for (const row of results) {
    try {
      features.push(JSON.parse(row.feature) as StoredFeature);
    } catch (err) {
      // silent-ok: a single corrupt row must not blank the whole map for every
      // visitor. Logged (observable), and the read continues with the good rows.
      console.error('routes store: skipping unparseable feature row', err);
    }
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Upsert member features, keyed on `id_str`. Returns how many were written.
 * A feature with no usable string id can't be keyed, so it's skipped (counted by
 * the shortfall vs input length) rather than written as a junk row.
 */
export async function upsertFeatures(
  db: D1Like,
  features: readonly StoredFeature[]
): Promise<number> {
  let written = 0;
  for (const f of features) {
    const id = f.properties?.id;
    if (typeof id !== 'string' || id === '') continue;
    const owner =
      typeof f.properties?.owner_strava_id === 'string'
        ? f.properties.owner_strava_id
        : null;
    await db.prepare(UPSERT).bind(id, owner, JSON.stringify(f)).run();
    written += 1;
  }
  return written;
}

/** Double single quotes so a value is safe inside a SQL string literal. */
function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Build the seed SQL that loads the baked-in club routes into D1 at deploy time
 * (`wrangler d1 execute DB --file=…`). `INSERT OR REPLACE` so re-seeding is
 * idempotent. Only our own controlled `routes.geojson` is ever fed in, and every
 * value is quote-escaped — no user input reaches this path.
 */
export function buildSeedSql(features: readonly StoredFeature[]): string {
  const lines: string[] = [];
  for (const f of features) {
    const id = f.properties?.id;
    if (typeof id !== 'string' || id === '') continue;
    const owner =
      typeof f.properties?.owner_strava_id === 'string'
        ? f.properties.owner_strava_id
        : null;
    lines.push(
      `INSERT OR REPLACE INTO routes (id_str, owner_strava_id, feature) VALUES (${q(id)}, ${owner === null ? 'NULL' : q(owner)}, ${q(JSON.stringify(f))});`
    );
  }
  return lines.join('\n') + '\n';
}
