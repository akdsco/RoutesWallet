import { type FormEvent } from 'react';
import { SearchField } from './SearchField.tsx';
import { RouteList } from './RouteList.tsx';

// Re-exported so existing importers (App, tests) keep their `from './Sidebar'`.
export type { CardVM, GroupVM, Banner } from './RouteList.tsx';
import type { Banner, GroupVM } from './RouteList.tsx';

type Props = {
  totalCount: number;
  query: string;
  hint: string;
  banner: Banner;
  placeLabel: string;
  groups: GroupVM[];
  selectedId: string | null;
  /** Label for the detail panel's back row, e.g. "Back to 21 results". */
  backLabel: string;
  theme: 'light' | 'dark';
  onQueryChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onHover: (id: string | null) => void;
  onToggleTheme: () => void;
  onSearchFocusChange: (focused: boolean) => void;
};

/**
 * The desktop sidebar: a fixed 392px column — search header (hidden while a route
 * is selected) over the shared RouteList (which swaps to the detail panel). On
 * mobile the same two pieces split apart: SearchField floats over the map and
 * RouteList lives in the bottom sheet (see App).
 */
export function Sidebar(props: Props) {
  const {
    totalCount,
    query,
    hint,
    banner,
    placeLabel,
    groups,
    selectedId,
    backLabel,
    theme,
    onQueryChange,
    onSubmit,
    onClear,
    onSelect,
    onDeselect,
    onHover,
    onToggleTheme,
    onSearchFocusChange,
  } = props;

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(query);
  }

  return (
    <aside className="flex h-full w-[392px] flex-none flex-col border-r border-line bg-surface">
      {!selectedId && (
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
            <SearchField
              query={query}
              onQueryChange={onQueryChange}
              onClear={onClear}
              onFocusChange={onSearchFocusChange}
            />
            <span className="min-h-4 text-[12px] text-muted">{hint}</span>
          </form>
        </div>
      )}

      <RouteList
        query={query}
        banner={banner}
        placeLabel={placeLabel}
        groups={groups}
        selectedId={selectedId}
        backLabel={backLabel}
        theme={theme}
        onClear={onClear}
        onSelect={onSelect}
        onDeselect={onDeselect}
        onHover={onHover}
      />
    </aside>
  );
}
