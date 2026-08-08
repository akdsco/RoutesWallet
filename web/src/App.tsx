import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { RouteMap } from './components/RouteMap.tsx';
import { Sidebar, type Banner, type GroupVM } from './components/Sidebar.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { routesNear } from './lib/search.ts';
import { groupByRegion } from './lib/grouping.ts';
import { SOURCE_META } from './lib/source.ts';
import type { Route } from './types.ts';

const RADIUS_KM = 25;

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
  const [searchFocused, setSearchFocused] = useState(false);
  // Cafés default OFF: OSM has ~2,900 near the routes (every town café), so they'd
  // swamp the map. Toilets/water/stations are the useful facility layer; toggle
  // cafés on to browse an area's real cafés.
  const [poiTypes, setPoiTypes] = useState<Set<string>>(
    () => new Set(['toilet', 'water', 'station'])
  );

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
  // Legend heat stops (faint -> hot), matching the map ramp: light inverts to a
  // deep red for the busiest, dark runs to bright amber. See lib/heat.ts.
  const heatLegend =
    theme === 'dark'
      ? ['#7f1d1d', '#ef4444', '#f97316', '#ffb020']
      : ['#f87171', '#dc2626', '#991b1b', '#7f1d1d'];

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

  // Precedence mirrors the design spec: a failure or an active search always
  // wins; otherwise focusing the input swaps the static line for a prompt on
  // what to type. Kept club-agnostic (no hardcoded place names) for multi-club.
  const hint =
    banner === 'geofail'
      ? 'Place not recognised'
      : matches
        ? `Within ${RADIUS_KM} km of ${place?.name ?? ''}`
        : searchFocused
          ? 'Try a town, postcode or landmark'
          : `Shows routes passing within ${RADIUS_KM} km`;

  const searchPoint: [number, number] | null = place
    ? [place.lng, place.lat]
    : null;

  // A selected route locks the top-right panel to itself — hovering other
  // routes must not preview them. Only when nothing is selected does hover
  // drive the panel. The deselect (×) shows whenever the panel is the
  // selected route.
  const hovered = hoverId ? routes.find((r) => r.id === hoverId) : null;
  const selectedRoute = selectedId
    ? (routes.find((r) => r.id === selectedId) ?? null)
    : null;
  const panelRoute = selectedRoute ?? hovered;
  const panelIsSelected = panelRoute != null && panelRoute.id === selectedId;

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
        onSearchFocusChange={setSearchFocused}
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
          poiTypes={poiTypes}
          onHover={onHover}
          onSelect={onSelect}
        />

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

        <div className="pointer-events-none absolute left-5 top-5 z-[500] flex items-center gap-3.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Legend
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-text-2">
            <svg width="52" height="10" aria-hidden="true">
              {heatLegend.map((c, i) => (
                <line
                  key={c}
                  x1={i * 13}
                  y1="5"
                  x2={(i + 1) * 13}
                  y2="5"
                  stroke={c}
                  strokeWidth={[1.3, 2.2, 3.2, 4.3][i]}
                  strokeOpacity={[0.4, 0.6, 0.85, 1][i]}
                />
              ))}
            </svg>
            1 → many rides
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-text-2">
            <svg width="20" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke="var(--sel)"
                strokeWidth="3.6"
              />
            </svg>
            selected
          </span>
        </div>

        {panelRoute && (
          <div
            role="status"
            className="absolute right-5 top-5 z-[500] flex w-[250px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14px] font-medium text-text">
                {panelRoute.name}
              </span>
              {panelIsSelected && (
                <button
                  type="button"
                  aria-label="Deselect route"
                  onClick={() => setSelectedId(null)}
                  className="-mr-1 -mt-1 flex h-7 w-7 flex-none items-center justify-center rounded text-[15px] text-muted hover:bg-surface-2 hover:text-text"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
            <span className="font-mono text-[12px] text-text-2">
              {panelRoute.distance_km} km · {panelRoute.region}
            </span>
            <span className="text-[12px] text-muted">
              {SOURCE_META[panelRoute.source].blurb}
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
