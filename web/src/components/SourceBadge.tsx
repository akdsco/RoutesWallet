import type { RouteSource } from '../types.ts';
import { SOURCE_META } from '../lib/source.ts';

// Trust badge: club-agnostic label + a look that survives greyscale (border/dash
// + glyph carry the meaning, never colour alone). Shared by the route card and
// the selected-route detail so the two can't drift apart.
const base =
  'inline-flex items-center gap-1.5 rounded-[3px] px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]';

const STYLE: Record<RouteSource, { cls: string; glyph: string }> = {
  'club-verified': {
    cls: 'border border-trust bg-trust-soft text-trust',
    glyph: '✓ ',
  },
  'club-member': { cls: 'border border-trust text-trust', glyph: '' },
  'third-party': {
    cls: 'border border-dashed border-muted text-muted',
    glyph: '',
  },
};

export function SourceBadge({ source }: { source: RouteSource }) {
  const s = STYLE[source];
  return (
    <span className={`${base} ${s.cls}`}>
      {s.glyph}
      {SOURCE_META[source].label}
    </span>
  );
}
