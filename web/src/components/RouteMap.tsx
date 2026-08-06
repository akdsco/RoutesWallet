import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route } from '../types.ts';
import { openLabel } from '../lib/links.ts';

type Props = {
  routes: Route[];
  /** When non-empty, only these ids are drawn bold; the rest are greyed. */
  highlightIds: Set<string>;
  searchPoint: [number, number] | null;
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!
  );
}

export function RouteMap({ routes, highlightIds, searchPoint }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialise the Leaflet map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current).setView([51.5072, -0.1276], 6);
    // CARTO Positron — muted greyscale raster, free + keyless (fits no-secrets).
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    ).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  // Redraw routes whenever data / highlight / search point changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const focus: L.LatLngExpression[] = [];
    for (const r of routes) {
      const latlngs = r.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const on = highlightIds.size === 0 || highlightIds.has(r.id);
      const color = r.source === 'HV-signed' ? '#e8590c' : '#1c7ed6';
      L.polyline(latlngs, {
        color: on ? color : '#adb5bd',
        weight: on ? 4 : 2,
        opacity: on ? 1 : 0.4,
      })
        .bindPopup(
          `<strong>${escapeHtml(r.name)}</strong><br>${r.distance_km} km · ${r.source}` +
            `<br><a href="${escapeHtml(r.link)}" target="_blank" rel="noopener">${openLabel(r.link)}</a>`
        )
        .addTo(layer);
      if (on) focus.push(...latlngs);
    }

    if (searchPoint) {
      const [lng, lat] = searchPoint;
      L.circleMarker([lat, lng], {
        radius: 8,
        color: '#212529',
        fillColor: '#ffd43b',
        fillOpacity: 1,
      })
        .bindPopup('Search location')
        .addTo(layer);
      focus.push([lat, lng]);
    }

    if (focus.length) map.fitBounds(L.latLngBounds(focus).pad(0.25));
  }, [routes, highlightIds, searchPoint]);

  return <div ref={elRef} className="map" />;
}
