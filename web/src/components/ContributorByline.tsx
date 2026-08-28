import { safeHref } from '../lib/sanitize.ts';
import { contributorName, stravaProfileUrl } from '../lib/contributor.ts';

/**
 * Contributor attribution shown on the selected-route detail (§TB-114): "by {owner}",
 * where the name links to the athlete's Strava profile when we have a usable id, and
 * **degrades to plain text** (never a junk link) when the id is missing/garbage. This
 * single component is the one home for that fail-safe degrade so the desktop and
 * mobile detail panels can't drift apart. Renders `null` when the route has no owner.
 */
export function ContributorByline({
  ownerName,
  ownerStravaId,
}: {
  ownerName?: string;
  ownerStravaId?: string;
}) {
  const owner = contributorName(ownerName);
  if (!owner) return null;
  const profile = stravaProfileUrl(ownerStravaId);

  return (
    <p className="text-[12.5px] text-muted">
      by{' '}
      {profile ? (
        <a
          href={safeHref(profile)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${owner} on Strava`}
          className="font-medium text-text-2 underline decoration-line-2 underline-offset-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sel"
        >
          {owner}
        </a>
      ) : (
        <span className="font-medium text-text-2">{owner}</span>
      )}
    </p>
  );
}
