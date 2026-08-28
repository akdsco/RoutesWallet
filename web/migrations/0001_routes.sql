-- TB-110: the shared member route pool. One dumb table — one row per route, the
-- whole routes.geojson Feature stored as JSON in `feature`. Keyed on the stable
-- Strava route id so writes are idempotent (a member re-connecting upserts).
CREATE TABLE IF NOT EXISTS routes (
  id_str          TEXT PRIMARY KEY,
  owner_strava_id TEXT,
  feature         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Filter/attribution lookups by contributor.
CREATE INDEX IF NOT EXISTS idx_routes_owner ON routes (owner_strava_id);
