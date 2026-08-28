export type RouteScope = 'all' | 'mine';

type Props = {
  value: RouteScope;
  onChange: (scope: RouteScope) => void;
};

const OPTIONS: { scope: RouteScope; label: string }[] = [
  { scope: 'all', label: 'All routes' },
  { scope: 'mine', label: 'My routes' },
];

/**
 * The "my routes vs all club routes" switch (TB-116), shown to signed-in members.
 * A two-option segmented control expressed as pressed-state buttons — assistive
 * tech reads the active view from `aria-pressed`, not from styling.
 */
export function RouteScopeToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Which routes to show"
      className="inline-flex rounded-lg border border-border p-0.5 text-[12px] font-medium"
    >
      {OPTIONS.map(({ scope, label }) => {
        const active = value === scope;
        return (
          <button
            key={scope}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(scope)}
            className={`rounded-md px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
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
  );
}
