import { useEffect, useState } from 'react';
import {
  buildAuthorizeUrl,
  hasContributed,
  markContributed,
  readConnectStatus,
  type ConnectStatus,
} from '../lib/strava-connect.ts';

const STATUS_COPY: Record<NonNullable<ConnectStatus>['state'], string> = {
  ok: 'Thanks — your routes are being added to the club pool.',
  denied: 'Strava connection cancelled.',
  scope: 'RoutesWallet needs route access to add your routes.',
  error: 'Something went wrong connecting Strava. Please try again.',
};

/**
 * The "Connect Strava" call to action (TB-110). A real OAuth redirect link (a
 * full-page navigation to Strava's consent screen), so it's a plain anchor — no
 * faked JS navigation. Shows the callback's `?connect=…` status and, on success,
 * sets the browser "already contributed" flag so a return visit relabels the CTA
 * instead of re-pulling. Renders nothing when the client id isn't configured
 * (e.g. local dev without the env var).
 */
export function ConnectStrava() {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined;
  const [contributed, setContributed] = useState(false);
  const [status, setStatus] = useState<ConnectStatus>(null);

  useEffect(() => {
    const s = readConnectStatus(window.location.search);
    if (s?.state === 'ok') markContributed();
    setStatus(s);
    setContributed(hasContributed());
  }, []);

  if (!clientId) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={buildAuthorizeUrl(clientId, window.location.origin)}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: '#FC4C02' }}
      >
        <span aria-hidden="true">▲</span>
        {contributed ? 'Add more from Strava' : 'Connect Strava'}
      </a>
      <span className="text-[12px] text-muted">
        Add your own routes to the shared club library.
      </span>
      {status && (
        <p
          role="status"
          className={`text-[12px] ${status.state === 'ok' ? 'text-text-2' : 'text-muted'}`}
        >
          {STATUS_COPY[status.state]}
        </p>
      )}
    </div>
  );
}
