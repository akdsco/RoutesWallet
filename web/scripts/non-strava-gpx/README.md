# non-strava-gpx — GPX drop folder

Source GPX for the 3 non-Strava routes, consumed by
[`../enrich-non-strava.mjs`](../enrich-non-strava.mjs). The `.gpx` files here are
**git-ignored** — some are private routes and all are large; the committed output
is `public/routes.geojson`, not these inputs.

One file per route, named by its `id` in `routes.geojson`:

| file                   | route id           | how to get it                                                             |
| ---------------------- | ------------------ | ------------------------------------------------------------------------- |
| `rwgps-50433954.gpx`   | `rwgps-50433954`   | **public** — the script fetches + caches it automatically                 |
| `rwgps-39193814.gpx`   | `rwgps-39193814`   | **private (RWGPS 401)** — export it yourself (logged in) and drop it here |
| `garmin-451746090.gpx` | `garmin-451746090` | **auth** — Garmin Connect → course → Export GPX, drop it here             |

## Export steps

- **RideWithGPS** (private route): open the route while logged in → **Export** →
  **GPX Track** → save as `rwgps-<id>.gpx` here.
- **Garmin Connect**: open the course → gear/… menu → **Export GPX** → save as
  `garmin-<id>.gpx` here.

Then run:

```sh
npm run enrich:non-strava    # from web/
```

The script fetches the public RWGPS route, reads whatever else is present, and
enriches only the routes whose GPX it can find — any missing one is **logged**,
not silently skipped. Re-running with the same files produces an identical
`routes.geojson`.
