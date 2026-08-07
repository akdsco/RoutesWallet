type Props = {
  poiTypes: ReadonlySet<string>;
  onToggle: (t: string) => void;
  /** 'sm' over the map (desktop); 'touch' = 44px hit area in the mobile sheet. */
  size?: 'sm' | 'touch';
  className?: string;
};

const CHIPS = [
  ['cafe', '☕', 'Cafés'],
  ['toilet', '🚻', 'Toilets'],
  ['water', '💧', 'Water'],
  ['station', '🚉', 'Stations'],
] as const;

/** Facility-layer toggles (café / toilet / water / station). Presentation only —
 *  the enabled-set + toggle handler live in App, so it renders identically over
 *  the map (desktop) or as a scrolling row in the bottom sheet (mobile). */
export function PoiChips({
  poiTypes,
  onToggle,
  size = 'sm',
  className,
}: Props) {
  const sizing = size === 'touch' ? 'min-h-11 px-3 py-1.5' : 'px-2.5 py-1';
  return (
    <div className={className}>
      {CHIPS.map(([t, icon, label]) => {
        const on = poiTypes.has(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            title={label}
            onClick={() => onToggle(t)}
            className={`flex flex-none items-center gap-1 rounded-full border text-[12px] transition-colors ${sizing} ${
              on
                ? 'border-line bg-surface text-text'
                : 'border-line bg-surface/60 text-muted opacity-60'
            }`}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
