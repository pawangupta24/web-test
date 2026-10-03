"use client";
import { useEffect, useRef, useState } from "react";
import {
  TOUCH_DAMP, WHEEL_DAMP, WHEEL_SETTLE_MS,
  damp, accumulate, shouldRefresh, startsNewGesture,
} from "@/lib/pullToRefresh";

/**
 * Pull-to-refresh, on touch AND trackpad/wheel. When the surface is at the top
 * and the user drags (or scrolls) down past `threshold`, `onRefresh()` is awaited
 * while a spinner holds. Skipped while a modal/sheet has locked body scroll, or
 * when `disabled` is true (e.g. a full-screen viewer is open, or the caller is
 * not on its first slide).
 *
 * The wheel path exists because touch events never fire on desktop web — without
 * it the gesture is dead on every non-touch device. It has no `wheelend` to settle
 * on, so it ends on an idle timer, and it only counts a gesture that BEGINS at the
 * top (`startsNewGesture`) so the momentum tail of a fast scroll-up cannot
 * self-trigger a refresh. The maths is in `src/lib/pullToRefresh.ts`.
 *
 * Returns { pull, refreshing } to drive the indicator.
 */
export function usePullToRefresh(onRefresh, { threshold = 70, disabled = false } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startY = useRef(null);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  const setP = (d) => { pullRef.current = d; setPull(d); };

  useEffect(() => {
    if (disabled) return;
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
    const blocked = () => document.body.style.overflow === "hidden"; // a modal/sheet is open

    /** Shared by both input paths: hold the spinner while onRefresh settles. */
    const trigger = async () => {
      busy.current = true;
      setRefreshing(true);
      setP(threshold);
      try { await cb.current?.(); } catch { /* ignore */ }
      busy.current = false;
      setRefreshing(false);
      setP(0);
    };

    /* ------------------------------------------------------------ touch --- */
    const onStart = (e) => {
      if (busy.current || blocked() || !atTop()) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (startY.current == null || busy.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && atTop()) {
        const d = damp(dy, threshold, TOUCH_DAMP);
        setP(d);
        if (d > 6 && e.cancelable) e.preventDefault(); // suppress native overscroll once pulling
      } else if (dy <= 0 && pullRef.current) {
        startY.current = null;
        setP(0);
      }
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (shouldRefresh(pullRef.current, threshold)) await trigger();
      else setP(0);
    };

    /* ------------------------------------------- trackpad / mouse wheel --- */
    let rawWheel = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastWheelAt: number | null = null;
    let armed = false;

    const abandonWheel = () => {
      rawWheel = 0;
      clearTimeout(settleTimer);
      settleTimer = undefined;
      if (pullRef.current) setP(0);
    };

    const settleWheel = async () => {
      settleTimer = undefined;
      rawWheel = 0;
      if (shouldRefresh(pullRef.current, threshold)) await trigger();
      else setP(0);
    };

    const onWheel = (e) => {
      const now = Date.now();
      const fresh = startsNewGesture(now, lastWheelAt);
      lastWheelAt = now;

      if (busy.current || blocked()) { armed = false; return; }
      if (!atTop()) { armed = false; abandonWheel(); return; }
      // Arm ONLY when a new gesture begins with the surface already at the top.
      // Momentum from a fling that started lower is one unbroken stream, so it is
      // never "fresh" and can never trigger a refresh on its own.
      if (fresh) { armed = true; rawWheel = 0; }
      if (!armed) return;
      if (e.deltaY >= 0) { armed = false; abandonWheel(); return; }

      rawWheel = accumulate(rawWheel, e.deltaY);
      const d = damp(rawWheel, threshold, WHEEL_DAMP);
      setP(d);
      if (d > 6 && e.cancelable) e.preventDefault(); // nothing to scroll up here anyway

      clearTimeout(settleTimer);
      settleTimer = setTimeout(settleWheel, WHEEL_SETTLE_MS);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("wheel", onWheel);
      clearTimeout(settleTimer);
    };
  }, [threshold, disabled]);

  return { pull, refreshing };
}

/**
 * Auto-refresh when the user returns to the tab (focus / visibility), throttled to
 * `minMs` and only when scrolled near the top so a deep scroll position isn't yanked.
 */
export function useAutoRefresh(onRefresh, { minMs = 90000, nearTopPx = 400 } = {}) {
  const last = useRef(Date.now());
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const maybe = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < minMs) return;
      if ((window.scrollY || 0) > nearTopPx) return;
      last.current = now;
      cb.current?.();
    };
    document.addEventListener("visibilitychange", maybe);
    window.addEventListener("focus", maybe);
    return () => {
      document.removeEventListener("visibilitychange", maybe);
      window.removeEventListener("focus", maybe);
    };
  }, [minMs, nearTopPx]);
}
