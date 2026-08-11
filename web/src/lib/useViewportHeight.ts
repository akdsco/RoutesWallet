import { useEffect, useState } from 'react';

/**
 * The current viewport height in px (`window.innerHeight`), kept live as the
 * mobile URL bar shows/hides and on rotation. Shared by the sheet (which drives
 * its transform from this) and the layers button (which rides the sheet edge) so
 * they agree on one measure — mixing dvh with innerHeight detaches them when the
 * URL bar is visible.
 */
export function useViewportHeight(): number {
  const [vh, setVh] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);
  return vh;
}
