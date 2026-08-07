/**
 * Sanitisers for untrusted data that reaches the DOM. Route data (routes.geojson)
 * and POI data (pois.geojson, world-editable OpenStreetMap) are treated as
 * untrusted: names flow into Leaflet markers/labels and links into <a href>.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a string for safe interpolation into an HTML string (e.g. divIcon html). */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/**
 * Return `url` only if it's an http(s) or protocol-relative link; otherwise '#'.
 * Blocks `javascript:`, `data:`, etc. from ever landing in an href. Relative
 * links resolve against a dummy base (we only care about the resulting scheme).
 */
export function safeHref(url: string): string {
  try {
    const u = new URL(url, 'https://base.invalid/');
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}
