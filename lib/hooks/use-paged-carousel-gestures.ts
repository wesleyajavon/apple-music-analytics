"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** Horizontal move before locking the gesture (vs vertical page scroll). */
const SWIPE_AXIS_LOCK_PX = 8;
/** Drag distance that suppresses the following tile click / link activation. */
const SWIPE_CLICK_SUPPRESS_PX = 12;
/** Fraction of viewport width required to change page (without a fast flick). */
const SWIPE_PAGE_RATIO = 0.22;
/** Flick velocity (px/ms) that changes page even with a shorter drag. */
const SWIPE_VELOCITY_PX_PER_MS = 0.45;
/** Soft resistance when dragging past the first/last page. */
const SWIPE_EDGE_RESISTANCE = 0.35;
/** Accumulated trackpad/mouse-wheel deltaX before changing page. */
const WHEEL_PAGE_THRESHOLD_PX = 48;
/** Ignore further wheel paging briefly so trackpad inertia does not skip pages. */
const WHEEL_PAGE_COOLDOWN_MS = 420;
/**
 * Treat wheel as horizontal when |deltaX| clears this, even if a bit of deltaY
 * is mixed in (common on Mac trackpads).
 */
const WHEEL_HORIZONTAL_MIN_PX = 2;
/** Vertical must dominate by this factor to leave the gesture to page scroll. */
const WHEEL_VERTICAL_DOMINANCE = 1.35;

type SwipeAxis = "undecided" | "horizontal" | "vertical";

type SwipeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  axis: SwipeAxis;
  width: number;
  offsetPx: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resistEdgeOffset(offsetPx: number, page: number, pageCount: number): number {
  if (page <= 0 && offsetPx > 0) return offsetPx * SWIPE_EDGE_RESISTANCE;
  if (page >= pageCount - 1 && offsetPx < 0) return offsetPx * SWIPE_EDGE_RESISTANCE;
  return offsetPx;
}

function isHorizontalWheelIntent(event: WheelEvent, horizontalDelta: number): boolean {
  if (event.shiftKey) return horizontalDelta !== 0;
  const absX = Math.abs(horizontalDelta);
  const absY = Math.abs(event.deltaY);
  if (absX < WHEEL_HORIZONTAL_MIN_PX) return false;
  // Mac trackpads often mix a little deltaY into sideways flicks.
  return absX >= absY || absY < absX * WHEEL_VERTICAL_DOMINANCE;
}

/**
 * Pointer swipe + trackpad/mouse-wheel paging for horizontal page carousels.
 * Attach `viewportProps` to the overflow-hidden track viewport.
 */
export function usePagedCarouselGestures({
  pageCount,
  safePage,
  goTo,
  resetKey,
}: {
  pageCount: number;
  safePage: number;
  goTo: (page: number) => void;
  /** When this changes (e.g. item ids), wipe in-flight gesture state. */
  resetKey: string;
}): {
  viewportRef: RefObject<HTMLDivElement>;
  dragOffsetPx: number;
  isDragging: boolean;
  viewportProps: {
    onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onClickCapture?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  };
} {
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const safePageRef = useRef(safePage);
  const pageCountRef = useRef(pageCount);
  const swipeRef = useRef<SwipeSession | null>(null);
  const suppressClickRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const wheelCooldownUntilRef = useRef(0);
  const goToRef = useRef(goTo);

  safePageRef.current = safePage;
  pageCountRef.current = pageCount;
  goToRef.current = goTo;

  useEffect(() => {
    setDragOffsetPx(0);
    setIsDragging(false);
    swipeRef.current = null;
    wheelAccumRef.current = 0;
    wheelCooldownUntilRef.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pageCount <= 1) return;

    const onWheel = (event: WheelEvent) => {
      const deltaX = event.deltaX;
      const deltaY = event.deltaY;
      const horizontalDelta = event.shiftKey && deltaX === 0 ? deltaY : deltaX;

      if (!isHorizontalWheelIntent(event, horizontalDelta)) {
        wheelAccumRef.current = 0;
        return;
      }

      // Block browser back/forward history swipe while hovering the carousel.
      event.preventDefault();

      const now = performance.now();
      if (now < wheelCooldownUntilRef.current) {
        wheelAccumRef.current = 0;
        return;
      }

      wheelAccumRef.current += horizontalDelta;
      if (Math.abs(wheelAccumRef.current) < WHEEL_PAGE_THRESHOLD_PX) return;

      const page = safePageRef.current;
      const count = pageCountRef.current;
      const direction = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;

      const nextPage = page + direction;
      if (nextPage < 0 || nextPage > count - 1) return;

      wheelCooldownUntilRef.current = now + WHEEL_PAGE_COOLDOWN_MS;
      goToRef.current(nextPage);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [pageCount]);

  const endSwipe = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const session = swipeRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const page = safePageRef.current;
      const offsetPx = session.offsetPx;
      const elapsed = Math.max(1, event.timeStamp - session.lastT);
      const velocity = (event.clientX - session.lastX) / elapsed;
      const traveled = Math.abs(offsetPx);

      if (
        session.axis === "horizontal" &&
        typeof event.currentTarget.hasPointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId) &&
        typeof event.currentTarget.releasePointerCapture === "function"
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      swipeRef.current = null;
      setIsDragging(false);
      setDragOffsetPx(0);

      if (cancelled || session.axis !== "horizontal") return;

      if (traveled >= SWIPE_CLICK_SUPPRESS_PX) {
        suppressClickRef.current = true;
      }

      const distanceThreshold = session.width * SWIPE_PAGE_RATIO;
      const goNext =
        offsetPx < 0 &&
        (traveled >= distanceThreshold || velocity <= -SWIPE_VELOCITY_PX_PER_MS);
      const goPrev =
        offsetPx > 0 &&
        (traveled >= distanceThreshold || velocity >= SWIPE_VELOCITY_PX_PER_MS);

      if (goNext) goToRef.current(page + 1);
      else if (goPrev) goToRef.current(page - 1);
    },
    []
  );

  const onSwipePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pageCountRef.current <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const width = event.currentTarget.clientWidth;
    if (width <= 0) return;

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      axis: "undecided",
      width,
      offsetPx: 0,
    };
  }, []);

  const onSwipePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = swipeRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;

    if (session.axis === "undecided") {
      if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX && Math.abs(dy) < SWIPE_AXIS_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        session.axis = "vertical";
        return;
      }
      session.axis = "horizontal";
      setIsDragging(true);
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (session.axis !== "horizontal") return;

    event.preventDefault();
    const raw = resistEdgeOffset(dx, safePageRef.current, pageCountRef.current);
    session.offsetPx = raw;
    session.lastX = event.clientX;
    session.lastT = event.timeStamp;

    if (!prefersReducedMotion()) {
      setDragOffsetPx(raw);
    }
  }, []);

  const onSwipePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endSwipe(event, false);
    },
    [endSwipe]
  );

  const onSwipePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endSwipe(event, true);
    },
    [endSwipe]
  );

  const onSwipeClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  const enabled = pageCount > 1;

  return {
    viewportRef,
    dragOffsetPx,
    isDragging,
    viewportProps: enabled
      ? {
          onPointerDown: onSwipePointerDown,
          onPointerMove: onSwipePointerMove,
          onPointerUp: onSwipePointerUp,
          onPointerCancel: onSwipePointerCancel,
          onClickCapture: onSwipeClickCapture,
        }
      : {},
  };
}
