import { useState } from 'react';
import type { ThemeChoice } from './AccountMenu.tsx';
import type { Units } from '../lib/units.ts';

type Props = {
  name: string;
  /** e.g. "Last synced 2 days ago · 110 of yours" or "Not synced yet". */
  lastSyncedLabel: string;
  syncing: boolean;
  ownedCount: number;
  theme: ThemeChoice;
  onSetTheme: (theme: ThemeChoice) => void;
  units: Units;
  onSetUnits: (units: Units) => void;
  onDisconnect: () => void;
  onBack: () => void;
};

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-line py-2.5">
      <span className="text-[13px] text-text-2">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-lg border border-line p-0.5 text-[12px] font-medium"
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`rounded-md px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
                active
                  ? 'bg-surface-2 text-text-2'
                  : 'text-muted hover:text-text-2'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GroupTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
      {children}
    </h3>
  );
}

/**
 * Settings (account redesign) — replaces the list, like route detail. A titled
 * group of hairline-separated rows with controls right-aligned; the shape holds
 * as more settings arrive. Today: Strava (Sync now + last-synced, Connected
 * account + Disconnect) and Appearance (Theme, Units).
 */
export function SettingsPanel({
  name,
  lastSyncedLabel,
  syncing,
  ownedCount,
  theme,
  onSetTheme,
  units,
  onSetUnits,
  onDisconnect,
  onBack,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-label="Settings" className="flex flex-col gap-5 px-6 py-5">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[13px] font-medium text-text-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ← Back to routes
      </button>
      <h2 className="text-[15px] font-semibold text-text-2">Settings</h2>

      <div>
        <GroupTitle>Strava</GroupTitle>
        <div className="mt-1.5 flex items-center justify-between border-t border-line py-2.5">
          <div>
            <p className="text-[13px] text-text-2">Sync my routes</p>
            <p className="text-[12px] text-muted">{lastSyncedLabel}</p>
          </div>
          {syncing ? (
            <span className="rounded-md border border-line px-3 py-1.5 text-[13px] font-medium text-muted">
              Syncing…
            </span>
          ) : (
            <a
              href="/connect/start"
              className="rounded-md border border-line px-3 py-1.5 text-[13px] font-medium text-text-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sync now
            </a>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line py-2.5">
          <div>
            <p className="text-[12px] text-muted">Connected account</p>
            <p className="text-[13px] text-text-2">{name}</p>
          </div>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">
                Your {ownedCount} routes stay in the library.
              </span>
              <button
                type="button"
                onClick={onDisconnect}
                className="text-[13px] font-semibold text-text-2 hover:text-text"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[13px] text-muted hover:text-text-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-[13px] font-medium text-muted hover:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div>
        <GroupTitle>Appearance</GroupTitle>
        <Segment
          label="Theme"
          value={theme}
          onChange={onSetTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
        <Segment
          label="Units"
          value={units}
          onChange={onSetUnits}
          options={[
            { value: 'km', label: 'km' },
            { value: 'mi', label: 'mi' },
          ]}
        />
      </div>
    </section>
  );
}
