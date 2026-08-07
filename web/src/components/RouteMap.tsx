import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, FeatureCollection } from 'geojson';
import type { Route } from '../types.ts';
import {
  buildHeatIndex,
  HEAT_TIERS,
  cellSizeForZoom,
  FLAT_HEAT,
  type HeatSegment,
} from '../lib/heat.ts';
import { isDashed } from '../lib/source.ts';
import { mapPalette } from '../lib/mapColors.ts';
import { decimate } from '../lib/decimate.ts';
import { zoomAnchorOffset } from '../lib/zoomTransform.ts';

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
  // What the heat canvas last actually drew — so a zoom that changes nothing
  // visible (same grid band + fade) skips the clear/redraw flash and just lets
  // Leaflet re-project the existing canvas.
  const heatDrawRef = useRef<{
    key: string;
    routes: Route[];
    matchedIds: Set<string> | null;
  } | null>(null);
  const didInitialFit = useRef(false);
  const [zoom, setZoom] = useState(6);
  const [viewTick, setViewTick] = useState(0);

  // Initialise the map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      // Continuous fractional zoom (default snaps to whole levels). Retina tiles
      // stay crisp between levels. We drive the wheel ourselves (see below) for a
      // smooth cursor-anchored glide, so Leaflet's stepped wheel zoom is off.
      zoomSnap: 0,
      zoomDelta: 1, // +/- buttons & keyboard still step by a whole level
      scrollWheelZoom: false,
    }).setView([51.5072, -0.1276], 6);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    // The tile layer is created + swapped by the theme effect below (it owns the
    // basemap so a theme flip can replace the layer cleanly).

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

    // Smooth, Figma-style wheel zoom. Leaflet's built-in wheel zoom fires
    // discrete animated steps ("bump bump bump"), and re-rendering every layer
    // per frame (setZoomAround) blows the paint budget on our heat canvas — so
    // it juddered, or the heat had to be dropped during the glide.
    //
    // Instead, during the gesture we SCALE THE WHOLE MAP PANE with a CSS
    // transform (pure GPU — the basemap AND the heat scale together, nothing
    // re-renders), anchored under the cursor and eased toward a goal zoom. When
    // the wheel stops we commit the real zoom once (crisp re-render). This is how
    // pinch-zoom works; the map never disappears and stays at 60 fps.
    const SENSITIVITY = 0.02; // zoom levels per px of wheel delta
    const EASE = 0.33; // fraction of the remaining distance closed per frame
    const mapPane = map.getPane('mapPane') ?? map.getContainer();

    let gesturing = false;
    let startZoom = map.getZoom();
    let anchorPx = L.point(0, 0);
    let anchorLatLng = map.getCenter();
    let goalZoom = startZoom;
    let dispZoom = startZoom;
    let raf: number | null = null;
    let commitTimer: ReturnType<typeof setTimeout> | null = null;

    // Scale the map pane around the (fixed) cursor point for a given zoom.
    // P = the pane's current translate (setTransform doesn't change it, so it
    // stays the real view offset for the whole gesture). Scaling content around
    // the cursor pixel c is: c + scale*(orig - c); with content at P + local,
    // that's transform translate(c*(1-scale) + scale*P) scale(scale).
    const paint = () => {
      dispZoom += (goalZoom - dispZoom) * EASE;
      if (Math.abs(goalZoom - dispZoom) < 0.0015) dispZoom = goalZoom;
      const scale = map.getZoomScale(dispZoom, startZoom);
      const P = L.DomUtil.getPosition(mapPane) ?? L.point(0, 0);
      const off = zoomAnchorOffset(anchorPx, P, scale);
      L.DomUtil.setTransform(mapPane, L.point(off.x, off.y), scale);
      raf = dispZoom === goalZoom ? null : requestAnimationFrame(paint);
    };

    const commit = () => {
      commitTimer = null;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      gesturing = false;
      if (goalZoom !== startZoom) {
        // setZoomAround re-renders crisp at the goal and resets the transform.
        map.setZoomAround(anchorLatLng, goalZoom, { animate: false });
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 20; // lines -> ~px
      else if (e.deltaMode === 2) d *= 400; // pages -> ~px
      if (!gesturing) {
        gesturing = true;
        startZoom = map.getZoom();
        dispZoom = startZoom;
        goalZoom = startZoom;
        anchorPx = map.mouseEventToContainerPoint(e);
        anchorLatLng = map.containerPointToLatLng(anchorPx);
      }
      goalZoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), goalZoom - d * SENSITIVITY)
      );
      if (raf == null) raf = requestAnimationFrame(paint);
      if (commitTimer != null) clearTimeout(commitTimer);
      commitTimer = setTimeout(commit, 150); // commit shortly after the wheel stops
    };
    // Lives with the map (created once, guarded above) — like the map.on
    // handlers, it isn't torn down, so a StrictMode remount doesn't orphan it.
    map.getContainer().addEventListener('wheel', onWheel, { passive: false });

    mapRef.current = map;
  }, []);

  // Own + swap the basemap when the theme flips. We REPLACE the whole tile layer
  // rather than calling setUrl(): at a fractional zoom (zoomSnap:0) setUrl
  // mis-positions the reloaded tiles so they render far from the real view
  // ("UK over Africa"). A fresh layer recomputes tile positions from the current
  // view; drop the old layer once the new one has painted to avoid a flash.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = tileRef.current;
    const next = L.tileLayer(TILES[theme], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
      keepBuffer: 4, // hold more off-screen tiles so panning shows fewer gaps
    }).addTo(map);
    tileRef.current = next;
    if (prev) next.once('load', () => map.removeLayer(prev));
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

  // Draw the greenspace fills + dashed boundaries (below the heat). Colour and
  // per-theme opacity live in CSS (.aonb-shape), so a theme flip restyles them
  // instantly through the cascade — no getComputedStyle (which races the
  // data-theme swap and baked in the wrong colour) and no redraw on toggle.
  useEffect(() => {
    const P = panesRef.current;
    if (!P) return;
    P.greenspace.clearLayers();
    if (!greenspace) return;
    L.geoJSON(greenspace, {
      pane: 'greenspace',
      interactive: false,
      // className is a Path option applied at creation (CSS then styles the
      // shapes); it's valid at runtime but missing from Leaflet's geoJSON types.
      className: 'aonb-shape',
      attribution:
        'Contains <a href="https://www.gov.uk/government/organisations/natural-england">Natural England</a> data © OGL',
      style: () => ({ weight: 1, dashArray: '4 3' }),
    } as L.GeoJSONOptions & { className: string }).addTo(P.greenspace);
  }, [greenspace]);

  // Designated-area labels, only from z >= 10 (brief §4). Keyed on the on/off
  // threshold, not raw zoom — the labels sit at fixed latlngs and track the map
  // on their own, so rebuilding them every zoom step is just churn.
  const showLabels = zoom >= 10;
  useEffect(() => {
    const P = panesRef.current;
    if (!P) return;
    P.greenLabels.clearLayers();
    if (!greenspace || !showLabels) return;
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
  }, [greenspace, showLabels]);

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
    // Heat is a corridor-overview tool; its grid-snapped segments look blocky at
    // street level, so fade it out as you zoom in — gone by z16, full by z13.
    const fade = Math.max(0, Math.min(1, (16 - zoom) / 3));
    // Only the grid band, the (bucketed) fade and the search state change what's
    // drawn. If none moved, skip the redraw — the existing canvas re-projects
    // itself smoothly with the zoom animation instead of flashing.
    const key = `${cell}|${Math.round(fade * 8)}|${matchedIds !== null}|${theme}`;
    if (
      heatDrawRef.current &&
      heatDrawRef.current.key === key &&
      heatDrawRef.current.routes === routes &&
      heatDrawRef.current.matchedIds === matchedIds
    ) {
      return;
    }
    heatDrawRef.current = { key, routes, matchedIds };

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
    // Colours come from the theme PROP (not getComputedStyle), so a toggle never
    // draws the previous theme's palette — see mapColors.ts.
    const pal = mapPalette(theme);
    const resolve = (v: string): string =>
      v === 'var(--heat)'
        ? pal.heat
        : v === 'var(--match)'
          ? pal.match
          : v === 'var(--text)'
            ? pal.text
            : v;

    P.heat.clearLayers();
    if (fade <= 0) return;
    // Draw all segments of one style as a SINGLE multi-polyline, not one Leaflet
    // layer per segment. The country-wide grid has tens of thousands of segments;
    // one layer each meant Leaflet re-stroked ~65k paths on every zoom frame
    // (the zoom "junk"). Grouped, that's a handful of canvas paths instead.
    const drawGroup = (
      group: HeatSegment[],
      color: string,
      weight: number,
      opacity: number
    ) => {
      if (!group.length) return;
      const lines: [number, number][][] = group.map((s) => [
        [s.a[1], s.a[0]],
        [s.b[1], s.b[0]],
      ]);
      L.polyline(lines, {
        pane: 'heat',
        renderer: canvas,
        color,
        weight,
        opacity: opacity * fade,
        interactive: false,
      }).addTo(P.heat);
    };

    if (matchedIds !== null) {
      drawGroup(segs, pal.heat, FLAT_HEAT.weight, FLAT_HEAT.opacity);
    } else {
      // Bucket segments by tier, then draw thin tiers first so hot corridors
      // sit on top (HEAT_TIERS is ordered faint -> hot).
      const buckets: HeatSegment[][] = HEAT_TIERS.map(() => []);
      for (const s of segs) {
        let i = HEAT_TIERS.findIndex((t) => s.count <= t.max);
        if (i < 0) i = HEAT_TIERS.length - 1;
        buckets[i]!.push(s);
      }
      HEAT_TIERS.forEach((t, i) =>
        drawGroup(buckets[i]!, resolve(t.color), t.weight, t.opacity)
      );
    }
  }, [routes, matchedIds, theme, zoom]);

  // Matched / selected / marker / hit overlays.
  useEffect(() => {
    const map = mapRef.current;
    const P = panesRef.current;
    if (!map || !P) return;

    const c = mapPalette(theme); // theme-prop colours, no getComputedStyle race
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
      // The hit line is an INVISIBLE fat (14px) line just for hover/click, so it
      // doesn't need full resolution — decimate it. At full res the 125 lines
      // were ~316k SVG points that Leaflet re-projected on every zoom frame (the
      // remaining zoom stall). Displayed lines (active/matched) stay full-res.
      const hit = L.polyline(toLatLngs(decimate(r.geometry.coordinates, 160)), {
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
