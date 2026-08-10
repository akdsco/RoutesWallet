import type { ReactNode } from 'react';
import { LEGEND_HEAT_STOPS } from '../lib/heat.ts';

type Props = {
  /** true once a place search has resolved — the map shows matches + a radius. */
  searching: boolean;
  theme: 'light' | 'dark';
};

// Four segments across the 52px swatch, thickening + solidifying faint -> hot.
const HEAT_SEG = [
  { x1: 1, x2: 13, w: 1.2, o: 0.55 },
  { x1: 13, x2: 26, w: 1.9, o: 0.75 },
  { x1: 26, x2: 39, w: 2.8, o: 0.9 },
  { x1: 39, x2: 51, w: 3.6, o: 1 },
] as const;

/**
 * The map legend. Context-aware: idle keys the heat gradient; a running search
 * keys the matched route + 25 km radius instead — because in search mode the
 * heat flattens and matches redraw as ink lines, so the gradient no longer
 * describes anything on screen. Same pill, same height in both modes — it grows
 * sideways, never down (the POI pills sit just below at top-68px).
 */
export function Legend({ searching, theme }: Props) {
  return (
    <div
      aria-label="Map legend"
      className="absolute left-5 top-5 z-[500] flex h-[34px] items-center gap-4 rounded-lg border border-line bg-surface px-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
    >
      {searching ? (
        <>
          <Key label="matched route">
            <Swatch>
              <line
                x1="1"
                y1="5"
                x2="21"
                y2="5"
                stroke="var(--match)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </Swatch>
          </Key>
          <Divider />
          <Key label="25 km radius">
            <Swatch>
              <line
                x1="1"
                y1="5"
                x2="21"
                y2="5"
                stroke="var(--marker)"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
            </Swatch>
          </Key>
          <Divider />
          <Key label="selected">
            <SelectedSwatch />
          </Key>
        </>
      ) : (
        <>
          <Key label="1 → many rides">
            <svg width="52" height="10" viewBox="0 0 52 10" aria-hidden="true">
              {HEAT_SEG.map((s, i) => (
                <line
                  key={s.x1}
                  x1={s.x1}
                  y1="5"
                  x2={s.x2}
                  y2="5"
                  stroke={LEGEND_HEAT_STOPS[theme][i]}
                  strokeWidth={s.w}
                  strokeOpacity={s.o}
                />
              ))}
            </svg>
          </Key>
          <Divider />
          <Key label="selected">
            <SelectedSwatch />
          </Key>
        </>
      )}
    </div>
  );
}

function Key({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="whitespace-nowrap text-[11.5px] text-text-2">
        {label}
      </span>
    </span>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-4 w-px bg-line-2" />;
}

/** A short 22x10 line swatch — the shared frame for the search-mode keys. */
function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
      {children}
    </svg>
  );
}

function SelectedSwatch() {
  return (
    <Swatch>
      <line
        x1="1"
        y1="5"
        x2="21"
        y2="5"
        stroke="var(--sel)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </Swatch>
  );
}
