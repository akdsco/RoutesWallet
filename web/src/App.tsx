import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { RouteMap } from './components/RouteMap.tsx';
import { Legend } from './components/Legend.tsx';
import { BasemapControl } from './components/BasemapControl.tsx';
import { Sidebar, type Banner, type GroupVM } from './components/Sidebar.tsx';
import { SearchField } from './components/SearchField.tsx';
import { RouteList, type FilterEmpty } from './components/RouteList.tsx';
import { FilterPanel } from './components/FilterPanel.tsx';
import { MobileFilterSheet } from './components/MobileFilterSheet.tsx';
import { SortMenu } from './components/SortMenu.tsx';
import { BottomSheet } from './components/BottomSheet.tsx';
import { useMediaQuery } from './lib/useMediaQuery.ts';
import { useViewportHeight } from './lib/useViewportHeight.ts';
import { snapsFor, snapHeights, type Snap } from './lib/sheet.ts';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { routesNear } from './lib/search.ts';
import { groupByRegion, resolveOpenGroups } from './lib/grouping.ts';
import { riddenScores } from './lib/heat.ts';
import { countLine } from './lib/count-line.ts';
import {
  applyFilters,
  defaultFilters,
  distanceDomain,
  elevationDomain,
  countyCounts,
  countryCounts,
  activeFilterCount,
  biggestRelaxation,
  widenDistanceTarget,
  countyOf,
  groupKeyOf,
  type Domains,
  type Filters,
  type Range,
  type Relaxation,
} from './lib/filters.ts';
import { encodeView, decodeView, contextualSort } from './lib/url-state.ts';
import {
  sortRoutes,
  INITIAL_SORT,
  sortOnSearch,
  sortOnClear,
  sortOnPick,
  type SortKey,
  type SortState,
} from './lib/sort.ts';
import { SOURCE_META } from './lib/source.ts';
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  isBasemapId,
  type BasemapId,
} from './lib/basemaps.ts';
import type { Route } from './types.ts';

const RADIUS_KM = 25;
const BASEMAP_STORAGE_KEY = 'rw:basemap';

const ZERO_DOMAINS: Domains = {
  distance: { min: 0, max: 0, hardMax: 0 },
  elevation: { min: 0, max: 0, hardMax: 0 },
};

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

function toggleSet(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Empty-state copy: names the dimension to relax and what it buys. */
function relaxPhrase({ dimension, adds }: Relaxation): string {
  const n = `${adds} ${adds === 1 ? 'route' : 'routes'}`;
  switch (dimension) {
    case 'distance':
      return `Widening the distance range would add ${n}.`;
    case 'elevation':
      return `Widening the elevation range would add ${n}.`;
    case 'county':
      return `Adding another county would show ${n}.`;
    case 'country':
      return `Adding another country would show ${n}.`;
  }
}

type Place = { lng: number; lat: number; name: string };

export function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [geoFail, setGeoFail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [announce, setAnnounce] = useState('');

  // Filters + sort + fold state (§G). Filters init from the real domains once the
  // routes load (see the init effect); until then `initialised` keeps the widest
  // (pass-all) defaults so nothing is spuriously excluded.
  const [filters, setFilters] = useState<Filters>(() =>
    defaultFilters(ZERO_DOMAINS)
  );
  const [sortState, setSortState] = useState<SortState>(INITIAL_SORT);
  const [manualFolds, setManualFolds] = useState<Map<string, boolean>>(
    () => new Map()
  );
  const [initialised, setInitialised] = useState(false);
  // Mobile: the filter view swaps into the sheet in place of the list (§F).
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Live slider position while dragging — drives the handle + the count preview
  // only. The heavier list/map re-render waits for release (commit), per §G.
  const [rangeDraft, setRangeDraft] = useState<{
    distance?: Range;
    elevation?: Range;
  }>({});

  const [poiTypes, setPoiTypes] = useState<Set<string>>(
    () => new Set(['toilet', 'water', 'station'])
  );
  const [basemap, setBasemap] = useState<BasemapId>(readSavedBasemap);

  useEffect(() => {
    try {
      window.localStorage.setItem(BASEMAP_STORAGE_KEY, basemap);
    } catch {
      /* ignore */
    }
  }, [basemap]);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const vh = useViewportHeight();
  const [snap, setSnap] = useState<Snap>('peek');
  const snapRef = useRef<Snap>(snap);
  snapRef.current = snap;
  const snaps = snapsFor(!!selectedId);

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
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false));
  }, []);

  // Domains + the filter pool. Before init, use the widest defaults so the pool
  // is everything (avoids a one-frame "filtered to nothing" flash on load).
  const domains = useMemo<Domains>(
    () => ({
      distance: distanceDomain(routes),
      elevation: elevationDomain(routes),
    }),
    [routes]
  );
  const effFilters = initialised ? filters : defaultFilters(domains);

  const pool = useMemo(
    () => applyFilters(routes, effFilters, domains),
    [routes, effFilters, domains]
  );
  const hasFilters = activeFilterCount(effFilters, domains) > 0;
  const hasElevation = domains.elevation.max > domains.elevation.min;
  const riddenScore = useMemo(() => riddenScores(routes), [routes]);

  const onHover = useCallback((id: string | null) => setHoverId(id), []);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const onDeselect = useCallback(() => setSelectedId(null), []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setPlace(null);
    setGeoFail(false);
    setSelectedId(null);
    setSortState((s) => sortOnClear(s));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.activeElement?.id === 'q') {
        if (query || place) {
          clearSearch();
          e.preventDefault();
        }
        return;
      }
      if (selectedId) {
        setSelectedId(null);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, query, place, clearSearch]);

  const searchSeq = useRef(0);
  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) {
        clearSearch();
        return;
      }
      if (loading || routes.length === 0) return;

      const seq = ++searchSeq.current;
      const fail = () => {
        if (seq !== searchSeq.current) return;
        setPlace(null);
        setGeoFail(true);
        setSelectedId(null);
        // Losing the place must also drop a 'nearest' sort — otherwise the list
        // stays flat/ungrouped with an un-selectable sort and no place (§G).
        setSortState((s) => sortOnClear(s));
      };

      let point: [number, number] | null;
      try {
        point = await geocode(q);
      } catch {
        fail();
        return;
      }
      if (seq !== searchSeq.current) return;
      if (!point) {
        fail();
        return;
      }
      setGeoFail(false);
      setPlace({ lng: point[0], lat: point[1], name: q });
      setSelectedId(null);
      setSortState((s) => sortOnSearch(s)); // announce handled by the effect below
    },
    [routes, loading, clearSearch]
  );

  // Restore the shared view from the URL once the data lands (§G): filters, sort
  // and the search place. Fold + selection are deliberately not in the URL.
  // Degrades — unknown counties / out-of-domain ranges are dropped by decodeView.
  useEffect(() => {
    if (loading || routes.length === 0 || initialised) return;
    setInitialised(true);
    const counties = [...new Set(routes.map(countyOf))].filter(
      (c): c is string => c !== undefined
    );
    const view = decodeView(window.location.search, counties, domains);
    setFilters(view.filters);
    // A sort that differs from the contextual default was chosen explicitly, so
    // mark it sticky; otherwise leave it as the default (a later search can switch
    // it to nearest).
    setSortState({
      sort: view.sort,
      chose: view.sort !== contextualSort(view.near),
    });
    if (view.near) {
      setQuery(view.near);
      void runSearch(view.near);
    }
  }, [loading, routes, domains, initialised, runSearch]);

  // Mirror the live view back into the URL (replaceState, so Back leaves the app
  // rather than walking slider drags). Omitted at defaults → a clean URL.
  useEffect(() => {
    if (!initialised) return;
    const qs = encodeView(
      { filters, sort: sortState.sort, near: place?.name ?? '' },
      domains
    );
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [initialised, filters, sortState.sort, place, domains]);

  // Search ranks WITHIN the filtered pool, never the full library (§G).
  const scored = useMemo(
    () => (place ? routesNear([place.lng, place.lat], pool, RADIUS_KM) : null),
    [place, pool]
  );
  const matches = useMemo(
    () => (scored ? scored.map((o) => o.route) : null),
    [scored]
  );
  const nearKm = useMemo(
    () => new Map((scored ?? []).map((o) => [o.route.id, o.km])),
    [scored]
  );
  const matchedIds = useMemo(
    () => (matches ? new Set(matches.map((r) => r.id)) : null),
    [matches]
  );

  // Sort orders the survivors (the matched set when searching, else the pool).
  const flat = sortState.sort === 'nearest';
  const survivors = useMemo(
    () => sortRoutes(matches ?? pool, sortState.sort, { nearKm, riddenScore }),
    [matches, pool, sortState.sort, nearKm, riddenScore]
  );

  const groups = useMemo<GroupVM[]>(() => {
    const toItems = (rs: Route[]) =>
      rs.map((r) => ({ route: r, nearKm: nearKm.get(r.id) }));
    if (flat) {
      return [
        { label: 'all', count: survivors.length, items: toItems(survivors) },
      ];
    }
    return groupByRegion(survivors).map((g) => ({
      label: g.label,
      count: g.routes.length,
      items: toItems(g.routes),
    }));
  }, [flat, survivors, nearKm]);

  // Use groupKeyOf (the list's grouping key, not the county-filter key) so the
  // selected route's group — a UK county, or a collapsed country like "Spain" —
  // force-opens on select (§G fold rule).
  const selectedRoute = selectedId
    ? (routes.find((r) => r.id === selectedId) ?? null)
    : null;
  const selectedCounty = selectedRoute ? groupKeyOf(selectedRoute) : null;
  const singleCounty =
    filters.counties.size === 1 ? [...filters.counties][0]! : null;
  const openGroups = useMemo(() => {
    const labels = groups.map((g) => g.label);
    return flat
      ? new Set(labels)
      : resolveOpenGroups(labels, {
          manualFolds,
          selectedCounty,
          singleCounty,
        });
  }, [flat, groups, manualFolds, selectedCounty, singleCounty]);

  const toggleGroup = useCallback(
    (county: string) =>
      setManualFolds((m) => {
        const next = new Map(m);
        next.set(county, !openGroups.has(county));
        return next;
      }),
    [openGroups]
  );

  // Filter mutations.
  const clearFilters = useCallback(
    () => setFilters(defaultFilters(domains)),
    [domains]
  );
  const toggleCounty = useCallback(
    (name: string) =>
      setFilters((f) => ({ ...f, counties: toggleSet(f.counties, name) })),
    []
  );
  const toggleCountry = useCallback(
    (name: string) =>
      setFilters((f) => ({ ...f, countries: toggleSet(f.countries, name) })),
    []
  );
  // Slider drag (onChange) updates only the draft; release (onCommit) applies it
  // to the filters and clears the draft — so the pool/list/map recompute once, on
  // release, not on every drag step.
  const previewDistance = useCallback(
    (r: Range) => setRangeDraft((d) => ({ ...d, distance: r })),
    []
  );
  const previewElevation = useCallback(
    (r: Range) => setRangeDraft((d) => ({ ...d, elevation: r })),
    []
  );
  const commitDistance = useCallback((r: Range) => {
    setFilters((f) => ({ ...f, distance: r }));
    setRangeDraft((d) => ({ ...d, distance: undefined }));
  }, []);
  const commitElevation = useCallback((r: Range) => {
    setFilters((f) => ({ ...f, elevation: r }));
    setRangeDraft((d) => ({ ...d, elevation: undefined }));
  }, []);
  // Empty-state "Widen distance" commits directly (no drag).
  const setDistance = commitDistance;

  const pickSort = useCallback(
    (key: SortKey) => setSortState(sortOnPick(key)),
    []
  );

  // Announce a switch to nearest-first (§G) — in an effect, not the state updater,
  // so the announce stays a pure side effect (StrictMode-safe).
  const prevSortRef = useRef<SortKey>(sortState.sort);
  useEffect(() => {
    if (sortState.sort === 'nearest' && prevSortRef.current !== 'nearest') {
      setAnnounce('Sorted by nearest first.');
    }
    prevSortRef.current = sortState.sort;
  }, [sortState.sort]);

  const countyChips = useMemo(
    () => countyCounts(routes, effFilters, domains),
    [routes, effFilters, domains]
  );
  const countryChips = useMemo(
    () => countryCounts(routes, effFilters, domains),
    [routes, effFilters, domains]
  );
  const activeCount = activeFilterCount(effFilters, domains);

  // While a slider is mid-drag, the sliders show the draft value and the count
  // previews the draft pool — the list stays on the committed filters until
  // release. displayFilters merges any draft range over the committed filters.
  const draftActive = !!(rangeDraft.distance || rangeDraft.elevation);
  const displayFilters: Filters = draftActive
    ? {
        ...effFilters,
        ...(rangeDraft.distance ? { distance: rangeDraft.distance } : {}),
        ...(rangeDraft.elevation ? { elevation: rangeDraft.elevation } : {}),
      }
    : effFilters;
  // Preview the count from the draft pool only when idle. During a search the
  // count line shows "K of M" over the COMMITTED pool + matches, so previewing
  // just the pool would make K > M until release — so don't.
  const previewCount = draftActive && !place;
  const previewPoolCount = previewCount
    ? applyFilters(routes, displayFilters, domains).length
    : pool.length;
  const previewHasFilters = previewCount
    ? activeFilterCount(displayFilters, domains) > 0
    : hasFilters;

  const countLineText = countLine({
    total: routes.length,
    poolCount: previewPoolCount,
    matchCount: matches?.length ?? 0,
    hasFilters: previewHasFilters,
    place: place?.name ?? '',
    radiusKm: RADIUS_KM,
  });

  // Filter-empty state (idle, filters exclude everything). Names the biggest-win
  // relaxation and offers a distance nudge when one would help.
  const filterEmpty = useMemo<FilterEmpty | null>(() => {
    if (place || !hasFilters || survivors.length > 0) return null;
    const relax = biggestRelaxation(routes, filters, domains);
    const widen = widenDistanceTarget(routes, filters, domains);
    return {
      detail: relax
        ? relaxPhrase(relax)
        : 'Nothing matches. Clearing the filters brings the routes back.',
      onClearAll: clearFilters,
      onWiden: widen ? () => setDistance(widen) : undefined,
    };
  }, [
    place,
    hasFilters,
    survivors.length,
    routes,
    filters,
    domains,
    clearFilters,
    setDistance,
  ]);

  const displayBanner: Banner = loading
    ? 'loading'
    : routes.length === 0
      ? 'empty'
      : geoFail
        ? 'geofail'
        : place && matches && matches.length === 0
          ? 'nomatch'
          : 'none';

  const hint = geoFail
    ? 'Place not recognised'
    : place
      ? `Within ${RADIUS_KM} km of ${place.name}`
      : searchFocused
        ? 'Try a town, postcode or landmark'
        : `Shows routes passing within ${RADIUS_KM} km`;

  const searchPoint = useMemo<[number, number] | null>(
    () => (place ? [place.lng, place.lat] : null),
    [place]
  );

  const hovered =
    !selectedId && hoverId
      ? (routes.find((r) => r.id === hoverId) ?? null)
      : null;

  const backLabel = matches
    ? matches.length === 1
      ? 'Back to results'
      : `Back to ${matches.length} results`
    : 'Back to all routes';

  const prevSelForAnnounce = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelForAnnounce.current;
    if (selectedId && selectedId !== prev) {
      const r = routes.find((x) => x.id === selectedId);
      if (r)
        setAnnounce(`${r.name}. ${r.distance_km} km. Other routes dimmed.`);
    } else if (!selectedId && prev) {
      setAnnounce(
        matches
          ? `Back to ${matches.length} results within ${RADIUS_KM} km of ${place?.name ?? ''}.`
          : 'Back to all routes.'
      );
    }
    prevSelForAnnounce.current = selectedId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const snapBeforeSelect = useRef<Snap>('peek');
  const prevSelForSnap = useRef<string | null>(null);
  useEffect(() => {
    if (!isDesktop) {
      const prev = prevSelForSnap.current;
      if (selectedId && !prev) {
        snapBeforeSelect.current =
          snapRef.current === 'detail' ? 'peek' : snapRef.current;
        setSnap('detail');
      } else if (!selectedId && prev) {
        setSnap(snapBeforeSelect.current);
      }
    }
    prevSelForSnap.current = selectedId;
  }, [selectedId, isDesktop]);

  useEffect(() => {
    if (isDesktop) return;
    // A search resolving takes over the sheet — leave the filter view for results.
    if (matches || geoFail) {
      setMobileFiltersOpen(false);
      setSnap('mid');
    }
  }, [matches, geoFail, isDesktop]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const sortControl = (
    <SortMenu
      value={sortState.sort}
      hasSearch={!!place}
      hasElevation={hasElevation}
      onPick={pickSort}
    />
  );

  const filterBodyProps = {
    // draft-aware, so a mid-drag handle position shows immediately
    filters: displayFilters,
    domains,
    countyChips,
    countryChips,
    elevationEnabled: hasElevation,
    onToggleCounty: toggleCounty,
    onToggleCountry: toggleCountry,
    onDistanceChange: previewDistance,
    onDistanceCommit: commitDistance,
    onElevationChange: previewElevation,
    onElevationCommit: commitElevation,
  };

  const filterPanel = initialised ? (
    <FilterPanel
      {...filterBodyProps}
      activeCount={activeCount}
      matchCount={previewPoolCount}
      totalCount={routes.length}
      onClearAll={clearFilters}
    />
  ) : null;

  const snapBeforeFilters = useRef<Snap>('peek');
  const openMobileFilters = () => {
    snapBeforeFilters.current = snap === 'detail' ? 'peek' : snap;
    setMobileFiltersOpen(true);
    setSnap('mid');
  };
  const closeMobileFilters = () => {
    setMobileFiltersOpen(false);
    setSnap(snapBeforeFilters.current);
  };

  return (
    <div className={isDesktop ? 'flex h-screen' : 'relative h-dvh w-full'}>
      {isDesktop && (
        <Sidebar
          query={query}
          hint={hint}
          banner={displayBanner}
          placeLabel={place?.name ?? ''}
          groups={groups}
          selectedId={selectedId}
          backLabel={backLabel}
          theme={theme}
          filterPanel={filterPanel}
          countLine={countLineText}
          sortControl={sortControl}
          flat={flat}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
          filterEmpty={filterEmpty}
          onQueryChange={setQuery}
          onSubmit={(v) => void runSearch(v)}
          onClear={clearSearch}
          onSelect={onSelect}
          onDeselect={onDeselect}
          onHover={onHover}
          onToggleTheme={toggleTheme}
          onSearchFocusChange={setSearchFocused}
        />
      )}

      <div className={isDesktop ? 'relative flex-1' : 'absolute inset-0'}>
        <RouteMap
          routes={pool}
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
          onDeselect={onDeselect}
        />

        <BasemapControl
          basemap={basemap}
          theme={theme}
          onChange={setBasemap}
          mobile={!isDesktop}
          bottomCss={isDesktop ? undefined : `${snapHeights(vh)[snap] + 12}px`}
        />

        <div
          className={`absolute z-[500] flex items-center gap-1.5 md:left-5 max-md:inset-x-0 max-md:overflow-x-auto max-md:px-5 ${
            selectedId ? 'top-5 max-md:hidden' : 'top-[68px]'
          }`}
        >
          {/* Mobile only: the Filters pill leads the chip row (it's the one chip
              that isn't a POI toggle). Filled + counted when active; opens the
              sheet's filter view (§G/§F). Desktop uses the disclosure panel. */}
          {!isDesktop && initialised && (
            <button
              type="button"
              onClick={openMobileFilters}
              aria-label="Filters"
              className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-semibold ${
                activeCount > 0
                  ? 'border-sel bg-sel text-white dark:text-bg'
                  : 'border-line bg-surface text-text'
              }`}
            >
              Filters
              {activeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/30 px-1 font-mono text-[10px]">
                  {activeCount}
                </span>
              )}
            </button>
          )}
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
                className={`flex flex-none items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
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

        {!selectedId && (
          <Legend
            searching={searchPoint !== null}
            theme={theme}
            className="max-md:top-[112px]"
          />
        )}

        {hovered && (
          <div
            aria-hidden="true"
            className="absolute right-5 top-5 z-[500] flex w-[250px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3.5 max-md:hidden"
          >
            <span className="text-[14px] font-medium text-text">
              {hovered.name}
            </span>
            <span className="font-mono text-[12px] text-text-2">
              {hovered.distance_km} km
              {hovered.region ? ` · ${hovered.region}` : ''}
            </span>
            <span className="text-[12px] text-muted">
              {SOURCE_META[hovered.source].blurb}
            </span>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {geoFail
            ? `Couldn't find “${query}”. Try a town, village or landmark.`
            : displayBanner === 'nomatch'
              ? `No routes within ${RADIUS_KM} km of ${place?.name ?? query}`
              : matches
                ? `${matches.length} routes within ${RADIUS_KM} km of ${place?.name ?? ''}`
                : ''}
        </span>

        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>

      {!isDesktop && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="absolute inset-x-3 top-3 z-[600] flex items-center gap-2"
          >
            <SearchField
              query={query}
              onQueryChange={setQuery}
              onClear={clearSearch}
              onFocusChange={setSearchFocused}
              ariaLabel="Find routes near a place"
              className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-within:border-sel"
            />
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              aria-label={
                theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              onClick={toggleTheme}
              className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-line bg-surface text-[15px] text-text-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀︎' : '☾'}</span>
            </button>
          </form>

          <BottomSheet
            snap={snap}
            snaps={snaps}
            vh={vh}
            // The filter form pins a "Show N routes" footer to its foot; cap the
            // content to the visible window so that footer stays on-screen at
            // every snap instead of below the 100dvh sheet's fold (TB-66).
            constrainToSnap={mobileFiltersOpen && initialised}
            onSnapChange={setSnap}
          >
            {mobileFiltersOpen && initialised ? (
              <MobileFilterSheet
                {...filterBodyProps}
                // what the list will actually show on commit: the searched matches
                // when a search is active, else the filtered pool.
                matchCount={matches?.length ?? previewPoolCount}
                onClearAll={clearFilters}
                onDone={closeMobileFilters}
              />
            ) : (
              <RouteList
                query={query}
                banner={displayBanner}
                placeLabel={place?.name ?? ''}
                groups={groups}
                selectedId={selectedId}
                backLabel={backLabel}
                theme={theme}
                countLine={countLineText}
                sortControl={sortControl}
                flat={flat}
                openGroups={openGroups}
                onToggleGroup={toggleGroup}
                filterEmpty={filterEmpty}
                mapAttribution={BASEMAPS[basemap].credit}
                onClear={clearSearch}
                onSelect={onSelect}
                onDeselect={onDeselect}
                onHover={onHover}
              />
            )}
          </BottomSheet>
        </>
      )}
    </div>
  );
}
