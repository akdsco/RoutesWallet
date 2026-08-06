import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, FeatureCollection } from 'geojson';
import type { Route } from '../types.ts';
import {
  buildHeatIndex,
  heatStyle,
  cellSizeForZoom,
  FLAT_HEAT,
  type HeatSegment,
} from '../lib/heat.ts';
import { isDashed } from '../lib/source.ts';

type Props = {
  routes: Route[];
  /** null = idle (not searching). A set (possibly empty) = search is active. */
  matchedIds: Set<string> | null;
  selectedId: string | null;
  hoverId: string | null;
  /** [lng, lat] of the search place, or null. */
  searchPoint: [number, number] | null;
  radiusKm: number;
  theme: 'light' | 'dark';
  /** Which POI types (cafe/toilet/water/station) are toggled on. */
  poiTypes: ReadonlySet<string>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

const POI_ICON: Record<string, string> = {
  cafe: '☕',
  toilet: '🚻',
  water: '💧',
  station: '🚉',
};

const TILES = {
  // Voyager has landcover (parks/woods) baked in — the scalable way to show
  // greenspace everywhere without a custom dataset. No dark variant yet; dark
  // theme is dropped for the prototype (future: a basemap toggle incl. CyclOSM).
  light:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Resolve a CSS token to a concrete colour (canvas can't read var()). */
function token(name: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    '#000000'
  );
}

/** GeoJSON [lng, lat] pairs -> Leaflet [lat, lng]. */
function toLatLngs(coords: number[][]): [number, number][] {
  return coords.map((p) => [p[1] ?? 0, p[0] ?? 0]);
}

/** Walk every [x, y] position in an arbitrarily-nested coordinate array. */
function eachCoord(coords: unknown, cb: (x: number, y: number) => void): void {
  if (!Array.isArray(coords)) return;
  const arr: unknown[] = coords;
  const x = arr[0];
  const y = arr[1];
  if (typeof x === 'number' && typeof y === 'number') {
    cb(x, y);
    return;
  }
  for (const c of arr) eachCoord(c, cb);
}

/** Bounds-centre of a polygon feature, as Leaflet [lat, lng] — for label placement. */
function featureCenter(f: Feature): [number, number] {
  const g = f.geometry;
  if (g.type === 'GeometryCollection') return [0, 0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  eachCoord(g.coordinates, (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return [(minY + maxY) / 2, (minX + maxX) / 2];
}

type Panes = {
  greenspace: L.LayerGroup;
  greenLabels: L.LayerGroup;
  heat: L.LayerGroup;
  matched: L.LayerGroup;
  active: L.LayerGroup;
  marker: L.LayerGroup;
  hit: L.LayerGroup;
  pois: L.LayerGroup;
};

export function RouteMap({
  routes,
  matchedIds,
  selectedId,
  hoverId,
  searchPoint,
  radiusKm,
  theme,
  poiTypes,
  onHover,
  onSelect,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const heatCanvasRef = useRef<L.Canvas | null>(null);
  const panesRef = useRef<Panes | null>(null);
  const [greenspace, setGreenspace] = useState<FeatureCollection | null>(null);
  const [pois, setPois] = useState<FeatureCollection | null>(null);
  const heatCacheRef = useRef<{
    routes: Route[];
    cell: number;
    segs: HeatSegment[];
  } | null>(null);
  const didInitialFit = useRef(false);
  const [zoom, setZoom] = useState(6);
  const [viewTick, setViewTick] = useState(0);

  // Initialise the map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false }).setView(
      [51.5072, -0.1276],
      6
    );
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    tileRef.current = L.tileLayer(TILES[theme], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    const order: [keyof Panes, number][] = [
      ['greenspace', 350],
      ['greenLabels', 360],
      ['heat', 400],
      ['matched', 450],
      ['marker', 470],
      ['active', 500],
      ['hit', 550],
      ['pois', 560],
    ];
    const panes = {} as Panes;
    for (const [name, z] of order) {
      const pane = map.createPane(name);
      pane.style.zIndex = String(z);
      panes[name] = L.layerGroup().addTo(map);
    }
    panesRef.current = panes;
    heatCanvasRef.current = L.canvas({ pane: 'heat' });
    map.on('zoomend', () => setZoom(map.getZoom()));
    map.on('moveend', () => setViewTick((v) => v + 1));
    mapRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tiles when the theme flips.
  useEffect(() => {
    tileRef.current?.setUrl(TILES[theme]);
  }, [theme]);

  // Load the designated-areas scenery once (AONBs + National Parks).
  useEffect(() => {
    let alive = true;
    fetch('/designated-areas.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeatureCollection | null) => {
        if (alive && data) setGreenspace(data);
      })
      .catch(() => {}); // scenery is optional; never block the map
    return () => {
      alive = false;
    };
  }, []);

  // Draw the greenspace fills + dashed boundaries (below the heat).
  useEffect(() => {
    const P = panesRef.current;
    if (!P) return;
    P.greenspace.clearLayers();
    if (!greenspace) return;
    const fill = token('--aonb');
    const stroke = token('--aonb-line');
    // On dark, Dark Matter's land is near-black so the AONB fill reads as a pale
    // patch — dial the fill right down (the dashed boundary still marks the area).
    const dark = theme === 'dark';
    L.geoJSON(greenspace, {
      pane: 'greenspace',
      interactive: false,
      attribution:
        'Contains <a href="https://www.gov.uk/government/organisations/natural-england">Natural England</a> data © OGL',
      style: () => ({
        fillColor: fill,
        fillOpacity: dark ? 0.18 : 0.45,
        color: stroke,
        weight: 1,
        dashArray: '4 3',
        opacity: dark ? 0.5 : 0.7,
      }),
    }).addTo(P.greenspace);
  }, [greenspace, theme]);

  // Designated-area labels, only from z >= 10 (brief §4).
  useEffect(() => {
    const P = panesRef.current;
    if (!P) return;
    P.greenLabels.clearLayers();
    if (!greenspace || zoom < 10) return;
    for (const f of greenspace.features) {
      const name: unknown = f.properties?.['name'];
      if (typeof name !== 'string') continue;
      const icon = L.divIcon({
        className: '',
        html: `<span class="aonb-label">${name}</span>`,
      });
      L.marker(featureCenter(f), {
        pane: 'greenLabels',
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(P.greenLabels);
    }
  }, [greenspace, zoom, theme]);

  // Load the curated POIs once (cafes / toilets / water / stations).
  useEffect(() => {
    let alive = true;
    fetch('/pois.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeatureCollection | null) => {
        if (alive && data) setPois(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Draw POI markers for the enabled types, from z >= 9 (so they don't swamp
  // the country-wide view) and only within the current viewport (thousands of
  // real OSM POIs — viewport culling keeps the DOM small and panning smooth).
  // viewTick re-runs this on pan/zoom.
  useEffect(() => {
    const map = mapRef.current;
    const P = panesRef.current;
    if (!map || !P) return;
    P.pois.clearLayers();
    if (!pois || map.getZoom() < 12) return; // local zoom only — thousands of POIs
    const bounds = map.getBounds().pad(0.25);
    for (const f of pois.features) {
      const t: unknown = f.properties?.['type'];
      if (typeof t !== 'string' || !poiTypes.has(t)) continue;
      const g = f.geometry;
      if (g.type !== 'Point') continue;
      const lng = g.coordinates[0] ?? 0;
      const lat = g.coordinates[1] ?? 0;
      if (!bounds.contains([lat, lng])) continue;
      const name: unknown = f.properties?.['name'];
      const icon = L.divIcon({
        className: '',
        html: `<span class="poi-pin">${POI_ICON[t] ?? '📍'}</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = L.marker([lat, lng], { pane: 'pois', icon, keyboard: false });
      if (typeof name === 'string') {
        m.bindTooltip(name, { direction: 'top', offset: [0, -10] });
      }
      m.addTo(P.pois);
    }
  }, [pois, poiTypes, viewTick]);

  // Heat layer: rebuilt when routes, the grid resolution (zoom band), the search
  // state, or the theme changes. Idle = six tiers (thin drawn first so hot
  // corridors sit on top); searching = flat uniform faint layer so matches read.
  useEffect(() => {
    const map = mapRef.current;
    const P = panesRef.current;
    const canvas = heatCanvasRef.current;
    if (!map || !P || !canvas) return;

    const cell = cellSizeForZoom(zoom);
    if (
      heatCacheRef.current?.routes !== routes ||
      heatCacheRef.current.cell !== cell
    ) {
      heatCacheRef.current = {
        routes,
        cell,
        segs: buildHeatIndex(routes, cell),
      };
    }
    const segs = heatCacheRef.current.segs;
    const cHeat = token('--heat');
    const cMatch = token('--match');
    const cText = token('--text');
    const resolve = (v: string): string =>
      v === 'var(--heat)'
        ? cHeat
        : v === 'var(--match)'
          ? cMatch
          : v === 'var(--text)'
            ? cText
            : v;

    P.heat.clearLayers();
    // Heat is a corridor-overview tool; its grid-snapped segments look blocky at
    // street level. Fade it out as you zoom in — gone by z16, full by z13.
    const fade = Math.max(0, Math.min(1, (16 - zoom) / 3));
    if (fade <= 0) return;
    const line = (
      s: HeatSegment,
      color: string,
      weight: number,
      opacity: number
    ) =>
      L.polyline(
        [
          [s.a[1], s.a[0]],
          [s.b[1], s.b[0]],
        ],
        {
          pane: 'heat',
          renderer: canvas,
          color,
          weight,
          opacity: opacity * fade,
          interactive: false,
        }
      ).addTo(P.heat);

    if (matchedIds !== null) {
      for (const s of segs) line(s, cHeat, FLAT_HEAT.weight, FLAT_HEAT.opacity);
    } else {
      const styled = segs
        .map((s) => ({ s, st: heatStyle(s.count) }))
        .sort((a, b) => a.st.weight - b.st.weight); // thin first, hot on top
      for (const { s, st } of styled)
        line(s, resolve(st.color), st.weight, st.opacity);
    }
  }, [routes, matchedIds, theme, zoom]);

  // Matched / selected / marker / hit overlays.
  useEffect(() => {
    const map = mapRef.current;
    const P = panesRef.current;
    if (!map || !P) return;

    const c = {
      match: token('--match'),
      sel: token('--sel'),
      marker: token('--marker'),
      halo: token('--bg'),
    };
    const activeId = hoverId ?? selectedId;

    // Matched: ink line + basemap-coloured halo so it reads over heat.
    P.matched.clearLayers();
    if (matchedIds) {
      for (const r of routes) {
        if (!matchedIds.has(r.id) || r.id === activeId) continue;
        const ll = toLatLngs(r.geometry.coordinates);
        L.polyline(ll, {
          pane: 'matched',
          color: c.halo,
          weight: 6,
          opacity: 0.8,
          interactive: false,
        }).addTo(P.matched);
        L.polyline(ll, {
          pane: 'matched',
          color: c.match,
          weight: 2.4,
          opacity: 1,
          dashArray: isDashed(r.source) ? '7 5' : undefined,
          interactive: false,
        }).addTo(P.matched);
      }
    }

    // Active (hover or selected): blue, on top, with a start dot.
    P.active.clearLayers();
    const active = routes.find((r) => r.id === activeId);
    if (active) {
      const ll = toLatLngs(active.geometry.coordinates);
      L.polyline(ll, {
        pane: 'active',
        color: c.halo,
        weight: 9,
        opacity: 0.9,
        interactive: false,
      }).addTo(P.active);
      L.polyline(ll, {
        pane: 'active',
        color: c.sel,
        weight: 3.6,
        opacity: 1,
        dashArray: isDashed(active.source) ? '9 6' : undefined,
        interactive: false,
      }).addTo(P.active);
      const start = ll[0];
      if (start) {
        L.circleMarker(start, {
          pane: 'active',
          radius: 5,
          color: c.halo,
          weight: 2,
          fillColor: c.sel,
          fillOpacity: 1,
          interactive: false,
        }).addTo(P.active);
      }
    }

    // Search marker + 25 km radius.
    P.marker.clearLayers();
    if (searchPoint) {
      const [lng, lat] = searchPoint;
      L.circle([lat, lng], {
        pane: 'marker',
        radius: radiusKm * 1000,
        color: c.marker,
        weight: 1.4,
        dashArray: '6 7',
        opacity: 0.75,
        fillColor: c.marker,
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(P.marker);
      L.circleMarker([lat, lng], {
        pane: 'marker',
        radius: 6,
        color: c.halo,
        weight: 2.5,
        fillColor: c.marker,
        fillOpacity: 1,
        interactive: false,
      }).addTo(P.marker);
    }

    // Transparent hit lines. Only matched routes are interactive while searching.
    P.hit.clearLayers();
    const interactive = matchedIds
      ? routes.filter((r) => matchedIds.has(r.id))
      : routes;
    for (const r of interactive) {
      const hit = L.polyline(toLatLngs(r.geometry.coordinates), {
        pane: 'hit',
        color: '#000000',
        weight: 14,
        opacity: 0,
        interactive: true,
      });
      hit.on('mouseover', () => onHover(r.id));
      hit.on('mouseout', () => onHover(null));
      hit.on('click', () => onSelect(r.id));
      hit.addTo(P.hit);
    }
  }, [
    routes,
    matchedIds,
    selectedId,
    hoverId,
    searchPoint,
    radiusKm,
    theme,
    onHover,
    onSelect,
  ]);

  // Fit to everything once, when routes first load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || didInitialFit.current || routes.length === 0) return;
    const pts = routes.flatMap((r) => toLatLngs(r.geometry.coordinates));
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.2));
    didInitialFit.current = true;
  }, [routes]);

  // Fit to the matches (+ marker) when a search runs; back to all when cleared.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (searchPoint && matchedIds) {
      const pts: [number, number][] = [];
      for (const r of routes) {
        if (matchedIds.has(r.id))
          pts.push(...toLatLngs(r.geometry.coordinates));
      }
      pts.push([searchPoint[1], searchPoint[0]]);
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25));
    } else if (!searchPoint && routes.length) {
      const pts = routes.flatMap((r) => toLatLngs(r.geometry.coordinates));
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPoint]);

  // Fit to a route when it's explicitly selected (not on hover).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = routes.find((x) => x.id === selectedId);
    if (r)
      map.fitBounds(L.latLngBounds(toLatLngs(r.geometry.coordinates)).pad(0.3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={elRef} className="absolute inset-0" />;
}
