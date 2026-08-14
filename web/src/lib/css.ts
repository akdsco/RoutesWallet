/**
 * `CSS.escape` for building attribute selectors from untrusted values (route ids),
 * guarded for environments without it (older jsdom). Use for any
 * `querySelector(\`[data-…="${value}"]\`)` so an id with a quote or special char
 * can't produce an invalid selector that throws.
 */
export function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value;
}
