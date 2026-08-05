# RoutesWallet

A trusted, searchable home for cycling routes → [routeswallet.app](https://routeswallet.app)

This repo is a **loose monorepo** — two independent apps that share a brand, not
code. There are deliberately **no workspaces**: each app has its own `package.json`
and `node_modules`.

## Layout

| Folder | What it is | Status |
|--------|-----------|--------|
| [`web/`](web/) | The current focus. A static web map of a club's routes with **"routes near a place"** search. Vite + React + TS + Leaflet + Turf. £0 to host. | Active |
| [`mobile/`](mobile/) | The original Expo / React Native app (Strava sync, tagging, encrypted SQLite). | Parked |

## Why this shape

The web map validates the one behaviour a club's members actually repeat — "has
anyone got a route near X?" — as a plain link, with no App Store, no backend, and
no $99 Apple fee. See [`docs/plans/`](docs/plans/) for the reasoning and
[`CLAUDE.md`](CLAUDE.md) for the scope guardrails.

## Working in each app

```bash
# web map (the thing shipping)
cd web && npm install && npm run dev

# parked RN app
cd mobile && npm install && npx expo start
```
