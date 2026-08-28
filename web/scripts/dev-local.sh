#!/usr/bin/env bash
#
# Full-stack LOCAL dev for the member pool (TB-110): builds the app and runs
# `wrangler pages dev` — the real Functions (/connect/callback, /api/routes) +
# a local D1 + secrets from .dev.vars. This is the only local mode that runs the
# backend; for frontend-only work use `npm run dev` (Vite, hot-reload) instead.
#
# One command: `npm run dev:local` → http://localhost:8788
#
# Requires (both gitignored — see .dev.vars.example):
#   .dev.vars     STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET  (the Function's env)
#   .env.local    VITE_STRAVA_CLIENT_ID                    (the built frontend)
#
# D1 binding: `wrangler pages dev` and `wrangler d1 execute` must share one local
# database, which means a [[d1_databases]] block in wrangler.toml. The committed
# wrangler.toml has none (a placeholder id breaks the real Pages deploy), so if
# it's absent this script injects a LOCAL-ONLY block and strips it again on exit.
# Once you add the real production D1 id to wrangler.toml, the block is already
# there and this script leaves it untouched.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8788}"
WT="wrangler.toml"
MARK_START="# >>> dev-local D1 (auto-managed by scripts/dev-local.sh — DO NOT COMMIT)"
MARK_END="# <<< dev-local D1"

strip_block() {
  [ -f "$WT" ] && sed -i '' "/^${MARK_START}\$/,/^${MARK_END}\$/d" "$WT" 2>/dev/null || true
}

INJECTED=0
if grep -q '\[\[d1_databases\]\]' "$WT"; then
  echo "→ wrangler.toml already has a D1 binding — using it as-is."
else
  strip_block # self-heal: clear a block a prior hard-kill may have left
  cat >> "$WT" <<EOF
${MARK_START}
[[d1_databases]]
binding = "DB"
database_name = "routeswallet-local"
database_id = "00000000-0000-0000-0000-000000000000"
${MARK_END}
EOF
  INJECTED=1
  trap 'strip_block' EXIT INT TERM
  echo "→ injected a local-only D1 binding into wrangler.toml (stripped on exit)."
fi

for f in .dev.vars .env.local; do
  [ -f "$f" ] || echo "⚠️  $f missing — Connect Strava won't work locally (see .dev.vars.example)."
done

echo "→ building (bakes VITE_STRAVA_CLIENT_ID from .env.local)…"
npm run build >/dev/null

echo "→ ensuring local D1 schema…"
npx wrangler d1 execute DB --local --file=./migrations/0001_routes.sql --yes >/dev/null

COUNT=$(npx wrangler d1 execute DB --local --command "SELECT COUNT(*) AS n FROM routes;" --json 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d)[0].results[0].n)}catch{console.log(0)}})")
if [ "${COUNT:-0}" -eq 0 ]; then
  echo "→ seeding local D1 from routes.geojson…"
  npm run build:seed-sql >/dev/null
  mkdir -p .wrangler
  # A handful of full-geometry routes exceed SQLite's single-statement limit
  # locally (SQLITE_TOOBIG); skip those for local dev. See the seed-size ticket.
  awk 'NR==1 || length($0) < 90000' migrations/seed-routes.sql > .wrangler/dev-seed.sql
  npx wrangler d1 execute DB --local --file=.wrangler/dev-seed.sql --yes >/dev/null
  KEPT=$(($(wc -l < .wrangler/dev-seed.sql) - 1))
  rm -f .wrangler/dev-seed.sql
  echo "  seeded ${KEPT} routes (oversized ones skipped locally)."
else
  echo "→ local D1 already has ${COUNT} routes (skipping seed)."
fi

echo "→ starting wrangler pages dev on http://localhost:${PORT} (Ctrl-C to stop)"
npx wrangler pages dev dist --port "$PORT" --compatibility-date=2024-11-01
