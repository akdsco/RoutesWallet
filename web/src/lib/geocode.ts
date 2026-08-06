// A tiny built-in gazetteer so the seeded demo places resolve instantly and offline.
// Anything else falls back to Nominatim (OpenStreetMap's free geocoder).
const GAZETTEER: Record<string, [number, number]> = {
  girona: [2.8214, 41.9794],
  cambridge: [0.1218, 52.2053],
  london: [-0.1276, 51.5072],
  banyoles: [2.75, 42.12],
  alcudia: [3.12, 39.85],
  "port d'alcudia": [3.12, 39.85],
  mallorca: [2.98, 39.62],
};

/** Resolve a known place name to [lng, lat], or null. Pure — unit tested. */
export function gazetteerLookup(query: string): [number, number] | null {
  return GAZETTEER[query.trim().toLowerCase()] ?? null;
}

/**
 * Pull an ISO-3166-1 alpha-2 country (lowercase) from a list of BCP-47 locales,
 * e.g. ['en-GB'] -> 'gb'. Skips language-only tags ('en'). Pure — unit tested.
 */
export function countryFromLocales(
  locales: readonly string[]
): string | undefined {
  for (const locale of locales) {
    const m = /-([A-Za-z]{2})(?:$|[-_])/.exec(locale);
    if (m && m[1]) return m[1].toLowerCase();
  }
  return undefined;
}

/** The user's country from the browser locale — used to bias geocoding. */
export function userCountry(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const langs =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  return countryFromLocales(langs.filter((l): l is string => Boolean(l)));
}

type NominatimHit = { lon: string; lat: string };

async function nominatim(
  query: string,
  country?: string
): Promise<[number, number] | null> {
  const params = new URLSearchParams({ format: 'json', limit: '1', q: query });
  if (country) params.set('countrycodes', country);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const hits = (await res.json()) as NominatimHit[];
  const [hit] = hits;
  if (!hit) return null;
  return [parseFloat(hit.lon), parseFloat(hit.lat)];
}

/**
 * Resolve a place to [lng, lat]: gazetteer first, then Nominatim biased to the
 * user's country (so "Epping" finds Epping Forest for a GB user, and Epping in
 * Moselle for an FR user), falling back to a global search if nothing local.
 */
export async function geocode(
  query: string,
  country = userCountry()
): Promise<[number, number] | null> {
  const local = gazetteerLookup(query);
  if (local) return local;

  if (country) {
    const biased = await nominatim(query, country);
    if (biased) return biased;
  }
  return nominatim(query);
}
