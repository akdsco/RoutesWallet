import type { RouteSource } from '../types.ts';
import { SOURCE_META } from '../lib/source.ts';

/**
 * Trust as a ring glyph beside the route name (§H): ring + tick = verified,
 * plain ring = member, dashed ring = third-party. Shape carries the meaning so it
 * survives greyscale (§1.3); colour (trust teal / muted) is secondary. The blurb
 * is the accessible name, so AT hears the tier, not "image".
 */
export function TrustGlyph({
  source,
  className = '',
}: {
  source: RouteSource;
  className?: string;
}) {
  const verified = source === 'club-verified';
  const dashed = source === 'third-party';
  const stroke = dashed ? 'var(--muted)' : 'var(--trust)';
  return (
    <svg
      role="img"
      aria-label={SOURCE_META[source].blurb}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      className={`flex-none ${className}`}
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray={dashed ? '2.5 2' : undefined}
      />
      {verified && (
        <path
          d="M5 8.2 L7 10.2 L11 5.8"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
