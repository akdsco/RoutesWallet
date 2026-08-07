import type { Route } from '../types.ts';
import { openLabel } from '../lib/links.ts';
import { safeHref } from '../lib/sanitize.ts';
import { SourceBadge } from './SourceBadge.tsx';

type Props = {
  route: Route;
  /** Distance from the searched place, when a search is active. */
  nearKm?: number;
  onClose: () => void;
};

/**
 * The selected-route detail card — a persistent, Google-Maps-style panel shown
 * on click (TB-53), NOT the transient hover card and NOT the list-scroll. It
 * owns the "full payload": name, distance, region, trust badge, cafe/notes and
 * the single Open-in-Strava exit. Purely presentational so the same contract can
 * back the mobile bottom sheet (TB-49) — it renders wherever it's placed.
 */
export function RouteDetail({ route: r, nearKm, onClose }: Props) {
  return (
    <div
      role="region"
      aria-label={`Selected route: ${r.name}`}
      className="absolute right-5 top-5 z-[500] flex w-[280px] flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-[0_2px_10px_rgba(16,24,32,0.12)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-semibold leading-tight text-text">
          {r.name}
        </span>
        <button
          type="button"
          aria-label="Close route details"
          onClick={onClose}
          className="-mr-1 -mt-1 flex-none px-1 text-[16px] leading-none text-muted hover:text-text"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={r.source} />
        <span className="font-mono text-[12px] text-text-2">
          {r.distance_km} km
        </span>
        <span className="text-[12px] text-muted">{r.region}</span>
        {nearKm != null && (
          <span className="text-[12px] text-muted">
            · {nearKm.toFixed(1)} km away
          </span>
        )}
      </div>

      {r.cafe && <span className="text-[12px] text-muted">☕ {r.cafe}</span>}
      {r.notes && (
        <span className="text-[12px] leading-snug text-text-2">{r.notes}</span>
      )}

      <a
        href={safeHref(r.link)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 inline-flex items-center justify-center gap-1.5 rounded-md bg-sel px-3 py-2 text-[13px] font-medium text-white"
      >
        {openLabel(r.link)} ↗
      </a>
    </div>
  );
}
