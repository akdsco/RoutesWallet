import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  snapHeights,
  resolveSnap,
  cycleSnap,
  type Snap,
} from '../lib/sheet.ts';

type Props = {
  /** Current committed snap. */
  snap: Snap;
  /** Reachable snaps for the mode (shortest→tallest), from snapsFor(). */
  snaps: Snap[];
  onSnapChange: (s: Snap) => void;
  children: ReactNode;
};

const EASE = 'transform 220ms cubic-bezier(.32,.72,0,1)';
const TAP_SLOP = 6; // px of movement below which a release is a tap, not a drag

/**
 * Google-Maps-style bottom sheet (Claude Design §B/§F). Map-primary; the sheet
 * rests at one of the reachable snaps. Drag the handle to move it, or tap the
 * handle to cycle snaps — every stop is reachable without a gesture. Transform is
 * driven imperatively during a drag so the (long) route list never re-renders per
 * frame. The reachable set depends on mode: selecting a route floors it at detail.
 */
export function BottomSheet({ snap, snaps, onSnapChange, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [vh, setVh] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ease = reduceMotion ? 'none' : EASE;

  // Track the visual viewport so the snap maths follow the mobile URL bar.
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const heights = snapHeights(vh);
  const restY = (s: Snap) => vh - heights[s]; // translateY that leaves height[s] visible
  const shortest = snaps[0]!; // most closed reachable snap
  const tallest = snaps[snaps.length - 1]!; // most open reachable snap
  const minY = restY(tallest);
  const maxY = restY(shortest);

  const drag = useRef({
    active: false,
    startPointer: 0,
    startY: 0,
    lastPointer: 0,
    lastTime: 0,
    velocity: 0, // px of height-change per ms; + = expanding
    moved: false,
  });
  const suppressClick = useRef(false);

  // Rest the sheet at the committed snap whenever it (or the viewport / mode)
  // changes, unless a drag is currently in control of the transform.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || drag.current.active) return;
    el.style.transition = ease;
    el.style.transform = `translateY(${restY(snap)}px)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh, snaps.join(',')]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
    drag.current = {
      active: true,
      startPointer: e.clientY,
      startY: restY(snap),
      lastPointer: e.clientY,
      lastTime: e.timeStamp,
      velocity: 0,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d.active || !el) return;
    const delta = e.clientY - d.startPointer;
    const y = Math.max(minY, Math.min(maxY, d.startY + delta));
    el.style.transform = `translateY(${y}px)`;
    if (Math.abs(delta) > TAP_SLOP) d.moved = true;
    const dt = e.timeStamp - d.lastTime;
    if (dt > 0) d.velocity = -(e.clientY - d.lastPointer) / dt;
    d.lastPointer = e.clientY;
    d.lastTime = e.timeStamp;
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const y = Math.max(
      minY,
      Math.min(maxY, d.startY + (e.clientY - d.startPointer))
    );
    const next = resolveSnap(vh - y, d.velocity, heights, snaps);
    if (d.moved) {
      suppressClick.current = true; // a real drag — don't let the click cycle too
      const el = sheetRef.current;
      if (el) {
        el.style.transition = ease;
        el.style.transform = `translateY(${restY(next)}px)`;
      }
    }
    onSnapChange(next);
  };

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSnapChange(cycleSnap(snap, snaps)); // tap (or keyboard) cycles snaps
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && snap === tallest && snaps.includes('mid')) {
      e.preventDefault();
      onSnapChange('mid');
    }
  };

  const nextIsCollapse = cycleSnap(snap, snaps) === shortest;

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="false"
      aria-label="Routes"
      className="fixed inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-[10px] border-t border-line bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.18)] will-change-transform"
      style={{ height: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        aria-label={
          nextIsCollapse ? 'Collapse route list' : 'Expand route list'
        }
        aria-expanded={snap !== shortest}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="flex min-h-11 w-full flex-none touch-none items-center justify-center rounded-t-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sel"
      >
        <span aria-hidden="true" className="h-1 w-9 rounded-full bg-line" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
