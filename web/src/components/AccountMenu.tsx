import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar.tsx';

export type ThemeChoice = 'light' | 'dark' | 'system';

type Props = {
  name: string;
  photo?: string;
  /** The current appearance choice (may be 'system'). */
  theme: ThemeChoice;
  onSetTheme: (theme: ThemeChoice) => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/**
 * The account avatar + its menu (account redesign). Signed in, the avatar takes
 * the theme toggle's corner and theme moves in here — a promotion, not a
 * demotion. The menu carries identity, Settings, Sign out, and a three-way
 * Appearance segment. `role=menu`, Esc closes and returns focus to the avatar.
 * "Sync now" deliberately lives in Settings, not here (a mis-tap that signs you
 * out mid-sync is a bad trade).
 */
export function AccountMenu({
  name,
  photo,
  theme,
  onSetTheme,
  onOpenSettings,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account, ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sel"
      >
        <Avatar name={name} photo={photo} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+8px)] z-[1000] w-[236px] rounded-[11px] border border-line bg-surface p-1.5 shadow-lg"
        >
          <div className="px-2.5 py-2">
            <p className="text-[14px] font-semibold text-text-2">{name}</p>
            <p className="text-[12px] text-muted">Strava connected ✓</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onOpenSettings();
            }}
            className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-text-2 hover:bg-surface-2"
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-text-2 hover:bg-surface-2"
          >
            Sign out
          </button>
          <div className="my-1 border-t border-line" />
          <div className="px-2.5 py-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
              Appearance
            </p>
            <div
              role="group"
              aria-label="Appearance"
              className="inline-flex rounded-lg border border-line p-0.5 text-[12px] font-medium"
            >
              {THEMES.map(({ value, label }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSetTheme(value)}
                    className={`rounded-md px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
                      active
                        ? 'bg-surface-2 text-text-2'
                        : 'text-muted hover:text-text-2'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
