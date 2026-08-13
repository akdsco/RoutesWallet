# Build-time boundary data

Not shipped to the client — used only by the region normalisation script and the
Strava importer to resolve a route's start point to a county.

## `uk-ceremonial-counties.geojson`

Point-in-polygon boundaries for the **ceremonial counties of England**, used to
derive `country` + `region` from a route's start coordinate (TB-63).

- **Source:** [`evansd/uk-ceremonial-counties`](https://github.com/evansd/uk-ceremonial-counties),
  built from ONS Parliamentary Ward data for Great Britain (+ OSM for NI/RoI).
- **Provenance / licence:** contains ONS data © Crown copyright and database
  right, under the [Open Government Licence v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/);
  OSM-derived parts © OpenStreetMap contributors (ODbL). We use only the English
  ceremonial-county subset.
- **Local processing (deterministic):** filtered to the 47 English ceremonial
  counties present in `src/lib/region.ts`'s `UK_COUNTIES` (City of London is
  folded into Greater London in the source); the name property renamed
  `county` → `name`; the `area` property dropped; coordinates rounded to 5 dp
  (~1.1 m). This reduced the file from ~10.9 MB to ~0.4 MB.
- Coordinate order is `[lng, lat]` (GeoJSON standard).

`src/lib/boundaries.test.ts` guards that this file stays a valid polygon set whose
names are all members of `UK_COUNTIES`.

## `world-countries.geojson`

Point-in-polygon boundaries for every country, used to derive a route's
`country` from its geometry (majority vote), so overseas rides land in the right
country (e.g. Mallorca → Spain, Lake Como → Italy) without name guessing.

- **Source:** Natural Earth 1:50m Admin 0 – Countries
  ([nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)),
  **public domain**.
- **Local processing:** kept the `ADMIN` name as `name`, dropped all other
  properties, rounded coordinates to 3 dp (~110 m). ~3.1 MB → ~1.7 MB. 50m (not
  110m) so islands like Mallorca resolve.
- Coordinate order is `[lng, lat]`.

`src/lib/boundaries.test.ts` also checks this file resolves the known route
locations to the right country.
