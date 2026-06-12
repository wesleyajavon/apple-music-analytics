"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const STORAGE_KEY = "ai-master-toggle-position";
const VIEWPORT_MARGIN = 24;

type Position = { x: number; y: number };

function readStoredPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function clampPosition(pos: Position, width: number, height: number): Position {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, pos.y), maxY),
  };
}

function getDefaultPosition(width: number, height: number): Position {
  return clampPosition(
    {
      x: window.innerWidth - width - VIEWPORT_MARGIN,
      y: window.innerHeight - height - VIEWPORT_MARGIN,
    },
    width,
    height
  );
}

function persistPosition(pos: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

export function useDraggableFloatingPosition(containerRef: RefObject<HTMLElement | null>) {
  const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const positionRef = useRef<Position | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applyPosition = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return false;

      const stored = readStoredPosition();
      setPosition(clampPosition(stored ?? getDefaultPosition(width, height), width, height));
      return true;
    };

    if (applyPosition()) return;

    const observer = new ResizeObserver(() => {
      applyPosition();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const onResize = () => {
      const el = containerRef.current;
      const current = positionRef.current;
      if (!el || !current) return;
      const { width, height } = el.getBoundingClientRect();
      setPosition(clampPosition(current, width, height));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [containerRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const current = positionRef.current;
      if (!current) return;

      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStateRef.current = {
        offsetX: e.clientX - current.x,
        offsetY: e.clientY - current.y,
      };
      setIsDragging(true);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragStateRef.current || !containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      const next = clampPosition(
        {
          x: e.clientX - dragStateRef.current.offsetX,
          y: e.clientY - dragStateRef.current.offsetY,
        },
        width,
        height
      );
      setPosition(next);
    },
    [containerRef]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);

    const current = positionRef.current;
    if (current) persistPosition(current);
  }, []);

  const style: React.CSSProperties | undefined = position
    ? { left: position.x, top: position.y }
    : { bottom: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN };

  return {
    style,
    isDragging,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
