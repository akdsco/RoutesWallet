import type { SessionState } from '../lib/strava-connect.ts';
import type { SyncPhase, ConnectBanner } from '../lib/useConnect.ts';

// The OAuth flow starts server-side at /connect/start (it mints the CSRF state
// nonce + builds the authorize URL from the server-side client id), so the browser
// just links there — it never constructs the Strava URL or holds the client id.
const CONNECT_START_URL = '/connect/start';

const BANNER_COPY: Record<NonNullable<ConnectBanner>, string> = {
  denied: 'Strava connection cancelled.',
  scope: 'RoutesWallet needs route access to add your routes.',
  error: 'Something went wrong connecting Strava. Please try again.',
  // Distinct from `error`: retrying won't help — it's a server-side config gap.
  unavailable:
    'Sign in with Strava is temporarily unavailable. Please try again later.',
};

type Props = {
  session: SessionState;
  sync: SyncPhase;
  banner: ConnectBanner;
};

/**
 * The signed-out "Connect with Strava" call to action (account redesign). Signed
 * in, the card is gone — the account lives in the avatar menu and the sync in its
 * own panel — so this renders the CTA (+ any connect-failure banner) only when
 * signed out, plus a compact sync status line while a sync is in flight.
 */
export function ConnectStrava({ session, sync, banner }: Props) {
  if (session.signedIn) {
    if (sync.kind === 'syncing') {
      return (
        <p role="status" aria-busy="true" className="text-[12px] text-text-2">
          Syncing your routes from Strava…
        </p>
      );
    }
    if (sync.kind === 'synced') {
      const n = sync.added;
      return (
        <p
          role="status"
          className="rounded-md bg-[#FC4C02]/10 px-2.5 py-1.5 text-[13px] font-semibold text-text-2"
        >
          {n === 0
            ? 'You had no new routes to add — you’re all set.'
            : `Added ${n} ${n === 1 ? 'route' : 'routes'} to the club library.`}
        </p>
      );
    }
    if (sync.kind === 'failed') {
      return (
        <p role="status" className="text-[12px] text-muted">
          Couldn’t add your routes — please try connecting again.
        </p>
      );
    }
    return null; // signed in, idle — the avatar in the header is the whole UI
  }

  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={CONNECT_START_URL}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: '#FC4C02' }}
      >
        <span aria-hidden="true">▲</span>
        Connect with Strava
      </a>
      <span className="text-[12px] text-muted">
        Bring your own routes into the club library. We only read your routes —
        nothing is posted to Strava.
      </span>
      {banner && (
        <p role="status" className="text-[12px] text-muted">
          {BANNER_COPY[banner]}
        </p>
      )}
    </div>
  );
}
