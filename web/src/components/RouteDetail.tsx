import type { RefObject } from 'react';
import type { Route } from '../types.ts';
import { routeThumbnail } from '../lib/thumbnail.ts';
import { sourceShortLabel, isGpxLink } from '../lib/links.ts';
import { formatGain } from '../lib/format.ts';
import { safeHref } from '../lib/sanitize.ts';
import { SourceBadge } from './SourceBadge.tsx';

type Props = {
  route: Route;
  /** Distance from the searched place, when a search is active. */
  nearKm?: number;
  /** Back-row copy naming where exit returns to, e.g. "Back to 21 results". */
  backLabel: string;
  /** Focused on enter so keyboard users land on the way out first (§E). */
  backRef: RefObject<HTMLButtonElement>;
  theme: 'light' | 'dark';
  onBack: () => void;
};

/**
 * The selected-route detail — a full-height panel that REPLACES the sidebar list
 * (design §E), not a floating map card. Back row → thumbnail → name/meta/trust →
 * Open button → notes/café. Purely presentational so the same contract can also
 * back the mobile bottom sheet (TB-49): it renders wherever it's placed.
 */
export function RouteDetail({
  route: r,
  nearKm,
  backLabel,
  backRef,
  theme,
  onBack,
}: Props) {
  const pts = routeThumbnail(r.geometry.coordinates, 150, 104, 10);
  const [sx, sy] = (pts.split(' ')[0] ?? '0,0').split(',');

  return (
    <div
      role="region"
      aria-label="Route detail"
      className="detail-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-line px-3 py-2.5 max-md:py-2">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[34px] items-center gap-2 rounded-lg bg-surface-2 px-3 text-[12.5px] font-medium text-text-2 hover:bg-line-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sel"
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pt-3.5 max-md:gap-2.5 max-md:pt-3">
        {/* On mobile the map behind the sheet is the route preview, so this
            in-panel thumbnail is redundant — hiding it lets the name + Open exit
            fit the detail snap (DETAIL_PX in sheet.ts) so Open stays visible
            without scrolling (§F). Desktop keeps it. */}
        <svg
          width="150"
          height="104"
          viewBox="0 0 150 104"
          aria-hidden="true"
          className="self-center max-md:hidden"
        >
          <polyline
            points={pts}
            fill="none"
            stroke="var(--sel)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={sx}
            cy={sy}
            r="5"
            fill="var(--sel)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        </svg>

        <div className="flex flex-col gap-2">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text max-md:text-[15px]">
            {r.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[14px] text-text">
              {r.distance_km} km
            </span>
            {/* §H: total climb paired with distance, mono (shown only when known). */}
            {formatGain(r.elevation_gain_m) && (
              <span className="font-mono text-[14px] text-text">
                <span aria-hidden="true" className="text-muted">
                  ◺{' '}
                </span>
                <span className="sr-only">climb </span>
                {formatGain(r.elevation_gain_m)}
              </span>
            )}
            {(r.region || nearKm != null) && (
              <>
                <span className="h-[3px] w-[3px] rounded-full bg-muted" />
                <span className="text-[12.5px] text-muted">
                  {r.region}
                  {nearKm != null &&
                    `${r.region ? ' · ' : ''}${nearKm.toFixed(1)} km away`}
                </span>
              </>
            )}
          </div>
          <span className="self-start">
            <SourceBadge source={r.source} />
          </span>
        </div>

        <a
          href={safeHref(r.link)}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[9px] bg-sel text-[13.5px] font-semibold max-md:min-h-12 max-md:w-full ${
            theme === 'dark' ? 'text-[#0B0E10]' : 'text-white'
          }`}
        >
          {sourceShortLabel(r.link)}
          <span aria-hidden="true">{isGpxLink(r.link) ? '↓' : '↗'}</span>
        </a>

        <div className="flex flex-col gap-2.5 border-t border-line-2 pt-3">
          {r.cafe || r.notes ? (
            <>
              {r.cafe && (
                <div className="flex items-start gap-2.5">
                  <span className="text-[13px] leading-tight">☕</span>
                  <span className="text-[12.5px] leading-normal text-text-2">
                    {r.cafe}
                  </span>
                </div>
              )}
              {r.notes && (
                <p className="text-[12.5px] leading-relaxed text-text-2">
                  {r.notes}
                </p>
              )}
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">
              No notes for this route.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
