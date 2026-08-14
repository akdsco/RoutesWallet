import { useLayoutEffect, useRef } from 'react';
import type { Route } from '../types.ts';
import { sourceShortLabel, isGpxLink, openLabel } from '../lib/links.ts';
import { formatGain } from '../lib/format.ts';
import { safeHref } from '../lib/sanitize.ts';
import { TrustGlyph } from './TrustGlyph.tsx';

type Props = {
  route: Route;
  /** Distance from the searched place, when a search is active. */
  nearKm?: number;
  theme: 'light' | 'dark';
  /** Reports the natural content height (px) so App can open the sheet content-fit
   *  (§H, clampDetailPx). Called on mount and whenever the content reflows. */
  onMeasure?: (px: number) => void;
};

/**
 * The mobile selected-route detail (§H): a compact two-row sheet — name + trust
 * ring glyph + a source-named button, then a mono meta line with elevation — and
 * the route's notes below. Back lives on the map (App), not here, so nothing hides
 * behind a drag. It reports its own height so the sheet opens exactly as far as
 * the content needs (content-fit, capped at mid).
 */
export function MobileRouteDetail({
  route: r,
  nearKm,
  theme,
  onMeasure,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !onMeasure) return;
    const report = () => onMeasure(el.scrollHeight);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onMeasure, r.id, nearKm]);

  const gain = formatGain(r.elevation_gain_m);
  const download = isGpxLink(r.link);
  const hasNotes = !!(r.cafe || r.notes);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Route detail"
      className="detail-enter flex flex-col gap-2 px-[18px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {/* Name expands to two lines, then ellipsis (the content-fit snap grows
              to fit the second line). line-clamp-2 keeps a very long name bounded. */}
          <h3 className="line-clamp-2 text-[16px] font-semibold leading-tight tracking-[-0.01em] text-text">
            {r.name}
          </h3>
          <TrustGlyph source={r.source} className="mt-1" />
        </div>
        <a
          href={safeHref(r.link)}
          target="_blank"
          rel="noopener noreferrer"
          // Visible label is the compact "Strava ↗"; the accessible name is the
          // clearer full phrase so AT doesn't read the bare arrow glyph.
          aria-label={openLabel(r.link)}
          className={`inline-flex h-11 flex-none items-center gap-1.5 rounded-[10px] bg-sel px-[15px] text-[13.5px] font-semibold ${
            theme === 'dark' ? 'text-[#0B0E10]' : 'text-white'
          }`}
        >
          {sourceShortLabel(r.link)}
          <span aria-hidden="true">{download ? '↓' : '↗'}</span>
        </a>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-[13px]">
        <span className="text-text">{r.distance_km} km</span>
        {gain && (
          <>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="text-text">
              <span aria-hidden="true">◺ </span>
              <span className="sr-only">climb </span>
              {gain}
            </span>
          </>
        )}
        {r.region && (
          <>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="text-muted">{r.region}</span>
          </>
        )}
        {nearKm != null && (
          <>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="text-muted">{nearKm.toFixed(1)} km away</span>
          </>
        )}
      </div>

      <div className="border-t border-line-2 pt-2 text-[12.5px] leading-relaxed">
        {hasNotes ? (
          <div className="flex flex-col gap-1.5 text-text-2">
            {r.cafe && (
              <div className="flex items-start gap-2">
                <span aria-hidden="true">☕</span>
                <span>{r.cafe}</span>
              </div>
            )}
            {r.notes && <p>{r.notes}</p>}
          </div>
        ) : (
          <p className="text-muted">No notes for this route.</p>
        )}
      </div>
    </div>
  );
}
