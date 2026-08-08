import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BASEMAP_ORDER,
  BASEMAPS,
  DARK_CAVEAT,
  showsDarkCaveat,
  type BasemapId,
} from '../lib/basemaps.ts';

type Props = {
  basemap: BasemapId;
  theme: 'light' | 'dark';
  onChange: (id: BasemapId) => void;
};

/** Three-layer stack — the conventional "map layers" glyph on the trigger. */
function LayersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 22 8 12 14 2 8z" />
      <path d="M2 12 12 18 22 12" />
      <path d="M2 16 12 22 22 16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-sel"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Stylised style previews — decorative, so nobody has to guess what a name looks like. */
function BasemapThumb({ id }: { id: BasemapId }) {
  return (
    <span
      className="block h-9 w-[52px] shrink-0 overflow-hidden rounded border border-line"
      aria-hidden="true"
    >
      {id === 'cyclosm' ? (
        <svg viewBox="0 0 52 36" className="h-full w-full">
          <rect width="52" height="36" fill="#dfeccb" />
          <rect x="30" y="2" width="20" height="16" fill="#cfe0b4" />
          <path d="M5 32 L46 5" stroke="#d63384" strokeWidth="2" fill="none" />
          <path
            d="M2 16 L34 34"
            stroke="#d63384"
            strokeWidth="1.6"
            strokeDasharray="3 2"
            fill="none"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 52 36" className="h-full w-full">
          <rect width="52" height="36" fill="#e9edf0" />
          <rect x="30" y="4" width="16" height="11" fill="#d3e6d1" />
          <path
            d="M0 24 Q 20 16 52 26"
            stroke="#ffffff"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M16 0 L23 36"
            stroke="#ffffff"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      )}
    </span>
  );
}

/**
 * Basemap switcher — a popover, not a pill (v2 design, spec C). A segmented pill
 * can't carry what each option needs: a thumbnail, a one-line description, its
 * own credit, and — for CyclOSM in dark — a caveat. The trigger shows the active
 * style so it reads without opening; the popover is a keyboard-navigable radio
 * menu. It scales to the N basemaps the config already supports.
 *
 * The popover per-option credit sits alongside, never replaces, the legal
 * attribution in the map's bottom bar (that stays owned by Leaflet / RouteMap).
 */
export function BasemapControl({ basemap, theme, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = BASEMAPS[basemap];
  const caveat = showsDarkCaveat(basemap, theme);
  const activeIdx = useMemo(() => BASEMAP_ORDER.indexOf(basemap), [basemap]);

  const openMenu = () => {
    setFocusIdx(activeIdx);
    setOpen(true);
  };
  const closeMenu = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const select = (id: BasemapId) => {
    onChange(id);
    closeMenu();
  };

  // Move DOM focus to the roving option while the menu is open.
  useEffect(() => {
    if (open) optionRefs.current[focusIdx]?.focus();
  }, [open, focusIdx]);

  // Close on a click/tap outside the control.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusIdx((i) => (i + 1) % BASEMAP_ORDER.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIdx(
          (i) => (i - 1 + BASEMAP_ORDER.length) % BASEMAP_ORDER.length
        );
        break;
      case 'Home':
        e.preventDefault();
        setFocusIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIdx(BASEMAP_ORDER.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu(false); // let focus leave naturally
        break;
    }
  };

  return (
    <div ref={rootRef} className="absolute bottom-6 right-5 z-[600]">
      {open && (
        <div
          role="menu"
          aria-label="Map style"
          onKeyDown={onMenuKey}
          className="absolute bottom-full right-0 mb-2 w-[300px] overflow-hidden rounded-lg border border-line bg-surface"
        >
          <div className="border-b border-line px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Map style
          </div>
          {BASEMAP_ORDER.map((id, i) => {
            const def = BASEMAPS[id];
            const on = id === basemap;
            return (
              <button
                key={id}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                tabIndex={focusIdx === i ? 0 : -1}
                onClick={() => select(id)}
                onFocus={() => setFocusIdx(i)}
                className={`flex w-full gap-3 border-l-[3px] px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sel ${
                  on
                    ? 'border-sel bg-sel-soft'
                    : 'border-transparent hover:bg-surface-2'
                }`}
              >
                <BasemapThumb id={id} />
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium text-text">
                    {def.label}
                    {on && <CheckIcon />}
                  </span>
                  <span className="text-[12px] leading-snug text-text-2">
                    {def.description}
                  </span>
                  <span className="text-[11px] text-muted">{def.credit}</span>
                </span>
              </button>
            );
          })}
          {caveat && (
            <div className="flex items-start gap-2 border-t border-line px-3.5 py-2.5 text-[12px] leading-snug text-text-2">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-marker"
                aria-hidden="true"
              >
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              {DARK_CAVEAT}
            </div>
          )}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKey}
        className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[13px] font-medium text-text"
      >
        <LayersIcon />
        {active.label}
      </button>

      {/* Announce the choice (and any caveat) to assistive tech, like the legend. */}
      <span className="sr-only" aria-live="polite">
        {`${active.label} basemap${caveat ? `. ${DARK_CAVEAT}` : ''}`}
      </span>
    </div>
  );
}
