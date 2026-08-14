import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  snapHeights,
  resolveSnap,
  cycleSnap,
  settleVelocity,
  visibleContentPx,
  type Snap,
} from '../lib/sheet.ts';

type Props = {
  /** Current committed snap. */
  snap: Snap;
  /** Reachable snaps for the mode (shortest→tallest), from snapsFor(). */
  snaps: Snap[];
  /** Viewport height (px) — shared with App so both measure the sheet identically
   *  (one resize subscription, no dvh-vs-innerHeight drift). */
  vh: number;
  /** Content-fit height for the `detail` snap (§H): overrides the fixed detail
   *  height so the selected-route sheet opens exactly as far as its content needs
   *  (clampDetailPx). Absent → the fixed DETAIL_PX. */
  detailPx?: number;
  /** Cap the content region to the visible window (snapHeights[snap] − handle)
   *  instead of letting it fill the 100dvh sheet. A view that pins a footer to
   *  its foot (the mobile filter form) needs this so the footer lands at the
   *  visible bottom edge, not off-screen below it (TB-66). The list/detail leave
   *  it off and fill, so peek's drag-to-reveal choreography is untouched. */
  constrainToSnap?: boolean;
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
export function BottomSheet({
  snap,
  snaps,
  vh,
  detailPx,
  constrainToSnap = false,
  onSnapChange,
  children,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ease = reduceMotion ? 'none' : EASE;

  // §H: the detail snap is content-fit, so let App override its height; the rest
  // are fixed. Everything downstream (rest position, drag clamp, snap resolution)
  // reads this map, so the override flows through with no other change.
  const base = snapHeights(vh);
  const heights = detailPx != null ? { ...base, detail: detailPx } : base;
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
  // Timestamp of the last drag-end. A drag emits a trailing click the browser
  // fires ~immediately; we ignore a click within this window so a drag doesn't
  // also cycle. A LATER activation (tap, keyboard, or an AT/screen-reader click,
  // which is why cycling lives in onClick not onPointerUp) is well outside it.
  const dragEndAt = useRef(-Infinity);

  // Rest the sheet at the committed snap whenever it (or the viewport / mode)
  // changes, unless a drag is currently in control of the transform. The FIRST
  // placement is instant (no transition) so the sheet simply appears at peek on
  // load instead of sliding up from the bottom edge; later changes animate.
  const didInit = useRef(false);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || drag.current.active) return;
    el.style.transition = didInit.current ? ease : 'none';
    el.style.transform = `translateY(${restY(snap)}px)`;
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh, snaps.join(','), detailPx]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom / environments without pointer capture — drag still works via events
    }
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
    if (!d.moved) return; // a tap — the click event cycles (see onClick)
    const y = Math.max(
      minY,
      Math.min(maxY, d.startY + (e.clientY - d.startPointer))
    );
    // If the finger paused before lifting, the last-sampled velocity is stale —
    // the user meant to settle here, not throw (settleVelocity zeroes it).
    const velocity = settleVelocity(e.timeStamp - d.lastTime, d.velocity);
    const next = resolveSnap(vh - y, velocity, heights, snaps);
    dragEndAt.current = e.timeStamp; // ignore the trailing click this drag emits
    const el = sheetRef.current;
    if (el) {
      el.style.transition = ease;
      el.style.transform = `translateY(${restY(next)}px)`;
    }
    onSnapChange(next);
  };

  // Tap / mouse / keyboard / screen-reader activation all arrive here as a click
  // (that's why cycling lives in onClick, not onPointerUp — AT dispatches a click,
  // not pointer events). Only the trailing click of a just-finished drag is ignored.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.timeStamp - dragEndAt.current < 250) return;
    onSnapChange(cycleSnap(snap, snaps));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // Enter/Space already reach onClick via the button's native activation; here
    // we only add Esc-from-the-top → mid.
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
        className="flex min-h-7 w-full flex-none touch-none items-center justify-center rounded-t-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sel"
      >
        <span aria-hidden="true" className="h-1 w-9 rounded-full bg-line" />
      </button>
      <div
        // constrainToSnap: fixed height (visible window) so a pinned footer lands
        // at the visible bottom; otherwise flex-1 to fill the 100dvh sheet.
        className={`flex min-h-0 flex-col${constrainToSnap ? '' : ' flex-1'}`}
        style={
          constrainToSnap
            ? { height: `${visibleContentPx(vh, snap)}px` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
