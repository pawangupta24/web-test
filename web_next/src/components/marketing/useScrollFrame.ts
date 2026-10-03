"use client";
import { useEffect, useRef } from "react";

/**
 * Runs `cb` at most once per animation frame while the page scrolls or resizes
 * (and once on mount). Lenis drives the native scroll position, so this works
 * the same with and without smooth scrolling.
 */
export function useScrollFrame(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        ref.current();
      });
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
}
