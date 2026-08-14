import type { ChipCount, Domains, Filters } from '../lib/filters.ts';
import { FilterBody, type FilterHandlers } from './FilterPanel.tsx';

type Props = FilterHandlers & {
  filters: Filters;
  domains: Domains;
  countyChips: ChipCount[];
  countryChips: ChipCount[];
  elevationEnabled: boolean;
  /** K — routes the current filters would show; carried on the commit button. */
  matchCount: number;
  onClearAll: () => void;
  /** Commit + return to the list ("Show N routes"). */
  onDone: () => void;
};

/**
 * The mobile filter view (§G/§F): swaps into the bottom sheet in place of the
 * list (replace-and-restore, like RouteDetail), so it reuses the sheet's snaps
 * with no new pattern. A form, not a destination — it commits downward via the
 * pinned "Show N routes" footer rather than a back row.
 */
export function MobileFilterSheet({
  matchCount,
  onClearAll,
  onDone,
  ...body
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-[14px] font-semibold text-text">Filters</span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[12.5px] font-medium text-sel"
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <FilterBody {...body} />
      </div>

      {/* pb includes the safe-area inset: the filter view caps its content to the
          visible window (so this footer sits at the screen edge), which places the
          sheet's own bottom safe-area padding off-screen — so the button needs the
          inset here to clear a home indicator (TB-66). */}
      <div className="border-t border-line px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={onDone}
          className="flex min-h-12 w-full items-center justify-center rounded-[10px] bg-sel text-[14px] font-semibold text-white dark:text-bg"
        >
          Show {matchCount} {matchCount === 1 ? 'route' : 'routes'}
        </button>
      </div>
    </div>
  );
}
