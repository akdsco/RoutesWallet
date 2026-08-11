import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { Route } from '../types.ts';
import { routeThumbnail } from '../lib/thumbnail.ts';
import { nextRouteId, type NavKey } from '../lib/list-nav.ts';
import { RouteDetail } from './RouteDetail.tsx';
import { SourceBadge } from './SourceBadge.tsx';

export type CardVM = { route: Route; nearKm?: number };
export type GroupVM = { label: string; count: number; items: CardVM[] };
export type Banner = 'none' | 'loading' | 'empty' | 'geofail' | 'nomatch';

type Props = {
  query: string;
  banner: Banner;
  placeLabel: string;
  groups: GroupVM[];
  selectedId: string | null;
  /** Label for the detail panel's back row, e.g. "Back to 21 results". */
  backLabel: string;
  theme: 'light' | 'dark';
  /** Plain-text credit for the ACTIVE basemap — shown at the list end on mobile,
   *  where the on-map Leaflet attribution is hidden behind the sheet (§F). Omit on
   *  desktop (the Leaflet control carries it there). */
  mapAttribution?: string;
  onClear: () => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onHover: (id: string | null) => void;
};

const NAV_KEYS = new Set<string>(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * The scrollable body shared by the desktop sidebar and the mobile sheet: the
 * route list, or — when a route is selected — the RouteDetail panel that replaces
 * it (§E). Owns list keyboard-nav (roving tabindex) and the list ↔ detail focus
 * handoff. Presentation only; all state lives in App.
 */
export function RouteList({
  query,
  banner,
  placeLabel,
  groups,
  selectedId,
  backLabel,
  theme,
  mapAttribution,
  onClear,
  onSelect,
  onDeselect,
  onHover,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const scrollTopRef = useRef(0);

  const orderedIds = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.route.id)),
    [groups]
  );

  // The selected route's detail replaces the list. Derive its data from the
  // current groups (the selected route is always in the visible set).
  const selectedItem = useMemo(
    () =>
      selectedId
        ? (groups
            .flatMap((g) => g.items)
            .find((i) => i.route.id === selectedId) ?? null)
        : null,
    [groups, selectedId]
  );

  // Roving tabindex: Tab enters the list once, arrows move focus within it. The
  // card holding focus (or the first, before any) is the single tab stop.
  const [rovingId, setRovingId] = useState<string | null>(null);
  const effectiveRoving =
    rovingId && orderedIds.includes(rovingId)
      ? rovingId
      : (orderedIds[0] ?? null);

  // Focus handoff across the list ↔ detail swap: entering focuses the back row,
  // leaving restores the list scroll and returns focus to that route's card so
  // arrow nav resumes where it left off.
  const prevSelRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelRef.current;
    if (selectedId && !prev) {
      backRef.current?.focus();
    } else if (!selectedId && prev) {
      if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-route-id="${prev}"]`)
        ?.focus();
    }
    prevSelRef.current = selectedId;
  }, [selectedId]);

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!NAV_KEYS.has(e.key)) return; // Enter/Space activate on the card itself
    e.preventDefault(); // don't let ↑/↓ also scroll the panel
    const focused = (
      document.activeElement as HTMLElement | null
    )?.closest<HTMLElement>('[data-route-id]');
    const currentId = focused?.dataset.routeId ?? effectiveRoving;
    const target = nextRouteId(orderedIds, currentId, e.key as NavKey);
    if (!target) return;
    // Move focus only — selection (opening the detail) is Enter/Space/click.
    // Focus fires onFocus → onHover, which mirrors the highlight on the map.
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-route-id="${target}"]`
    );
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }

  if (selectedItem) {
    return (
      <RouteDetail
        route={selectedItem.route}
        nearKm={selectedItem.nearKm}
        backLabel={backLabel}
        backRef={backRef}
        theme={theme}
        onBack={onDeselect}
      />
    );
  }

  return (
    <div
      ref={listRef}
      onKeyDown={onListKeyDown}
      onScroll={(e) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
      }}
      className="flex-1 overflow-y-auto"
      role="group"
      aria-label="Routes"
    >
      {banner === 'loading' && (
        <div className="py-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-6 py-4">
              <div className="h-9 w-[52px] rounded bg-surface-2" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-[11px] w-[62%] rounded-sm bg-surface-2" />
                <div className="h-[9px] w-[38%] rounded-sm bg-line-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {banner === 'geofail' && (
        <Notice warn onClear={onClear} title="Couldn’t find that place">
          We looked up “{query}” and got nothing back. Try a town, village or
          landmark.
        </Notice>
      )}

      {banner === 'nomatch' && (
        <Notice
          onClear={onClear}
          title={`No routes within 25 km of ${placeLabel}`}
        >
          The club hasn’t logged anything out there yet.
        </Notice>
      )}

      {banner === 'empty' && (
        <Notice title="No routes yet">
          Once the club’s GPX files are published they’ll appear here.
        </Notice>
      )}

      {banner === 'none' &&
        groups.map((g) => (
          <div key={g.label}>
            <div className="sticky top-0 z-[2] flex items-baseline justify-between border-b border-line-2 bg-surface px-6 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
                {g.label}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {g.count}
              </span>
            </div>
            {g.items.map(({ route: r, nearKm }) => (
              <RouteCard
                key={r.id}
                route={r}
                nearKm={nearKm}
                tabIndex={r.id === effectiveRoving ? 0 : -1}
                onSelect={onSelect}
                onFocusCard={(id) => {
                  setRovingId(id);
                  onHover(id);
                }}
                onHover={onHover}
              />
            ))}
          </div>
        ))}

      {/* Attribution rides the list end on mobile (§F): the on-map Leaflet
          control is hidden behind the sheet there. Shown in every list state
          (not just the populated one); in the detail view the always-present
          basemap popover carries the per-style credit. Desktop keeps the Leaflet
          control (this is md:hidden and only passed on mobile). */}
      {mapAttribution && (
        <p className="px-6 py-3 text-[11px] text-muted md:hidden">
          {mapAttribution}
        </p>
      )}
    </div>
  );
}

function Notice({
  title,
  warn,
  onClear,
  children,
}: {
  title: string;
  warn?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`m-6 flex flex-col gap-2 rounded-md border border-line bg-surface-2 p-4 ${
        warn ? 'border-l-[3px] border-l-marker' : ''
      }`}
    >
      <strong className="text-[13px] font-semibold text-text">{title}</strong>
      <span className="text-[13px] leading-normal text-text-2">{children}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-0.5 self-start rounded-md border border-line bg-surface px-3 py-[7px] text-[12px] font-medium text-text hover:bg-surface-2"
        >
          Show all routes
        </button>
      )}
    </div>
  );
}

function RouteCard({
  route: r,
  nearKm,
  tabIndex,
  onSelect,
  onFocusCard,
  onHover,
}: {
  route: Route;
  nearKm?: number;
  tabIndex: number;
  onSelect: (id: string) => void;
  onFocusCard: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const select = () => onSelect(r.id);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  };
  return (
    <div
      role="button"
      tabIndex={tabIndex}
      data-route-id={r.id}
      onClick={select}
      onKeyDown={onKey}
      onFocus={() => onFocusCard(r.id)}
      onBlur={() => onHover(null)}
      onMouseEnter={() => onHover(r.id)}
      onMouseLeave={() => onHover(null)}
      className="flex cursor-pointer items-start gap-3.5 border-b border-line-2 px-6 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sel"
    >
      <svg
        width="52"
        height="36"
        viewBox="0 0 52 36"
        aria-hidden="true"
        className="mt-0.5 flex-none"
      >
        <rect
          x="0.5"
          y="0.5"
          width="51"
          height="35"
          rx="3"
          fill="none"
          stroke="var(--line)"
        />
        <polyline
          points={routeThumbnail(r.geometry.coordinates)}
          fill="none"
          stroke="var(--thumb)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium tracking-[-0.005em] text-text">
            {r.name}
          </span>
          <span className="flex-none whitespace-nowrap font-mono text-[12px] text-text-2">
            {r.distance_km} km
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={r.source} />
          <span className="text-[12px] text-muted">{r.region}</span>
          {nearKm != null && (
            <span className="text-[12px] text-muted">
              · {nearKm.toFixed(1)} km away
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
