import {
  useMemo,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { Route } from '../types.ts';
import { routeThumbnail } from '../lib/thumbnail.ts';
import { openLabel } from '../lib/links.ts';
import { safeHref } from '../lib/sanitize.ts';
import { SOURCE_META } from '../lib/source.ts';
import { nextRouteId, type NavKey } from '../lib/list-nav.ts';

export type CardVM = { route: Route; nearKm?: number };
export type GroupVM = { label: string; count: number; items: CardVM[] };
export type Banner = 'none' | 'loading' | 'empty' | 'geofail' | 'nomatch';

type Props = {
  totalCount: number;
  query: string;
  hint: string;
  banner: Banner;
  placeLabel: string;
  groups: GroupVM[];
  selectedId: string | null;
  theme: 'light' | 'dark';
  onQueryChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onToggleTheme: () => void;
  onSearchFocusChange: (focused: boolean) => void;
};

const NAV_KEYS = new Set<string>(['ArrowDown', 'ArrowUp', 'Home', 'End']);

const badgeBase =
  'inline-flex items-center gap-1.5 rounded-[3px] px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]';

export function Sidebar(props: Props) {
  const {
    totalCount,
    query,
    hint,
    banner,
    placeLabel,
    groups,
    selectedId,
    theme,
    onQueryChange,
    onSubmit,
    onClear,
    onSelect,
    onHover,
    onToggleTheme,
    onSearchFocusChange,
  } = props;

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(query);
  }

  // Route ids in render order — the axis ↑/↓/Home/End walk. The card whose id
  // this resolves to is the list's single Tab stop (roving tabindex), so Tab
  // enters the list once and the arrows move within it.
  const listRef = useRef<HTMLDivElement>(null);
  const orderedIds = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.route.id)),
    [groups]
  );
  const activeId = selectedId ?? orderedIds[0] ?? null;

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!NAV_KEYS.has(e.key)) return; // Enter/Space handled per-card
    e.preventDefault(); // don't let ↑/↓ also scroll the panel
    // Move relative to the focused card, not selectedId — on entry the first
    // card holds focus before anything is selected.
    const focused = (
      document.activeElement as HTMLElement | null
    )?.closest<HTMLElement>('[data-route-id]');
    const currentId = focused?.dataset.routeId ?? selectedId;
    const target = nextRouteId(orderedIds, currentId, e.key as NavKey);
    if (!target) return;
    onSelect(target);
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-route-id="${target}"]`
    );
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <aside className="flex h-full w-[392px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex flex-col gap-4 border-b border-line px-6 pb-4 pt-[22px]">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-text">
              Hub Velo
            </span>
            <span className="text-[13px] text-muted">routes</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted">
              {totalCount} routes
            </span>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              aria-label={
                theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-[13px] text-text-2 hover:bg-surface-2"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀︎' : '☾'}</span>
            </button>
          </div>
        </div>

        <form className="flex flex-col gap-2" onSubmit={submit}>
          <label htmlFor="q" className="text-[12px] font-medium text-text-2">
            Find routes near a place
          </label>
          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-sel">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="7"
                cy="7"
                r="4.6"
                stroke="var(--muted)"
                strokeWidth="1.6"
              />
              <line
                x1="10.6"
                y1="10.6"
                x2="14"
                y2="14"
                stroke="var(--muted)"
                strokeWidth="1.6"
              />
            </svg>
            <input
              id="q"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => onSearchFocusChange(true)}
              onBlur={() => onSearchFocusChange(false)}
              placeholder="e.g. Box Hill or EN11"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-muted"
            />
            {query.length > 0 && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={onClear}
                className="-mr-1 flex h-11 w-8 items-center justify-center text-[15px] text-muted hover:text-text"
              >
                ×
              </button>
            )}
          </div>
          <span className="min-h-4 text-[12px] text-muted">{hint}</span>
        </form>
      </div>

      <div
        ref={listRef}
        onKeyDown={onListKeyDown}
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
                  selected={r.id === selectedId}
                  tabIndex={r.id === activeId ? 0 : -1}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              ))}
            </div>
          ))}
      </div>
    </aside>
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
  selected,
  tabIndex,
  onSelect,
  onHover,
}: {
  route: Route;
  nearKm?: number;
  selected: boolean;
  tabIndex: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const badge =
    r.source === 'club-verified'
      ? { cls: 'border border-trust bg-trust-soft text-trust', glyph: '✓ ' }
      : r.source === 'club-member'
        ? { cls: 'border border-trust text-trust', glyph: '' }
        : { cls: 'border border-dashed border-muted text-muted', glyph: '' };
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
      aria-pressed={selected}
      tabIndex={tabIndex}
      data-route-id={r.id}
      data-sel={selected}
      onClick={select}
      onKeyDown={onKey}
      onMouseEnter={() => onHover(r.id)}
      onMouseLeave={() => onHover(null)}
      className="flex cursor-pointer items-start gap-3.5 border-b border-line-2 px-6 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sel data-[sel=true]:bg-sel-soft data-[sel=true]:shadow-[inset_3px_0_0_var(--sel)]"
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
          <span className={`${badgeBase} ${badge.cls}`}>
            {badge.glyph}
            {SOURCE_META[r.source].label}
          </span>
          <span className="text-[12px] text-muted">{r.region}</span>
          {nearKm != null && (
            <span className="text-[12px] text-muted">
              · {nearKm.toFixed(1)} km away
            </span>
          )}
        </div>
        {selected && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <a
              href={safeHref(r.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-sel px-3 py-[7px] text-[12px] font-medium text-white"
            >
              {openLabel(r.link)} ↗
            </a>
            {r.cafe && (
              <span className="text-[12px] text-muted">☕ {r.cafe}</span>
            )}
            {r.notes && (
              <span className="text-[12px] leading-snug text-muted">
                {r.notes}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
