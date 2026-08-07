import { useEffect, useState } from 'react';

/**
 * Track a CSS media query. Reads synchronously on mount (no first-paint flash of
 * the wrong layout) and stays live as the viewport changes / the device rotates.
 * Guarded for non-browser environments (SSR, jsdom without matchMedia).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // resync in case the query changed between render and effect
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
