import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectStrava } from './ConnectStrava.tsx';
import * as api from '../lib/strava-connect.ts';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

beforeEach(() => setUrl(''));
afterEach(() => vi.restoreAllMocks());

describe('ConnectStrava — signed out', () => {
  it('offers a Connect CTA that starts the server-side OAuth flow', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({ signedIn: false });
    render(<ConnectStrava />);

    // The browser links to /connect/start (which mints the CSRF state + redirects
    // to Strava); it never builds the Strava URL itself.
    const link = await screen.findByRole('link', { name: /connect strava/i });
    expect(link).toHaveAttribute('href', '/connect/start');
  });

  it.each([
    ['denied', /cancel/i],
    ['scope', /route access/i],
    ['error', /went wrong/i],
    ['unavailable', /temporarily unavailable/i],
  ])('shows the %s message from the callback', async (state, copy) => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({ signedIn: false });
    setUrl(`?connect=${state}`);
    render(<ConnectStrava />);
    expect(await screen.findByRole('status')).toHaveTextContent(copy);
  });
});

describe('ConnectStrava — signed in', () => {
  it('greets the member by name and offers sign out + add-more', async () => {
    const onSessionChange = vi.fn();
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo Rider',
    });
    render(<ConnectStrava onSessionChange={onSessionChange} />);

    expect(await screen.findByText(/signed in as/i)).toHaveTextContent(
      /jo rider/i
    );
    expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
    expect(
      screen.getByRole('link', { name: /add more from strava/i })
    ).toHaveAttribute('href', '/connect/start');
    await waitFor(() =>
      expect(onSessionChange).toHaveBeenCalledWith({
        signedIn: true,
        athleteId: 9,
        name: 'Jo Rider',
      })
    );
  });

  it('shows progress then an unmissable added-count when returning with connect=start', async () => {
    const onSynced = vi.fn();
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    let resolveSync!: (r: {
      added: number;
      updated: number;
      skipped: number;
    }) => void;
    vi.spyOn(api, 'runSync').mockReturnValue(
      new Promise((res) => {
        resolveSync = res;
      })
    );
    setUrl('?connect=start');
    render(<ConnectStrava onSynced={onSynced} />);

    // Progress while the pull runs — not a frozen blank.
    expect(await screen.findByRole('status')).toHaveTextContent(/sync/i);

    resolveSync({ added: 12, updated: 2, skipped: 1 });

    // The count is the unit under test — assert on the number, not the copy.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/12/)
    );
    expect(onSynced).toHaveBeenCalledWith(12);
    // The ?connect=start is cleared so a refresh doesn't re-pull.
    expect(window.location.search).not.toContain('connect=start');
  });

  it('reports an observable failure (and does not fire onSynced) when the sync throws', async () => {
    const onSynced = vi.fn();
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    vi.spyOn(api, 'runSync').mockRejectedValue(new Error('sync failed: 500'));
    setUrl('?connect=start');
    render(<ConnectStrava onSynced={onSynced} />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /couldn.t add your routes/i
    );
    expect(onSynced).not.toHaveBeenCalled();
  });

  it('names the no-new-routes case rather than a bare "Added 0"', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    vi.spyOn(api, 'runSync').mockResolvedValue({
      added: 0,
      updated: 0,
      skipped: 0,
    });
    setUrl('?connect=start');
    render(<ConnectStrava />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /no new routes/i
    );
  });

  it('signs out: clears identity and returns to the Connect CTA', async () => {
    const onSessionChange = vi.fn();
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    const signOut = vi.spyOn(api, 'signOut').mockResolvedValue();
    render(<ConnectStrava onSessionChange={onSessionChange} />);

    await userEvent.click(
      await screen.findByRole('button', { name: /sign out/i })
    );

    expect(signOut).toHaveBeenCalled();
    expect(
      await screen.findByRole('link', { name: /connect strava/i })
    ).toBeVisible();
    expect(onSessionChange).toHaveBeenLastCalledWith({ signedIn: false });
  });
});
