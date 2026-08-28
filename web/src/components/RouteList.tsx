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
import { formatGain } from '../lib/format.ts';
import { cssEscape } from '../lib/css.ts';
import { nextRouteId, type NavKey } from '../lib/list-nav.ts';
import {
  buildNavRows,
  groupNav,
  type NavRow,
  type NavTarget,
} from '../lib/group-nav.ts';
import { contributorName } from '../lib/contributor.ts';
import { RouteDetail } from './RouteDetail.tsx';
import { SourceBadge } from './SourceBadge.tsx';

export type CardVM = { route: Route; nearKm?: number };
export type GroupVM = { label: string; count: number; items: CardVM[] };
export type Banner = 'none' | 'loading' | 'empty' | 'geofail' | 'nomatch';

/** Filter-empty state: shown when active filters exclude every route (§G). */
export type FilterEmpty = {
  /** e.g. "Widening the distance range would add 12 routes." */
  detail: string;
  onClearAll: () => void;
  /** Present only when widening distance would actually help. */
  onWiden?: () => void;
};

type Props = {
  query: string;
  banner: Banner;
  placeLabel: string;
  groups: GroupVM[];
  selectedId: string | null;
  backLabel: string;
  theme: 'light' | 'dark';
  mapAttribution?: string;
  /** Count-line phrasing (§G), e.g. "34 of 96 routes". */
  countLine?: string;
  /** The sort control (App owns sort state); rendered on the count row. */
  sortControl?: ReactNode;
  /** Nearest-first suspends grouping → one flat list with no headers. */
  flat?: boolean;
  /** Open county groups (ignored when `flat`). Defaults to all open. */
  openGroups?: ReadonlySet<string>;
  onToggleGroup?: (county: string) => void;
  /** Non-null when filters exclude everything. */
  filterEmpty?: FilterEmpty | null;
  onClear: () => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onHover: (id: string | null) => void;
};

const CARD_NAV = new Set<string>(['ArrowDown', 'ArrowUp', 'Home', 'End']);
const GROUP_NAV = new Set<string>([
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * The scrollable body shared by the desktop sidebar and the mobile sheet: the
 * grouped route list, or — when a route is selected — the RouteDetail panel that
 * replaces it (§E). Owns the foldable county groups, the count/sort row, the
 * filter-empty state, and roving-tabindex keyboard nav over headers + cards
 * (§G/§D). Presentation only; all state lives in App.
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
  countLine,
  sortControl,
  flat = false,
  openGroups,
  onToggleGroup,
  filterEmpty,
  onClear,
  onSelect,
  onDeselect,
  onHover,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const scrollTopRef = useRef(0);

  const grouped = !flat;
  // Open set governs which groups show cards; a missing prop = everything open.
  const isOpen = (label: string) =>
    !grouped || (openGroups?.has(label) ?? true);

  const orderedIds = useMemo(
    () =>
      groups.flatMap((g) =>
        isOpen(g.label) ? g.items.map((i) => i.route.id) : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, openGroups, grouped]
  );

  const navRows = useMemo<NavRow[]>(
    () =>
      grouped
        ? buildNavRows(
            groups.map((g) => ({
              label: g.label,
              itemIds: g.items.map((i) => i.route.id),
            })),
            new Set(groups.filter((g) => isOpen(g.label)).map((g) => g.label))
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, openGroups, grouped]
  );

  const selectedItem = useMemo(
    () =>
      selectedId
        ? (groups
            .flatMap((g) => g.items)
            .find((i) => i.route.id === selectedId) ?? null)
        : null,
    [groups, selectedId]
  );

  // Roving tabindex over the visible rows (headers + cards). One tab stop.
  const rowKeys = grouped
    ? navRows.map((r) => (r.kind === 'header' ? `h:${r.county}` : `c:${r.id}`))
    : orderedIds.map((id) => `c:${id}`);
  const [rovingKey, setRovingKey] = useState<string | null>(null);
  const effectiveRoving =
    rovingKey && rowKeys.includes(rovingKey) ? rovingKey : (rowKeys[0] ?? null);

  // Focus handoff across the list ↔ detail swap (§E).
  const prevSelRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelRef.current;
    if (selectedId && !prev) {
      backRef.current?.focus();
    } else if (!selectedId && prev) {
      if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-route-id="${cssEscape(prev)}"]`)
        ?.focus();
    }
    prevSelRef.current = selectedId;
  }, [selectedId]);

  function focusRow(key: string) {
    const val = key.slice(2);
    const sel =
      key[0] === 'h'
        ? `[data-group-id="${cssEscape(val)}"]`
        : `[data-route-id="${cssEscape(val)}"]`;
    const el = listRef.current?.querySelector<HTMLElement>(sel);
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }

  function currentTarget(): NavTarget | null {
    const active = document.activeElement as HTMLElement | null;
    const card = active?.closest<HTMLElement>('[data-route-id]');
    if (card?.dataset.routeId)
      return { kind: 'card', id: card.dataset.routeId };
    const header = active?.closest<HTMLElement>('[data-group-id]');
    if (header?.dataset.groupId)
      return { kind: 'header', county: header.dataset.groupId };
    if (!effectiveRoving) return null;
    const val = effectiveRoving.slice(2);
    return effectiveRoving[0] === 'h'
      ? { kind: 'header', county: val }
      : { kind: 'card', id: val };
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (grouped) {
      if (!GROUP_NAV.has(e.key)) return; // Enter/Space handled on the row itself
      const res = groupNav(navRows, currentTarget(), e.key);
      if (!res) return;
      e.preventDefault();
      if (res.type === 'fold') {
        onToggleGroup?.(res.county); // header keeps focus across the re-render
      } else {
        focusRow(
          res.target.kind === 'header'
            ? `h:${res.target.county}`
            : `c:${res.target.id}`
        );
      }
      return;
    }
    // Flat list (nearest-first): vertical card nav only.
    if (!CARD_NAV.has(e.key)) return;
    e.preventDefault();
    const focused = (
      document.activeElement as HTMLElement | null
    )?.closest<HTMLElement>('[data-route-id]');
    const currentId =
      focused?.dataset.routeId ??
      (effectiveRoving?.[0] === 'c' ? effectiveRoving.slice(2) : null);
    const target = nextRouteId(orderedIds, currentId, e.key as NavKey);
    if (target) focusRow(`c:${target}`);
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

  const showCountRow = banner === 'none' && (countLine || sortControl);

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
      {showCountRow && (
        <div className="flex items-center justify-between border-b border-line-2 px-6 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
            {countLine}
          </span>
          {sortControl}
        </div>
      )}

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
        (groups.length === 0 && filterEmpty ? (
          <FilterEmptyState empty={filterEmpty} />
        ) : flat ? (
          <div>
            {groups.flatMap((g) =>
              g.items.map(({ route: r, nearKm }) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  nearKm={nearKm}
                  tabIndex={`c:${r.id}` === effectiveRoving ? 0 : -1}
                  onSelect={onSelect}
                  onFocusCard={(id) => {
                    setRovingKey(`c:${id}`);
                    onHover(id);
                  }}
                  onHover={onHover}
                />
              ))
            )}
          </div>
        ) : (
          groups.map((g, gi) => {
            const open = isOpen(g.label);
            const bodyId = `rw-group-${gi}`;
            return (
              <div key={g.label}>
                <button
                  type="button"
                  data-group-id={g.label}
                  aria-expanded={open}
                  aria-controls={bodyId}
                  tabIndex={`h:${g.label}` === effectiveRoving ? 0 : -1}
                  onFocus={() => setRovingKey(`h:${g.label}`)}
                  onClick={() => onToggleGroup?.(g.label)}
                  className="sticky top-0 z-[2] flex w-full items-center gap-2.5 border-b border-line-2 bg-surface-2 px-6 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sel"
                >
                  <svg
                    viewBox="0 0 12 12"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`flex-none transition-transform ${open ? '' : '-rotate-90'} ${open ? 'text-text-2' : 'text-muted'}`}
                  >
                    <polyline points="2.5,4.5 6,8 9.5,4.5" />
                  </svg>
                  <span
                    className={`font-mono text-[10.5px] uppercase tracking-[0.09em] ${open ? 'text-text-2' : 'text-muted'}`}
                  >
                    {g.label}
                  </span>
                  <span className="ml-auto font-mono text-[10.5px] text-muted">
                    {g.count}
                  </span>
                </button>
                {open && (
                  <div id={bodyId}>
                    {g.items.map(({ route: r, nearKm }) => (
                      <RouteCard
                        key={r.id}
                        route={r}
                        nearKm={nearKm}
                        tabIndex={`c:${r.id}` === effectiveRoving ? 0 : -1}
                        onSelect={onSelect}
                        onFocusCard={(id) => {
                          setRovingKey(`c:${id}`);
                          onHover(id);
                        }}
                        onHover={onHover}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ))}

      {mapAttribution && (
        <p className="px-6 py-3 text-[11px] text-muted md:hidden">
          {mapAttribution}
        </p>
      )}
    </div>
  );
}

function FilterEmptyState({ empty }: { empty: FilterEmpty }) {
  return (
    <div className="flex flex-col items-start gap-2.5 px-6 pb-[30px] pt-7">
      <strong className="text-[14px] font-semibold text-text">
        No routes match these filters
      </strong>
      <span className="text-[12.5px] leading-normal text-text-2">
        {empty.detail}
      </span>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={empty.onClearAll}
          className="h-[34px] rounded-lg bg-sel px-[13px] text-[12.5px] font-semibold text-white dark:text-bg"
        >
          Clear all filters
        </button>
        {empty.onWiden && (
          <button
            type="button"
            onClick={empty.onWiden}
            className="h-[34px] rounded-lg border border-line px-[13px] text-[12.5px] font-medium text-text-2"
          >
            Widen distance
          </button>
        )}
      </div>
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
  const gain = formatGain(r.elevation_gain_m);
  const owner = contributorName(r.owner_name);
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
            {/* §H: total climb paired with distance, mono; muted so distance leads.
                The · and ◺ are decorative — AT hears "climb" instead. */}
            {gain && (
              <span className="text-muted">
                <span aria-hidden="true"> · ◺ </span>
                <span className="sr-only">climb </span>
                {gain}
              </span>
            )}
          </span>
        </div>
        {owner && (
          <span className="truncate text-[12px] text-muted">by {owner}</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={r.source} />
          {r.region && (
            <span className="text-[12px] text-muted">{r.region}</span>
          )}
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
