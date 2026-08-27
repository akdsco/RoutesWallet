/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Free CARTO Basemaps API key (https://carto.com/basemaps/apikey) used to
   * authenticate the Standard raster tiles so they render unwatermarked. Set in
   * Cloudflare Pages env for prod and .env.local for dev; never committed.
   * Optional — a missing key degrades to keyless CyclOSM tiles (see basemaps.ts).
   */
  readonly VITE_CARTO_BASEMAP_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
