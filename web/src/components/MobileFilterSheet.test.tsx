import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFilterSheet } from './MobileFilterSheet.tsx';
import { defaultFilters, type Domains } from '../lib/filters.ts';

const domains: Domains = {
  distance: { min: 10, max: 150, hardMax: 500 },
  elevation: { min: 0, max: 2000, hardMax: 12000 },
};

function setup(matchCount = 34) {
  const handlers = {
    onToggleCounty: vi.fn(),
    onToggleCountry: vi.fn(),
    onDistanceChange: vi.fn(),
    onDistanceCommit: vi.fn(),
    onElevationChange: vi.fn(),
    onElevationCommit: vi.fn(),
    onClearAll: vi.fn(),
    onDone: vi.fn(),
  };
  render(
    <MobileFilterSheet
      filters={defaultFilters(domains)}
      domains={domains}
      countyChips={[{ value: 'Essex', count: 12 }]}
      countryChips={[]}
      elevationEnabled={true}
      matchCount={matchCount}
      {...handlers}
    />
  );
  return handlers;
}

describe('MobileFilterSheet', () => {
  it('has a Filters header, a Clear all, and a counted commit footer', () => {
    setup(34);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /clear all/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show 34 routes/i })
    ).toBeInTheDocument();
    // it renders the shared filter body (a county chip)
    expect(screen.getByRole('button', { name: /essex/i })).toBeInTheDocument();
  });

  it('commits via the footer and clears via the header', async () => {
    const user = userEvent.setup();
    const h = setup();
    await user.click(screen.getByRole('button', { name: /show 34 routes/i }));
    expect(h.onDone).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(h.onClearAll).toHaveBeenCalled();
  });

  it('singularises the commit label for one route', () => {
    setup(1);
    expect(
      screen.getByRole('button', { name: /show 1 route$/i })
    ).toBeInTheDocument();
  });
});
