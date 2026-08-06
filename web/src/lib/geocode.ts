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

type NominatimHit = { lon: string; lat: string };

/** Resolve a place to [lng, lat]: gazetteer first, then Nominatim. */
export async function geocode(query: string): Promise<[number, number] | null> {
  const local = gazetteerLookup(query);
  if (local) return local;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const hits = (await res.json()) as NominatimHit[];
  const [hit] = hits;
  if (!hit) return null;
  return [parseFloat(hit.lon), parseFloat(hit.lat)];
}
