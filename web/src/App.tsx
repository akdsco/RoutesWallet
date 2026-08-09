import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { RouteMap } from './components/RouteMap.tsx';
import { Legend } from './components/Legend.tsx';
import { RouteDetail } from './components/RouteDetail.tsx';
import { BasemapControl } from './components/BasemapControl.tsx';
import { Sidebar, type Banner, type GroupVM } from './components/Sidebar.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { routesNear } from './lib/search.ts';
import { groupByRegion } from './lib/grouping.ts';
import { SOURCE_META } from './lib/source.ts';
import {
  DEFAULT_BASEMAP,
  isBasemapId,
  type BasemapId,
} from './lib/basemaps.ts';
import type { Route } from './types.ts';

const RADIUS_KM = 25;
const BASEMAP_STORAGE_KEY = 'rw:basemap';

/** The saved basemap choice, or the default if none/invalid/unavailable. */
function readSavedBasemap(): BasemapId {
  try {
    const v = window.localStorage.getItem(BASEMAP_STORAGE_KEY);
    if (isBasemapId(v)) return v;
  } catch {
    // private mode / storage disabled — fall back to the default
  }
  return DEFAULT_BASEMAP;
}

type Place = { lng: number; lat: number; name: string };

export function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [matches, setMatches] = useState<Route[] | null>(null);
  const [nearKm, setNearKm] = useState<Map<string, number>>(new Map());
  const [banner, setBanner] = useState<Banner>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Cafés default OFF: OSM has ~2,900 near the routes (every town café), so they'd
  // swamp the map. Toilets/water/stations are the useful facility layer; toggle
  // cafés on to browse an area's real cafés.
  const [poiTypes, setPoiTypes] = useState<Set<string>>(
    () => new Set(['toilet', 'water', 'station'])
  );
  const [basemap, setBasemap] = useState<BasemapId>(readSavedBasemap);

  // Persist the basemap choice so it survives a reload (theme already persists
  // via next-themes). Best-effort — storage may be unavailable in private mode.
  useEffect(() => {
    try {
      window.localStorage.setItem(BASEMAP_STORAGE_KEY, basemap);
    } catch {
      /* ignore */
    }
  }, [basemap]);

  const togglePoi = useCallback(
    (t: string) =>
      setPoiTypes((prev) => {
        const next = new Set(prev);
        if (next.has(t)) next.delete(t);
        else next.add(t);
        return next;
      }),
    []
  );

  const { resolvedTheme, setTheme } = useTheme();
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    loadRoutes()
      .then(setRoutes)
      .catch(() => setBanner('empty'))
      .finally(() => setLoading(false));
  }, []);

  const onHover = useCallback((id: string | null) => setHoverId(id), []);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setPlace(null);
    setMatches(null);
    setNearKm(new Map());
    setBanner('none');
    setSelectedId(null);
  }, []);

  const searchSeq = useRef(0);
  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) {
        clearSearch();
        return;
      }
      // Don't score against an empty/unloaded dataset — that would show a false
      // "no routes within 25 km" that never re-runs once the data lands.
      if (loading || routes.length === 0) return;

      const seq = ++searchSeq.current;
      const fail = () => {
        if (seq !== searchSeq.current) return; // a newer search superseded us
        setPlace(null);
        setMatches(null);
        setBanner('geofail');
        setSelectedId(null);
      };

      let point: [number, number] | null;
      try {
        point = await geocode(q);
      } catch {
        fail(); // network / rate-limit / bad JSON — treat as a failed lookup
        return;
      }
      // A slower earlier query must not overwrite a newer one's results.
      if (seq !== searchSeq.current) return;
      if (!point) {
        fail();
        return;
      }
      const scored = routesNear(point, routes, RADIUS_KM);
      setPlace({ lng: point[0], lat: point[1], name: q });
      setMatches(scored.map((o) => o.route));
      setNearKm(new Map(scored.map((o) => [o.route.id, o.km])));
      setBanner(scored.length ? 'none' : 'nomatch');
      setSelectedId(null);
    },
    [routes, loading, clearSearch]
  );

  const matchedIds = useMemo(
    () => (matches ? new Set(matches.map((r) => r.id)) : null),
    [matches]
  );

  const groups = useMemo<GroupVM[]>(() => {
    if (matches) {
      return [
        {
          label: place ? `Near ${place.name} — nearest first` : 'Matches',
          count: matches.length,
          items: matches.map((r) => ({ route: r, nearKm: nearKm.get(r.id) })),
        },
      ];
    }
    return groupByRegion(routes).map((g) => ({
      label: g.label,
      count: g.routes.length,
      items: g.routes.map((r) => ({ route: r })),
    }));
  }, [matches, routes, nearKm, place]);

  const displayBanner: Banner = loading
    ? 'loading'
    : routes.length === 0 && banner === 'none'
      ? 'empty'
      : banner;

  const hint =
    banner === 'geofail'
      ? 'Place not recognised'
      : matches
        ? `Within ${RADIUS_KM} km of ${place?.name ?? ''}`
        : `Shows routes passing within ${RADIUS_KM} km`;

  // Memoized so the reference only changes when the searched place does — NOT on
  // every App re-render (e.g. a hover). RouteMap's fit-to-matches effect keys on
  // this; an unstable array made it re-fit on any re-render, so zooming in after a
  // search snapped the view back to the search extent (TB-52). Stable ref = fit
  // once when the search resolves, then free zoom/pan.
  const searchPoint = useMemo<[number, number] | null>(
    () => (place ? [place.lng, place.lat] : null),
    [place]
  );

  const hovered = hoverId ? routes.find((r) => r.id === hoverId) : null;
  const selectedRoute = selectedId
    ? (routes.find((r) => r.id === selectedId) ?? null)
    : null;

  return (
    <div className="flex h-screen">
      <Sidebar
        totalCount={routes.length}
        query={query}
        hint={hint}
        banner={displayBanner}
        placeLabel={place?.name ?? ''}
        groups={groups}
        selectedId={selectedId}
        theme={theme}
        onQueryChange={setQuery}
        onSubmit={(v) => void runSearch(v)}
        onClear={clearSearch}
        onSelect={onSelect}
        onHover={onHover}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      <div className="relative flex-1">
        <RouteMap
          routes={routes}
          matchedIds={matchedIds}
          selectedId={selectedId}
          hoverId={hoverId}
          searchPoint={searchPoint}
          radiusKm={RADIUS_KM}
          theme={theme}
          basemap={basemap}
          poiTypes={poiTypes}
          onHover={onHover}
          onSelect={onSelect}
        />

        {/* Basemap switcher — bottom-right popover (v2 design, spec C). */}
        <BasemapControl basemap={basemap} theme={theme} onChange={setBasemap} />

        <div className="absolute left-5 top-[68px] z-[500] flex items-center gap-1.5">
          {(
            [
              ['cafe', '☕', 'Cafés'],
              ['toilet', '🚻', 'Toilets'],
              ['water', '💧', 'Water'],
              ['station', '🚉', 'Stations'],
            ] as const
          ).map(([t, icon, label]) => {
            const on = poiTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                title={label}
                onClick={() => togglePoi(t)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                  on
                    ? 'border-line bg-surface text-text'
                    : 'border-line bg-surface/60 text-muted opacity-60'
                }`}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        <Legend searching={searchPoint !== null} theme={theme} />

        {selectedRoute && (
          <RouteDetail
            route={selectedRoute}
            nearKm={nearKm.get(selectedRoute.id)}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Transient hover peek — suppressed while a route is selected so it
            never collides with the pinned detail card (same top-right corner). */}
        {hovered && !selectedRoute && (
          <div
            role="status"
            className="absolute right-5 top-5 z-[500] flex w-[250px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3.5"
          >
            <span className="text-[14px] font-medium text-text">
              {hovered.name}
            </span>
            <span className="font-mono text-[12px] text-text-2">
              {hovered.distance_km} km · {hovered.region}
            </span>
            <span className="text-[12px] text-muted">
              {SOURCE_META[hovered.source].blurb}
            </span>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {banner === 'geofail'
            ? `Couldn't find “${query}”. Try a town, village or landmark.`
            : banner === 'nomatch'
              ? `No routes within ${RADIUS_KM} km of ${place?.name ?? query}`
              : matches
                ? `${matches.length} routes within ${RADIUS_KM} km of ${place?.name ?? ''}`
                : ''}
        </span>
      </div>
    </div>
  );
}
