/**
 * Contributor attribution for a route's owner. The owner (`owner_name` +
 * `owner_strava_id`) is already on the Route contract; these pure helpers turn it
 * into what the card / detail render. Presentation only — no data change.
 */

/**
 * The contributor's display name, shown verbatim (trimmed only) — whatever name a
 * contributor has, incl. a club tag like "Arkadiusz | HV", is displayed as-is (no
 * normalisation, by the ticket owner's call). Returns `null` when there is no name
 * so the UI omits the byline cleanly rather than rendering "by undefined".
 */
export function contributorName(ownerName?: string): string | null {
  const name = ownerName?.trim();
  return name ? name : null;
}

/**
 * The contributor's Strava profile URL, or `null` when there's no usable id. The id
 * comes from the CDN (outside the type system), so guard it: only an all-digits id
 * builds a link — a malformed value yields `null` rather than a junk/unsafe href.
 */
export function stravaProfileUrl(ownerStravaId?: string): string | null {
  return ownerStravaId && /^\d+$/.test(ownerStravaId)
    ? `https://www.strava.com/athletes/${ownerStravaId}`
    : null;
}
