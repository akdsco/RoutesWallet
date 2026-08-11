type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  onClear: () => void;
  onFocusChange: (focused: boolean) => void;
  /** Container (the "card") classes — lets the mobile floating bar restyle it
   *  (elevated surface, flex-1) while desktop keeps the inset field look. */
  className?: string;
  /** Accessible name for the input. Desktop wraps it in a visible <label>; the
   *  mobile floating bar has no visible label, so it passes this so the field
   *  isn't announced as unlabelled (WCAG 3.3.2 / 4.1.2). */
  ariaLabel?: string;
};

const DEFAULT_FIELD =
  'flex h-11 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-sel';

/** The place-search input row (magnifier · input · clear ×). Shared by the
 *  desktop sidebar header and the mobile floating search bar; the parent owns the
 *  <form> + submit so Enter geocodes in both. Keeps id="q" (App's Esc handler and
 *  the label reference it). */
export function SearchField({
  query,
  onQueryChange,
  onClear,
  onFocusChange,
  className,
  ariaLabel,
}: Props) {
  return (
    <div className={className ?? DEFAULT_FIELD}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="4.6" stroke="var(--muted)" strokeWidth="1.6" />
        <line
          x1="10.6"
          y1="10.6"
          x2="14"
          y2="14"
          stroke="var(--muted)"
          strokeWidth="1.6"
        />
      </svg>
      <input
        id="q"
        aria-label={ariaLabel}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder="e.g. Box Hill or EN11"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-muted"
      />
      {query.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="-mr-1 flex h-11 w-8 items-center justify-center text-[15px] text-muted hover:text-text"
        >
          ×
        </button>
      )}
    </div>
  );
}
