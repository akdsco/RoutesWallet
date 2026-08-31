import { useEffect, useRef, useState } from 'react';
import {
  fetchSession,
  runSync,
  signOut,
  readConnectStatus,
  type SessionState,
} from '../lib/strava-connect.ts';

// The OAuth flow starts server-side at /connect/start (it mints the CSRF state
// nonce + builds the authorize URL from the server-side client id), so the browser
// just links there — it never constructs the Strava URL or holds the client id.
const CONNECT_START_URL = '/connect/start';

/** The transient state of the connect flow, on top of the persistent session. */
type Flow =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'synced'; added: number }
  | { kind: 'sync-failed' }
  | { kind: 'denied' | 'scope' | 'error' | 'unavailable' };

type FailKind = 'denied' | 'scope' | 'error' | 'unavailable' | 'sync-failed';

const FAIL_COPY: Record<FailKind, string> = {
  denied: 'Strava connection cancelled.',
  scope: 'RoutesWallet needs route access to add your routes.',
  error: 'Something went wrong connecting Strava. Please try again.',
  // Distinct from `error`: retrying won't help — it's a server-side config gap.
  unavailable:
    'Sign in with Strava is temporarily unavailable. Please try again later.',
  'sync-failed': "Couldn't add your routes — please try connecting again.",
};

/** Strip the `?connect=…` param so a refresh doesn't re-run the flow. */
function clearConnectParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('connect');
  window.history.replaceState({}, '', url.toString());
}

type Props = {
  /** Told the current session so the app can drive the "my routes" view. */
  onSessionChange?: (session: SessionState) => void;
  /** Told how many routes were just added, so the app can refresh the pool. */
  onSynced?: (added: number) => void;
};

/**
 * The "Sign in with Strava" card (TB-116). On mount it asks the server who's
 * signed in; when the member returns from the OAuth callback (`?connect=start`)
 * it runs the route sync, showing visible progress and then an unmissable count —
 * no frozen blank, no forgettable one-liner. Signed-in members are greeted by
 * name with a Sign out; a plain anchor still drives the real OAuth redirect.
 */
export function ConnectStrava({ onSessionChange, onSynced }: Props) {
  // null = still asking the server; then a concrete signed-in / signed-out state.
  const [session, setSession] = useState<SessionState | null>(null);
  const [flow, setFlow] = useState<Flow>({ kind: 'idle' });

  // Keep the latest callbacks without making them effect deps (the effect is
  // mount-only — re-running it would re-hit /api/me on every parent render).
  const cbs = useRef({ onSessionChange, onSynced });
  cbs.current = { onSessionChange, onSynced };

  useEffect(() => {
    let cancelled = false;
    const status = readConnectStatus(window.location.search);
    if (
      status === 'denied' ||
      status === 'scope' ||
      status === 'error' ||
      status === 'unavailable'
    ) {
      setFlow({ kind: status });
      clearConnectParam();
    }

    void (async () => {
      const me = await fetchSession().catch((err: unknown) => {
        // Observable degrade: log it, fall back to signed-out so the CTA still
        // shows — never a blank card on a transient /api/me blip.
        console.error('session check failed', err);
        const out: SessionState = { signedIn: false };
        return out;
      });
      if (cancelled) return;
      setSession(me);
      cbs.current.onSessionChange?.(me);

      if (status === 'start' && me.signedIn) {
        setFlow({ kind: 'syncing' });
        clearConnectParam();
        try {
          const { added } = await runSync();
          if (cancelled) return;
          setFlow({ kind: 'synced', added });
          cbs.current.onSynced?.(added);
        } catch (err) {
          if (cancelled) return;
          console.error('route sync failed', err);
          setFlow({ kind: 'sync-failed' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      // Observable degrade: log, but still clear the UI — the worst case is a
      // stale server cookie the next /api/me reconciles.
      console.error('sign out failed', err);
    }
    const out: SessionState = { signedIn: false };
    setSession(out);
    setFlow({ kind: 'idle' });
    cbs.current.onSessionChange?.(out);
  }

  const anchorClass =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return (
    <div className="flex flex-col gap-1.5">
      {session?.signedIn ? (
        <>
          <p className="text-[13px] text-text-2">
            Signed in as <strong>{session.name}</strong>
          </p>
          <div className="flex items-center gap-2">
            <a
              href={CONNECT_START_URL}
              className={anchorClass}
              style={{ backgroundColor: '#FC4C02' }}
            >
              <span aria-hidden="true">▲</span>
              Add more from Strava
            </a>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted hover:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <a
            href={CONNECT_START_URL}
            className={anchorClass}
            style={{ backgroundColor: '#FC4C02' }}
          >
            <span aria-hidden="true">▲</span>
            Connect Strava
          </a>
          <span className="text-[12px] text-muted">
            Add your own routes to the shared club library.
          </span>
        </>
      )}

      {flow.kind === 'syncing' && (
        <p role="status" aria-busy="true" className="text-[12px] text-text-2">
          Syncing your routes from Strava…
        </p>
      )}
      {flow.kind === 'synced' && (
        <p
          role="status"
          className="rounded-md bg-[#FC4C02]/10 px-2.5 py-1.5 text-[13px] font-semibold text-text-2"
        >
          {flow.added === 0
            ? 'You had no new routes to add — you’re all set.'
            : `Added ${flow.added} ${flow.added === 1 ? 'route' : 'routes'} to the club library.`}
        </p>
      )}
      {(flow.kind === 'denied' ||
        flow.kind === 'scope' ||
        flow.kind === 'error' ||
        flow.kind === 'unavailable' ||
        flow.kind === 'sync-failed') && (
        <p role="status" className="text-[12px] text-muted">
          {FAIL_COPY[flow.kind]}
        </p>
      )}
    </div>
  );
}
