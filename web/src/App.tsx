import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { RouteMap } from './components/RouteMap.tsx';
import { Legend } from './components/Legend.tsx';
import { BasemapControl } from './components/BasemapControl.tsx';
import { Sidebar, type Banner, type GroupVM } from './components/Sidebar.tsx';
import { SearchField } from './components/SearchField.tsx';
import { RouteList } from './components/RouteList.tsx';
import { BottomSheet } from './components/BottomSheet.tsx';
import { useMediaQuery } from './lib/useMediaQuery.ts';
import { useViewportHeight } from './lib/useViewportHeight.ts';
import { snapsFor, snapHeights, type Snap } from './lib/sheet.ts';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { routesNear } from './lib/search.ts';
import { groupByRegion } from './lib/grouping.ts';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [announce, setAnnounce] = useState('');
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

  // Below 768px the sidebar splits: the search floats over a full-screen map and
  // the list/detail live in a draggable bottom sheet (Claude Design §F).
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const vh = useViewportHeight();
  const [snap, setSnap] = useState<Snap>('peek');
  const snapRef = useRef<Snap>(snap);
  snapRef.current = snap;
  // Selecting a route floors the sheet at `detail` (peek unreachable); idle/search
  // rest at peek. See snapsFor().
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
      .catch(() => setBanner('empty'))
      .finally(() => setLoading(false));
  }, []);

  const onHover = useCallback((id: string | null) => setHoverId(id), []);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const onDeselect = useCallback(() => setSelectedId(null), []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setPlace(null);
    setMatches(null);
    setNearKm(new Map());
    setBanner('none');
    setSelectedId(null);
  }, []);

  // Esc exits the selected route from anywhere — except inside the search field,
  // where the innermost layer wins: it clears the search (query + results), so
  // the user is never stranded in a filtered view with no visible reset (§E).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.activeElement?.id === 'q') {
        if (query || matches) {
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
  }, [selectedId, query, matches, clearSearch]);

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

  // Memoized so the reference only changes when the searched place does — NOT on
  // every App re-render (e.g. a hover). RouteMap's fit-to-matches effect keys on
  // this; an unstable array made it re-fit on any re-render, so zooming in after a
  // search snapped the view back to the search extent (TB-52). Stable ref = fit
  // once when the search resolves, then free zoom/pan.
  const searchPoint = useMemo<[number, number] | null>(
    () => (place ? [place.lng, place.lat] : null),
    [place]
  );

  // The top-right card is hover-preview only, and suppressed while a route is
  // selected (the sidebar detail panel is the detail surface then, and the map
  // highlight is locked to the selection).
  const hovered =
    !selectedId && hoverId
      ? (routes.find((r) => r.id === hoverId) ?? null)
      : null;

  // Back-row copy names where exit returns to (design §E copy table).
  const backLabel = matches
    ? matches.length === 1
      ? 'Back to results'
      : `Back to ${matches.length} results`
    : 'Back to all routes';

  // Announce entering/leaving the selected route (§E copy). Reads matches/place
  // at fire time — the selectedId change re-renders with current values.
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

  // Mobile sheet choreography (§F). Selecting → the detail snap; on exit, restore the
  // snap the user had before selecting. A resolved search → mid so the answer
  // (incl. "no matches") is visible without a gesture.
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

  // Keyed on the search result only, NOT selectedId — a search always clears the
  // selection first (runSearch), so when this fires selectedId is already null.
  // Listing selectedId here would re-run it on *deselect* and clobber the
  // choreography effect's snap-restore (it would force mid over the prior snap).
  useEffect(() => {
    if (isDesktop) return;
    // A no-match search sets matches to [] (truthy), so `matches` already covers
    // it; only a geocode failure (matches → null) needs its own term.
    if (matches || banner === 'geofail') setSnap('mid');
  }, [matches, banner, isDesktop]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={isDesktop ? 'flex h-screen' : 'relative h-dvh w-full'}>
      {isDesktop && (
        <Sidebar
          totalCount={routes.length}
          query={query}
          hint={hint}
          banner={displayBanner}
          placeLabel={place?.name ?? ''}
          groups={groups}
          selectedId={selectedId}
          backLabel={backLabel}
          theme={theme}
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
          onDeselect={onDeselect}
        />

        {/* Basemap switcher: bottom-right popover on desktop (spec C); on mobile a
            44px layers button, bottom-left, riding 12px above the sheet's current
            top edge (§F) — positioned in px from the same viewport height the sheet
            uses, so the two never detach when the URL bar shows. The popover flips
            to open downward (over the sheet, z above it) when the button rides near
            the top at the full snap. */}
        <BasemapControl
          basemap={basemap}
          theme={theme}
          onChange={setBasemap}
          mobile={!isDesktop}
          bottomCss={isDesktop ? undefined : `${snapHeights(vh)[snap] + 12}px`}
        />

        {/* POI chips: below the legend normally; slide up in desktop preview mode
            (legend hidden). On mobile they sit below the floating search bar as a
            full-width, horizontally-scrolling row (§F) so the 4th chip never spills
            off the page — and are hidden entirely while a route is selected. */}
        <div
          className={`absolute z-[500] flex items-center gap-1.5 md:left-5 max-md:inset-x-0 max-md:overflow-x-auto max-md:px-5 ${
            selectedId ? 'top-5 max-md:hidden' : 'top-[68px]'
          }`}
        >
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

        {/* Hidden in route-preview mode: the dimmed map + detail panel already
            say "you're focused on one route", so the legend is just noise. */}
        {!selectedId && (
          <Legend
            searching={searchPoint !== null}
            theme={theme}
            className="max-md:top-[112px]"
          />
        )}

        {/* Visual hover/focus preview only — aria-hidden so keyboard list nav
            (which mirrors the highlight here via focus) isn't double-announced
            on top of each card's own name. Cut on mobile (no hover; §F). */}
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
          {banner === 'geofail'
            ? `Couldn't find “${query}”. Try a town, village or landmark.`
            : banner === 'nomatch'
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
          {/* Floating search bar over the map — present at every snap and in
              every mode (§F). The theme toggle rides beside the field: it governs
              the whole interface, so it belongs in chrome, not on the map. */}
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

          <BottomSheet snap={snap} snaps={snaps} vh={vh} onSnapChange={setSnap}>
            <RouteList
              query={query}
              banner={displayBanner}
              placeLabel={place?.name ?? ''}
              groups={groups}
              selectedId={selectedId}
              backLabel={backLabel}
              theme={theme}
              mapAttribution={BASEMAPS[basemap].credit}
              onClear={clearSearch}
              onSelect={onSelect}
              onDeselect={onDeselect}
              onHover={onHover}
            />
          </BottomSheet>
        </>
      )}
    </div>
  );
}
