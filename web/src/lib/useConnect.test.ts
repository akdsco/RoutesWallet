import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useConnect } from './useConnect.ts';
import * as api from './strava-connect.ts';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  setUrl('');
});

describe('useConnect', () => {
  it('loads the session and stays idle when not returning from a connect', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    const { result } = renderHook(() => useConnect());

    await waitFor(() =>
      expect(result.current.session).toEqual({
        signedIn: true,
        athleteId: 9,
        name: 'Jo',
      })
    );
    expect(result.current.sync).toEqual({ kind: 'idle' });
  });

  it('runs the sync on ?connect=start and reports added/updated', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    vi.spyOn(api, 'runSync').mockResolvedValue({
      added: 5,
      updated: 2,
      skipped: 0,
    });
    const onSynced = vi.fn();
    setUrl('?connect=start');

    const { result } = renderHook(() => useConnect(onSynced));

    await waitFor(() =>
      expect(result.current.sync).toEqual({
        kind: 'synced',
        added: 5,
        updated: 2,
      })
    );
    expect(onSynced).toHaveBeenCalledWith({ added: 5, updated: 2, skipped: 0 });
    expect(window.location.search).not.toContain('connect=start');
  });

  it('surfaces a connect failure banner (signed out) from the callback', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({ signedIn: false });
    setUrl('?connect=unavailable');
    const { result } = renderHook(() => useConnect());
    await waitFor(() => expect(result.current.banner).toBe('unavailable'));
  });

  it('signs out: clears session, sync and banner', async () => {
    vi.spyOn(api, 'fetchSession').mockResolvedValue({
      signedIn: true,
      athleteId: 9,
      name: 'Jo',
    });
    const signOut = vi.spyOn(api, 'signOut').mockResolvedValue();
    const { result } = renderHook(() => useConnect());
    await waitFor(() => expect(result.current.session?.signedIn).toBe(true));

    await act(() => result.current.signOut());

    expect(signOut).toHaveBeenCalled();
    expect(result.current.session).toEqual({ signedIn: false });
  });
});
