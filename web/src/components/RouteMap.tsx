import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route } from '../types.ts';
import {
  buildHeatIndex,
  heatStyle,
  cellSizeForZoom,
  FLAT_HEAT,
  type HeatSegment,
} from '../lib/heat.ts';

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
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
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

type Panes = {
  heat: L.LayerGroup;
  matched: L.LayerGroup;
  active: L.LayerGroup;
  marker: L.LayerGroup;
  hit: L.LayerGroup;
};

export function RouteMap({
  routes,
  matchedIds,
  selectedId,
  hoverId,
  searchPoint,
  radiusKm,
  theme,
  onHover,
  onSelect,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const heatCanvasRef = useRef<L.Canvas | null>(null);
  const panesRef = useRef<Panes | null>(null);
  const heatCacheRef = useRef<{
    routes: Route[];
    cell: number;
    segs: HeatSegment[];
  } | null>(null);
  const didInitialFit = useRef(false);
  const [zoom, setZoom] = useState(6);

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
      ['heat', 400],
      ['matched', 450],
      ['marker', 470],
      ['active', 500],
      ['hit', 550],
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
    mapRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tiles when the theme flips.
  useEffect(() => {
    tileRef.current?.setUrl(TILES[theme]);
  }, [theme]);

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
          opacity,
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
          dashArray: r.source === '3rd-party' ? '7 5' : undefined,
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
        dashArray: active.source === '3rd-party' ? '9 6' : undefined,
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
