import type { SyncPhase } from '../lib/useConnect.ts';

/** The sync phases that have a panel (everything but idle). */
export type ActiveSync = Exclude<SyncPhase, { kind: 'idle' }>;

type PanelProps = {
  phase: ActiveSync;
  /** Routes already in the pool that aren't this member's just-synced ones. */
  alreadyInLibrary: number;
  onHide: () => void;
  onStop: () => void;
  onDone: () => void;
  onSeeMyRoutes: () => void;
};

const btnPrimary =
  'rounded-md bg-sel px-3 py-1.5 text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const btnBordered =
  'rounded-md border border-line px-3 py-1.5 text-[13px] font-medium text-text-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const btnText =
  'px-2 py-1.5 text-[13px] font-medium text-muted hover:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

/** A shimmering placeholder route row — conveys the library filling. */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2 motion-safe:animate-pulse">
      <div className="h-9 w-[52px] flex-none rounded bg-surface-2" />
      <div className="flex-1">
        <div className="mb-1.5 h-2.5 w-2/3 rounded bg-surface-2" />
        <div className="h-2 w-1/3 rounded bg-line" />
      </div>
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-t border-line py-2.5">
      <span className="text-[13px] text-text-2">{label}</span>
      <span className="font-mono text-[13px] font-semibold text-text-2">
        {value}
      </span>
    </div>
  );
}

/**
 * The first-sync panel (account redesign), rendered in place of the list. It's a
 * proper loading treatment — a title, an animated indeterminate bar and a few
 * shimmering skeleton rows (not a bare "loading…" line) — that resolves into an
 * itemised summary. Built so a real determinate progress stream ("N of M") can
 * slot into the same shell later.
 */
export function SyncPanel({
  phase,
  alreadyInLibrary,
  onHide,
  onStop,
  onDone,
  onSeeMyRoutes,
}: PanelProps) {
  if (phase.kind === 'syncing') {
    return (
      <section
        aria-label="Sync progress"
        className="flex flex-col gap-4 px-6 py-5"
      >
        <div>
          <h2 className="text-[15px] font-semibold text-text-2">
            Bringing in your routes
          </h2>
          <p role="status" className="mt-1 text-[12px] text-muted">
            Reading each route from Strava. You can keep browsing — this carries
            on in the background.
          </p>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Syncing your routes"
        >
          <div className="h-full w-1/3 rounded-full bg-sel motion-safe:animate-pulse" />
        </div>
        <div aria-hidden="true">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onHide} className={btnBordered}>
            Hide
          </button>
          <button type="button" onClick={onStop} className={btnText}>
            Stop
          </button>
        </div>
      </section>
    );
  }

  if (phase.kind === 'failed') {
    return (
      <section
        aria-label="Sync result"
        className="flex flex-col gap-4 px-6 py-5"
      >
        <div>
          <h2 className="text-[15px] font-semibold text-text-2">
            Couldn’t add your routes
          </h2>
          <p role="status" className="mt-1 text-[12px] text-muted">
            Something went wrong syncing from Strava. Please try connecting
            again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/connect/start" className={btnPrimary}>
            Try again
          </a>
          <button type="button" onClick={onDone} className={btnText}>
            Done
          </button>
        </div>
      </section>
    );
  }

  // synced
  const nothingNew = phase.added === 0 && phase.updated === 0;
  return (
    <section aria-label="Sync result" className="flex flex-col gap-4 px-6 py-5">
      <div>
        <h2 className="text-[15px] font-semibold text-text-2">
          {nothingNew ? 'You’re all set' : 'Your routes are in'}
        </h2>
        {nothingNew && (
          <p role="status" className="mt-1 text-[12px] text-muted">
            No new routes to add — your library is up to date.
          </p>
        )}
      </div>
      {!nothingNew && (
        <div role="status">
          <CountRow label="Added" value={phase.added} />
          <CountRow label="Updated" value={phase.updated} />
          <CountRow label="Already in the library" value={alreadyInLibrary} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSeeMyRoutes} className={btnPrimary}>
          See my routes
        </button>
        <button type="button" onClick={onDone} className={btnText}>
          Done
        </button>
      </div>
    </section>
  );
}

type StripProps = { phase: ActiveSync; onView: () => void };

/**
 * The slim sync strip atop the list (design): the "something is active here"
 * language, with a live indicator + View to reopen the panel.
 */
export function SyncStrip({ phase, onView }: StripProps) {
  const label =
    phase.kind === 'syncing'
      ? 'Syncing your routes…'
      : phase.kind === 'failed'
        ? 'Sync failed'
        : `Added ${phase.added} ${phase.added === 1 ? 'route' : 'routes'} to the library`;
  return (
    <div className="flex items-center gap-2 border-l-[3px] border-sel bg-sel-soft px-4 py-2.5">
      {phase.kind === 'syncing' && (
        <span
          aria-hidden="true"
          className="h-3 w-3 flex-none rounded-full border-2 border-sel border-t-transparent motion-safe:animate-spin"
        />
      )}
      <span role="status" className="flex-1 text-[12px] text-text-2">
        {label}
      </span>
      <button
        type="button"
        onClick={onView}
        className="text-[12px] font-semibold text-sel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        View
      </button>
    </div>
  );
}
