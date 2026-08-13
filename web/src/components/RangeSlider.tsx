import { useId } from 'react';
import type { Domain, Range } from '../lib/filters.ts';

type Props = {
  /** e.g. "Distance" — builds the "Minimum distance"/"Maximum distance" labels. */
  label: string;
  /** e.g. "km" or "m". */
  unit: string;
  domain: Domain;
  value: Range;
  /** Live — fires on every drag/step, for the count. */
  onChange: (r: Range) => void;
  /** On release — for the (heavier) list re-render. */
  onCommit: (r: Range) => void;
};

/**
 * Hand-rolled dual-handle range (§G) — no dependency. Two real, focusable range
 * inputs (aria "Minimum …"/"Maximum …") over one drawn track; 5-unit arrow steps
 * and Home/End come from the native input. Handles can meet but not cross. The
 * top handle sitting at the domain max reads as "no upper limit": when the data
 * has clamped outliers (`hardMax > max`) the value shows as e.g. "105+".
 */
export function RangeSlider({
  label,
  unit,
  domain,
  value,
  onChange,
  onCommit,
}: Props) {
  const titleId = useId();
  const [lo, hi] = value;
  const span = Math.max(1, domain.max - domain.min);
  const leftPct = ((lo - domain.min) / span) * 100;
  const rightPct = 100 - ((hi - domain.min) / span) * 100;

  const atTopBucket = hi >= domain.max && domain.hardMax > domain.max;
  const hiLabel = atTopBucket ? `${hi}+` : `${hi}`;

  const setLo = (raw: number) => onChange([Math.min(raw, hi), hi]);
  const setHi = (raw: number) => onChange([lo, Math.max(raw, lo)]);
  // A pointer release / key-up commits the (heavier) list re-render.
  const commit = () => onCommit(value);

  return (
    <div className="flex flex-col gap-2" aria-labelledby={titleId}>
      <div className="flex items-baseline justify-between">
        <span
          id={titleId}
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
        >
          {label}
        </span>
        <span className="font-mono text-[12px] text-text">
          {lo} – {hiLabel} {unit}
        </span>
      </div>

      <div className="relative flex h-5 items-center">
        {/* drawn track + active fill (the inputs above are click-through) */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        <div
          className="absolute h-1 rounded-full bg-sel"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        <input
          type="range"
          className="rw-range"
          aria-label={`Minimum ${label.toLowerCase()}`}
          min={domain.min}
          max={domain.max}
          step={5}
          value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
        <input
          type="range"
          className="rw-range"
          aria-label={`Maximum ${label.toLowerCase()}`}
          min={domain.min}
          max={domain.max}
          step={5}
          value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </div>

      <div className="flex justify-between font-mono text-[10.5px] text-muted">
        <span>{domain.min}</span>
        <span>
          {domain.hardMax > domain.max ? `${domain.max}+` : domain.max} {unit}
        </span>
      </div>
    </div>
  );
}
