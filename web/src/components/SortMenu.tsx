import { useEffect, useRef, useState } from 'react';
import { SORT_OPTIONS, sortOption, type SortKey } from '../lib/sort.ts';

type Props = {
  value: SortKey;
  /** 'Nearest first' needs a searched place; disabled (with a hint) without one. */
  hasSearch: boolean;
  /** Flattest/Hilliest need elevation in the data; disabled if none has it. */
  hasElevation: boolean;
  onPick: (key: SortKey) => void;
};

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2.5,4.5 6,8 9.5,4.5" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sel"
      aria-hidden="true"
    >
      <polyline points="1,6 4.5,9.5 11,2.5" />
    </svg>
  );
}

/**
 * The sort control on the count row — a text trigger opening a radio menu.
 * Mirrors the §C basemap popover's a11y exactly: `role="menu"` with
 * `aria-checked` items, arrow-nav (skipping disabled options), Home/End, and
 * Esc/Tab return focus to the trigger. Sort orders survivors; it never filters.
 */
export function SortMenu({ value, hasSearch, hasElevation, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const disabledAt = (i: number) => {
    const o = SORT_OPTIONS[i]!;
    return (o.needsSearch && !hasSearch) || (o.needsElevation && !hasElevation);
  };
  const activeIdx = SORT_OPTIONS.findIndex((o) => o.key === value);

  const step = (from: number, dir: 1 | -1) => {
    const n = SORT_OPTIONS.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + dir * k + n * k) % n;
      if (!disabledAt(i)) return i;
    }
    return from;
  };

  const openMenu = () => {
    setFocusIdx(
      activeIdx >= 0 && !disabledAt(activeIdx) ? activeIdx : step(-1, 1)
    );
    setOpen(true);
  };
  const closeMenu = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (key: SortKey) => {
    onPick(key);
    closeMenu();
  };

  useEffect(() => {
    if (open) optionRefs.current[focusIdx]?.focus();
  }, [open, focusIdx]);

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
        setFocusIdx((i) => step(i, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIdx((i) => step(i, -1));
        break;
      case 'Home':
        e.preventDefault();
        setFocusIdx(step(-1, 1));
        break;
      case 'End':
        e.preventDefault();
        setFocusIdx(step(SORT_OPTIONS.length, -1));
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu(false);
        break;
    }
  };

  const current = sortOption(value);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort: ${current.short}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKey}
        className="flex items-center gap-1 font-medium text-[12px] text-text-2 hover:text-text"
      >
        {current.short}
        <Chevron />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sort routes"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-[600] mt-1 w-[220px] overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
        >
          {SORT_OPTIONS.map((o, i) => {
            const on = o.key === value;
            const disabled = disabledAt(i);
            const firstElevation =
              o.needsElevation && !SORT_OPTIONS[i - 1]?.needsElevation;
            return (
              <div key={o.key}>
                {firstElevation && (
                  <div className="my-1 h-px bg-line-2" role="separator" />
                )}
                <button
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  aria-disabled={disabled || undefined}
                  tabIndex={focusIdx === i ? 0 : -1}
                  onClick={() => !disabled && pick(o.key)}
                  onFocus={() => setFocusIdx(i)}
                  className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-2 text-left text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sel ${
                    on
                      ? 'border-sel bg-sel-soft font-semibold text-text'
                      : 'border-transparent text-text-2 hover:bg-surface-2'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  <span className="w-3 flex-none">{on && <Tick />}</span>
                  <span className="flex-1">{o.label}</span>
                  {disabled && o.needsSearch && (
                    <span className="text-[11px] text-muted">
                      needs a place
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
