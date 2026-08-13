import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from './FilterPanel.tsx';
import { defaultFilters, type Domains, type Filters } from '../lib/filters.ts';

const domains: Domains = {
  distance: { min: 10, max: 150, hardMax: 500 },
  elevation: { min: 0, max: 2000, hardMax: 12000 },
};

const countyChips = [
  { value: 'Essex', count: 12 },
  { value: 'Kent', count: 5 },
  { value: 'Surrey', count: 0 }, // dimmed, still shown
];

function setup(
  over: { filters?: Partial<Filters>; countryChips?: typeof countyChips } = {}
) {
  const handlers = {
    onToggleCounty: vi.fn(),
    onToggleCountry: vi.fn(),
    onDistanceChange: vi.fn(),
    onDistanceCommit: vi.fn(),
    onElevationChange: vi.fn(),
    onElevationCommit: vi.fn(),
    onClearAll: vi.fn(),
  };
  const filters: Filters = { ...defaultFilters(domains), ...over.filters };
  const activeCount = filters.counties.size > 0 ? 1 : 0;
  render(
    <FilterPanel
      filters={filters}
      domains={domains}
      countyChips={countyChips}
      countryChips={over.countryChips ?? []}
      elevationEnabled={true}
      activeCount={activeCount}
      matchCount={17}
      totalCount={125}
      {...handlers}
    />
  );
  return handlers;
}

describe('FilterPanel', () => {
  it('discloses the body on toggle', async () => {
    const user = userEvent.setup();
    setup();
    const header = screen.getByRole('button', { name: /^filters$/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /essex/i })).toBeInTheDocument();
  });

  it('shows an active-count pill when a filter is set', () => {
    setup({ filters: { counties: new Set(['Essex']) } });
    const header = screen.getByRole('button', { name: /filters/i });
    // the pill carries the active-dimension count
    expect(header).toHaveTextContent('1');
  });

  it('a county chip reflects its selected state and reports toggles', async () => {
    const user = userEvent.setup();
    const h = setup({ filters: { counties: new Set(['Essex']) } });
    await user.click(screen.getByRole('button', { name: /^filters/i }));
    const essex = screen.getByRole('button', { name: /essex/i });
    expect(essex).toHaveAttribute('aria-pressed', 'true');
    const kent = screen.getByRole('button', { name: /kent/i });
    expect(kent).toHaveAttribute('aria-pressed', 'false');
    await user.click(kent);
    expect(h.onToggleCounty).toHaveBeenCalledWith('Kent');
  });

  it('renders a zero-count county dimmed with its count, not hidden', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /^filters/i }));
    const surrey = screen.getByRole('button', { name: /surrey/i });
    expect(surrey).toBeInTheDocument();
    expect(surrey).toHaveTextContent('0');
    expect(surrey).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides the country row below two countries and shows it at two or more', async () => {
    const user = userEvent.setup();
    // one country → hidden
    const { rerender } = renderPanel([{ value: 'England', count: 10 }]);
    await user.click(screen.getByRole('button', { name: /^filters/i }));
    expect(screen.queryByText(/^country$/i)).not.toBeInTheDocument();
    rerender(
      panel([
        { value: 'England', count: 10 },
        { value: 'Wales', count: 3 },
      ])
    );
    expect(screen.getByText(/^country$/i)).toBeInTheDocument();
  });

  it('Clear all is enabled only when a filter is active and reports the clear', async () => {
    const user = userEvent.setup();
    const h = setup({ filters: { counties: new Set(['Essex']) } });
    await user.click(screen.getByRole('button', { name: /^filters/i }));
    const clear = screen.getByRole('button', { name: /clear all/i });
    expect(clear).toBeEnabled();
    await user.click(clear);
    expect(h.onClearAll).toHaveBeenCalled();
  });
});

// Helpers for the country-row rerender case (needs a stable element identity).
const noop = () => {};
function panel(countryChips: { value: string; count: number }[]) {
  return (
    <FilterPanel
      filters={defaultFilters(domains)}
      domains={domains}
      countyChips={countyChips}
      countryChips={countryChips}
      elevationEnabled={true}
      activeCount={0}
      matchCount={17}
      totalCount={125}
      onToggleCounty={noop}
      onToggleCountry={noop}
      onDistanceChange={noop}
      onDistanceCommit={noop}
      onElevationChange={noop}
      onElevationCommit={noop}
      onClearAll={noop}
    />
  );
}
function renderPanel(countryChips: { value: string; count: number }[]) {
  return render(panel(countryChips));
}
