import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { RouteMap } from './components/RouteMap.tsx';
import { Sidebar, type Banner, type GroupVM } from './components/Sidebar.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { distanceToRouteKm } from './lib/search.ts';
import { groupByRegion } from './lib/grouping.ts';
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

  const { resolvedTheme } = useTheme();
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

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) {
        clearSearch();
        return;
      }
      const point = await geocode(q);
      if (!point) {
        setPlace(null);
        setMatches(null);
        setBanner('geofail');
        setSelectedId(null);
        return;
      }
      const scored = routes
        .map((route) => ({ route, km: distanceToRouteKm(point, route) }))
        .filter((o) => o.km <= RADIUS_KM)
        .sort((a, b) => a.km - b.km);
      setPlace({ lng: point[0], lat: point[1], name: q });
      setMatches(scored.map((o) => o.route));
      setNearKm(new Map(scored.map((o) => [o.route.id, o.km])));
      setBanner(scored.length ? 'none' : 'nomatch');
      setSelectedId(null);
    },
    [routes, clearSearch]
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

  const searchPoint: [number, number] | null = place
    ? [place.lng, place.lat]
    : null;

  const hovered = hoverId ? routes.find((r) => r.id === hoverId) : null;

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
        onQueryChange={setQuery}
        onSubmit={(v) => void runSearch(v)}
        onClear={clearSearch}
        onSelect={onSelect}
        onHover={onHover}
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
          onHover={onHover}
          onSelect={onSelect}
        />

        <div className="pointer-events-none absolute left-5 top-5 z-[500] flex items-center gap-3.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Legend
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-text-2">
            <svg width="52" height="10" aria-hidden="true">
              <line
                x1="0"
                y1="5"
                x2="13"
                y2="5"
                stroke="var(--heat)"
                strokeWidth="1.3"
                strokeOpacity="0.2"
              />
              <line
                x1="13"
                y1="5"
                x2="26"
                y2="5"
                stroke="var(--heat)"
                strokeWidth="2.2"
                strokeOpacity="0.42"
              />
              <line
                x1="26"
                y1="5"
                x2="39"
                y2="5"
                stroke="var(--match)"
                strokeWidth="3.2"
                strokeOpacity="0.7"
              />
              <line
                x1="39"
                y1="5"
                x2="52"
                y2="5"
                stroke="var(--match)"
                strokeWidth="4.3"
                strokeOpacity="0.9"
              />
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

        {hovered && (
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
              {hovered.source === 'HV-signed'
                ? 'HV-signed — club-vetted'
                : '3rd-party route'}
            </span>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {matches
            ? `${matches.length} routes within ${RADIUS_KM} km of ${place?.name ?? ''}`
            : ''}
        </span>
      </div>
    </div>
  );
}
