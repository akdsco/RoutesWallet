import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectStrava } from './ConnectStrava.tsx';
import * as api from '../lib/strava-connect.ts';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

beforeEach(() => {
  setUrl('');
  vi.stubEnv('VITE_STRAVA_CLIENT_ID', 'CID123');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('ConnectStrava — signed out', () => {
  it('renders a Strava authorize link with the callback redirect + route scope', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({ signedIn: false });
    render(<ConnectStrava />);

    const link = await screen.findByRole('link', { name: /connect strava/i });
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe(
      'https://www.strava.com/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('CID123');
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
    expect(url.searchParams.get('redirect_uri')).toContain('/connect/callback');
  });

  it('shows the denial message when the callback reported connect=denied', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({ signedIn: false });
    setUrl('?connect=denied');
    render(<ConnectStrava />);
    expect(await screen.findByRole('status')).toHaveTextContent(/cancel/i);
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
    ).toBeVisible();
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
    let resolveSync!: (r: { added: number; skipped: number }) => void;
    vi.spyOn(api, 'runSync').mockReturnValue(
      new Promise((res) => {
        resolveSync = res;
      })
    );
    setUrl('?connect=start');
    render(<ConnectStrava onSynced={onSynced} />);

    // Progress while the pull runs — not a frozen blank.
    expect(await screen.findByRole('status')).toHaveTextContent(/sync/i);

    resolveSync({ added: 12, skipped: 1 });

    // The syncing status is replaced by the result status — re-query it.
    const result = await screen.findByText(/added 12 routes/i);
    expect(result).toHaveAttribute('role', 'status');
    expect(onSynced).toHaveBeenCalledWith(12);
    // The ?connect=start is cleared so a refresh doesn't re-pull.
    expect(window.location.search).not.toContain('connect=start');
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
