import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncPanel, SyncStrip } from './SyncPanel.tsx';

const handlers = () => ({
  onHide: vi.fn(),
  onStop: vi.fn(),
  onDone: vi.fn(),
  onSeeMyRoutes: vi.fn(),
});

describe('SyncPanel — syncing', () => {
  it('shows a loading treatment (progress + skeletons) with Hide and Stop', async () => {
    const h = handlers();
    render(
      <SyncPanel phase={{ kind: 'syncing' }} alreadyInLibrary={0} {...h} />
    );
    expect(
      screen.getByRole('heading', { name: /bringing in your routes/i })
    ).toBeVisible();
    expect(screen.getByRole('progressbar')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(h.onHide).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(h.onStop).toHaveBeenCalled();
  });
});

describe('SyncPanel — summary', () => {
  it('itemises Added / Updated / Already-in and offers See my routes', async () => {
    const h = handlers();
    render(
      <SyncPanel
        phase={{ kind: 'synced', added: 5, updated: 2 }}
        alreadyInLibrary={100}
        {...h}
      />
    );
    const result = screen.getByRole('status');
    expect(result).toHaveTextContent(/added\s*5/i);
    expect(result).toHaveTextContent(/updated\s*2/i);
    expect(result).toHaveTextContent(/already in the library\s*100/i);

    await userEvent.click(
      screen.getByRole('button', { name: /see my routes/i })
    );
    expect(h.onSeeMyRoutes).toHaveBeenCalled();
  });

  it('names the nothing-new case', () => {
    render(
      <SyncPanel
        phase={{ kind: 'synced', added: 0, updated: 0 }}
        alreadyInLibrary={100}
        {...handlers()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/no new routes/i);
  });
});

describe('SyncPanel — failed', () => {
  it('explains the failure and offers a retry', () => {
    render(
      <SyncPanel
        phase={{ kind: 'failed' }}
        alreadyInLibrary={0}
        {...handlers()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /something went wrong/i
    );
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/connect/start'
    );
  });
});

describe('SyncStrip', () => {
  it('shows a live syncing indicator with View', async () => {
    const onView = vi.fn();
    render(<SyncStrip phase={{ kind: 'syncing' }} onView={onView} />);
    expect(screen.getByRole('status')).toHaveTextContent(/syncing/i);
    await userEvent.click(screen.getByRole('button', { name: /view/i }));
    expect(onView).toHaveBeenCalled();
  });

  it('shows the added count on completion', () => {
    render(
      <SyncStrip
        phase={{ kind: 'synced', added: 7, updated: 0 }}
        onView={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/added 7 routes/i);
  });
});
