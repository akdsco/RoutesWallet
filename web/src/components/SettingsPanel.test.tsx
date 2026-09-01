import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel.tsx';

function setup(over: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  const props = {
    name: 'Jo Rider',
    lastSyncedLabel: 'Last synced 2 days ago · 110 of yours',
    syncing: false,
    ownedCount: 110,
    theme: 'system' as const,
    onSetTheme: vi.fn(),
    units: 'km' as const,
    onSetUnits: vi.fn(),
    onDisconnect: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
  render(<SettingsPanel {...props} />);
  return props;
}

describe('SettingsPanel', () => {
  it('shows the sync row with the last-synced sub-line and a Sync now action', () => {
    setup();
    expect(screen.getByText(/last synced 2 days ago/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /sync now/i })).toHaveAttribute(
      'href',
      '/connect/start'
    );
  });

  it('disables Sync now while a sync is running', () => {
    setup({ syncing: true });
    expect(
      screen.queryByRole('link', { name: /sync now/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/syncing/i)).toBeVisible();
  });

  it('confirms disconnect inline (not a dialog) before ending the session', async () => {
    const props = setup();
    await userEvent.click(
      screen.getByRole('button', { name: /^disconnect$/i })
    );
    expect(
      screen.getByText(/your 110 routes stay in the library/i)
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: /^disconnect$/i })
    );
    expect(props.onDisconnect).toHaveBeenCalled();
  });

  it('changes theme and units', async () => {
    const props = setup();
    await userEvent.click(
      screen.getByRole('group', { name: /theme/i }).querySelector('button')!
    );
    expect(props.onSetTheme).toHaveBeenCalledWith('light');
    await userEvent.click(screen.getByRole('button', { name: 'mi' }));
    expect(props.onSetUnits).toHaveBeenCalledWith('mi');
  });

  it('goes back to the routes', async () => {
    const props = setup();
    await userEvent.click(
      screen.getByRole('button', { name: /back to routes/i })
    );
    expect(props.onBack).toHaveBeenCalled();
  });
});
