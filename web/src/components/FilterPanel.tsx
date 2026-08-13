import { useId, useState } from 'react';
import type { ChipCount, Domains, Filters, Range } from '../lib/filters.ts';
import { RangeSlider } from './RangeSlider.tsx';

export type FilterHandlers = {
  onToggleCounty: (name: string) => void;
  onToggleCountry: (name: string) => void;
  onDistanceChange: (r: Range) => void;
  onDistanceCommit: (r: Range) => void;
  onElevationChange: (r: Range) => void;
  onElevationCommit: (r: Range) => void;
};

type BodyProps = FilterHandlers & {
  filters: Filters;
  domains: Domains;
  countyChips: ChipCount[];
  countryChips: ChipCount[];
  /** Elevation controls are enabled only when the data actually carries elevation. */
  elevationEnabled: boolean;
};

function Tick() {
  return (
    <svg
      viewBox="0 0 10 10"
      width="9"
      height="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1,5 4,8 9,2" />
    </svg>
  );
}

function Chip({
  chip,
  selected,
  onToggle,
}: {
  chip: ChipCount;
  selected: boolean;
  onToggle: () => void;
}) {
  const zero = chip.count === 0 && !selected;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex h-[30px] items-center gap-[5px] rounded-full px-[11px] text-[12px] font-medium transition-colors ${
        selected
          ? 'bg-sel text-white dark:text-bg'
          : 'border border-line bg-surface text-text-2 hover:bg-surface-2'
      } ${zero ? 'opacity-50' : ''}`}
    >
      {chip.value}
      {zero && <span className="text-muted"> · {chip.count}</span>}
      {selected && <Tick />}
    </button>
  );
}

function ChipSection({
  label,
  chips,
  selectedCount,
  isSelected,
  onToggle,
}: {
  label: string;
  chips: ChipCount[];
  selectedCount: number;
  isSelected: (name: string) => boolean;
  onToggle: (name: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {selectedCount > 0 && (
          <span className="text-[11px] text-muted">
            {selectedCount} of {chips.length}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-[7px]">
        {chips.map((c) => (
          <Chip
            key={c.value}
            chip={c}
            selected={isSelected(c.value)}
            onToggle={() => onToggle(c.value)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * The filter sections themselves — country row (only when the data spans ≥2
 * countries), county chips, distance and elevation sliders. Shared by the desktop
 * disclosure panel and the mobile sheet. Presentation only; state lives in App.
 */
export function FilterBody({
  filters,
  domains,
  countyChips,
  countryChips,
  elevationEnabled,
  onToggleCounty,
  onToggleCountry,
  onDistanceChange,
  onDistanceCommit,
  onElevationChange,
  onElevationCommit,
}: BodyProps) {
  return (
    <div className="flex flex-col gap-[18px]">
      {countryChips.length >= 2 && (
        <ChipSection
          label="Country"
          chips={countryChips}
          selectedCount={filters.countries.size}
          isSelected={(n) => filters.countries.has(n)}
          onToggle={onToggleCountry}
        />
      )}
      <ChipSection
        label="County"
        chips={countyChips}
        selectedCount={filters.counties.size}
        isSelected={(n) => filters.counties.has(n)}
        onToggle={onToggleCounty}
      />
      <RangeSlider
        label="Distance"
        unit="km"
        domain={domains.distance}
        value={filters.distance}
        onChange={onDistanceChange}
        onCommit={onDistanceCommit}
      />
      {elevationEnabled ? (
        <RangeSlider
          label="Elevation"
          unit="m"
          domain={domains.elevation}
          value={filters.elevation}
          onChange={onElevationChange}
          onCommit={onElevationCommit}
        />
      ) : (
        <p className="text-[11.5px] text-muted">
          Elevation filtering needs elevation in the route data.
        </p>
      )}
    </div>
  );
}

type PanelProps = BodyProps & {
  /** Active filter dimensions — drives the header's active state + count pill. */
  activeCount: number;
  /** K — routes in the filtered pool. */
  matchCount: number;
  /** N — total routes. */
  totalCount: number;
  onClearAll: () => void;
};

function DisclosureIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill="none"
      stroke={active ? 'var(--sel)' : 'var(--text-2)'}
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  );
}

/**
 * Desktop filter panel (§G): a collapsible disclosure between the search field and
 * the list — it PUSHES the list down (never a popover), so the count updates live
 * as you drag. The header takes the selected-card language (soft fill + inset bar +
 * a count pill) whenever any filter is active, so a narrowing filter stays visible
 * even collapsed.
 */
export function FilterPanel({
  activeCount,
  matchCount,
  totalCount,
  onClearAll,
  ...body
}: PanelProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const active = activeCount > 0;

  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center gap-2 px-[18px] text-left ${
          active ? 'bg-sel-soft shadow-[inset_3px_0_0_var(--sel)]' : ''
        }`}
      >
        <DisclosureIcon active={active} />
        <span
          className={`text-[13px] ${active ? 'font-semibold text-sel' : 'font-medium text-text'}`}
        >
          Filters
        </span>
        {active && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sel px-[5px] font-mono text-[10.5px] text-white dark:text-bg">
            {activeCount}
          </span>
        )}
        <svg
          viewBox="0 0 12 12"
          width="11"
          height="11"
          fill="none"
          stroke={active ? 'var(--sel)' : 'var(--muted)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="2.5,4.5 6,8 9.5,4.5" />
        </svg>
      </button>

      {open && (
        <div id={bodyId} className="flex flex-col gap-[18px] px-[18px] py-4">
          <FilterBody {...body} />
          <div className="flex items-center justify-between border-t border-line-2 pt-3.5">
            <button
              type="button"
              onClick={onClearAll}
              className="text-[12.5px] font-medium text-sel disabled:opacity-40"
              disabled={!active}
            >
              Clear all
            </button>
            <span className="font-mono text-[11px] text-text-2">
              {matchCount} of {totalCount} match
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
