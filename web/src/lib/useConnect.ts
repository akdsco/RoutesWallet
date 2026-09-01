import { useEffect, useRef, useState } from 'react';
import {
  fetchSession,
  runSync,
  signOut as apiSignOut,
  readConnectStatus,
  type SessionState,
  type SyncResult,
} from './strava-connect.ts';

/** The transient sync state, on top of the persistent session. */
export type SyncPhase =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'synced'; added: number; updated: number }
  | { kind: 'failed' };

/** A signed-out connect failure the CTA explains (never a success). */
export type ConnectBanner = 'denied' | 'scope' | 'error' | 'unavailable' | null;

export type Connect = {
  /** null while the first /api/me is in flight; then a concrete state. */
  session: SessionState | null;
  sync: SyncPhase;
  banner: ConnectBanner;
  signOut: () => Promise<void>;
  /** Dismiss the summary/failed sync back to idle (Done / close the strip). */
  dismissSync: () => void;
};

/** Strip the `?connect=…` param so a refresh doesn't re-run the flow. */
function clearConnectParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('connect');
  window.history.replaceState({}, '', url.toString());
}

/**
 * Owns the whole client side of "Sign in with Strava" (TB-116 + account
 * redesign): who's signed in (`/api/me`), running the route sync on return from
 * the callback (`?connect=start`), the connect failure banner, and signing out.
 * Lifted out of the connect card so App is the single owner — the avatar, the
 * sync panel and the CTA all read one source and can't drift.
 */
export function useConnect(onSynced?: (result: SyncResult) => void): Connect {
  const [session, setSession] = useState<SessionState | null>(null);
  const [sync, setSync] = useState<SyncPhase>({ kind: 'idle' });
  const [banner, setBanner] = useState<ConnectBanner>(null);

  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    let cancelled = false;
    const status = readConnectStatus(window.location.search);
    if (
      status === 'denied' ||
      status === 'scope' ||
      status === 'error' ||
      status === 'unavailable'
    ) {
      setBanner(status);
      clearConnectParam();
    }

    void (async () => {
      const me = await fetchSession().catch((err: unknown) => {
        // Observable degrade: log, fall back to signed-out so the CTA still shows.
        console.error('session check failed', err);
        const out: SessionState = { signedIn: false };
        return out;
      });
      if (cancelled) return;
      setSession(me);

      if (status === 'start' && me.signedIn) {
        setSync({ kind: 'syncing' });
        clearConnectParam();
        try {
          const result = await runSync();
          if (cancelled) return;
          setSync({
            kind: 'synced',
            added: result.added,
            updated: result.updated,
          });
          onSyncedRef.current?.(result);
        } catch (err) {
          if (cancelled) return;
          console.error('route sync failed', err);
          setSync({ kind: 'failed' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    try {
      await apiSignOut();
    } catch (err) {
      // Observable degrade: log, but still clear the UI — a stale server cookie
      // the next /api/me reconciles.
      console.error('sign out failed', err);
    }
    setSession({ signedIn: false });
    setSync({ kind: 'idle' });
    setBanner(null);
  }

  const dismissSync = () => setSync({ kind: 'idle' });

  return { session, sync, banner, signOut, dismissSync };
}
