/**
 * Basemap (tile layer) options for the map, and how each resolves to a concrete
 * tile config for the current theme.
 *
 * The basemap choice is orthogonal to light/dark theme:
 *   - `standard` is theme-aware — CARTO Voyager in light, Dark Matter in dark.
 *   - `cyclosm` is a cycling-specific style (terrain + cycle routes) with no
 *     official dark variant, so it serves the same (light) tiles in both themes.
 *     Standard stays the default: CyclOSM reads as too busy as an everyday base.
 *
 * Pure config + resolver so it can be unit-tested and kept out of the map
 * component. RouteMap builds the Leaflet tile layer from `tileConfig`.
 */
export type Theme = 'light' | 'dark';

export type BasemapId = 'standard' | 'cyclosm';

export type TileConfig = {
  url: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
};

type BasemapDef = {
  id: BasemapId;
  label: string;
  /** One-line description shown in the switcher popover. */
  description: string;
  /** Tile URL per theme; a light-only basemap uses the same URL for both. */
  urls: Record<Theme, string>;
  /** Full HTML attribution handed to Leaflet's control (the legal bottom bar). */
  attribution: string;
  /** Short plain-text credit shown per option in the popover. */
  credit: string;
  subdomains: string;
  maxZoom: number;
};

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// CyclOSM is community-hosted by OpenStreetMap France; keep attribution intact.
const CYCLOSM_ATTRIBUTION =
  '<a href="https://www.cyclosm.org">CyclOSM</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CYCLOSM_URL =
  'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png';

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    description:
      'Clean and general-purpose. Follows your light / dark setting.',
    urls: {
      // Voyager has landcover (parks/woods) baked in; Dark Matter is its dark peer.
      light:
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    },
    attribution: CARTO_ATTRIBUTION,
    credit: '© CARTO · © OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  cyclosm: {
    id: 'cyclosm',
    label: 'CyclOSM',
    description:
      'Terrain shading and the OSM cycle network. Busy, but detailed.',
    urls: { light: CYCLOSM_URL, dark: CYCLOSM_URL },
    attribution: CYCLOSM_ATTRIBUTION,
    credit: '© CyclOSM · © OpenStreetMap',
    subdomains: 'abc',
    maxZoom: 20,
  },
};

/**
 * Shown only when CyclOSM is active in the dark theme: it has no dark tile
 * build, so the map stays light under the dark interface. A deliberate,
 * user-chosen mismatch — the note stops it reading as a bug.
 */
export const DARK_CAVEAT =
  'CyclOSM has no dark build, so the map stays light while the rest of the interface is dark.';

/** Display + cycle order; the first entry is the default. */
export const BASEMAP_ORDER: readonly BasemapId[] = ['standard', 'cyclosm'];

export const DEFAULT_BASEMAP: BasemapId = 'standard';

/**
 * Resolve a basemap + theme to a concrete tile config, given the CARTO API key
 * (from `import.meta.env.VITE_CARTO_BASEMAP_KEY`, passed in at the RouteMap
 * boundary so this stays a pure, testable resolver).
 *
 * CARTO now requires a free API key for its raster basemaps; keyless requests
 * are watermarked "API KEY REQUIRED". So the Standard (CARTO) tiles are
 * authenticated with the key when it is set. When it is NOT set, a keyless CARTO
 * request would ship that watermark to visitors — so we fall back to the keyless
 * CyclOSM tiles for the Standard slot and warn loudly, making the missing key
 * observable in logs rather than defacing the map. CyclOSM is already keyless and
 * ignores the key entirely.
 */
export function tileConfig(
  id: BasemapId,
  theme: Theme,
  apiKey?: string
): TileConfig {
  if (id === 'standard') {
    if (apiKey) {
      const def = BASEMAPS.standard;
      return {
        // CARTO authenticates raster tiles with `?key=` (NOT `?api_key=`, which
        // it silently ignores → still watermarked). Query string, not a Leaflet
        // {…} placeholder, so tile-coordinate substitution ({s}/{z}/{x}/{y}/{r})
        // is untouched.
        url: `${def.urls[theme]}?key=${apiKey}`,
        attribution: def.attribution,
        subdomains: def.subdomains,
        maxZoom: def.maxZoom,
      };
    }
    // No key configured — degrade to keyless CyclOSM tiles so no watermark can
    // appear, and surface the misconfiguration (observable, not a silent
    // swallow). Prod sets the key via Cloudflare env; dev via .env.local.
    console.warn(
      'VITE_CARTO_BASEMAP_KEY is not set — the Standard basemap needs a free CARTO ' +
        'key (https://carto.com/basemaps/apikey). Falling back to keyless CyclOSM ' +
        'tiles to avoid the "API KEY REQUIRED" watermark.'
    );
    const fb = BASEMAPS.cyclosm;
    return {
      url: fb.urls[theme],
      attribution: fb.attribution,
      subdomains: fb.subdomains,
      maxZoom: fb.maxZoom,
    };
  }
  const def = BASEMAPS[id];
  return {
    url: def.urls[theme],
    attribution: def.attribution,
    subdomains: def.subdomains,
    maxZoom: def.maxZoom,
  };
}

/** Guard a persisted/untrusted value before trusting it as a BasemapId. */
export function isBasemapId(v: unknown): v is BasemapId {
  return v === 'standard' || v === 'cyclosm';
}

/** Whether the dark-theme caveat applies to this basemap + theme pairing. */
export function showsDarkCaveat(id: BasemapId, theme: Theme): boolean {
  return theme === 'dark' && id === 'cyclosm';
}

/** Next basemap in the ordered list, wrapping — for arrow-key navigation. */
export function cycleBasemap(current: BasemapId, dir: 1 | -1): BasemapId {
  const i = BASEMAP_ORDER.indexOf(current);
  const n = BASEMAP_ORDER.length;
  return BASEMAP_ORDER[(i + dir + n) % n]!;
}
