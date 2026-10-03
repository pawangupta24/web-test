"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { drawProgress, smoothToward } from "@/lib/motion";

export type ThreadLine = { d: string; opacity?: number; width?: number };

/**
 * SVG "thread" that draws itself as it scrolls through the viewport — the
 * reference's ScrollTrigger setup ("top 50%" → "bottom 50%", scrub 0.5),
 * rebuilt with `pathLength` + stroke-dashoffset and a frame-rate independent
 * smoothing (~0.5s to catch up). Under reduced motion the thread is simply
 * drawn in full.
 */
export default function ScrollThread({
  lines,
  viewBox,
  className,
  style,
  stroke = "currentColor",
  startAt = 0.5,
  endAt = 0.5,
  preserveAspectRatio = "xMidYMid meet",
}: {
  lines: ThreadLine[];
  viewBox: string;
  className?: string;
  style?: CSSProperties;
  stroke?: string;
  startAt?: number;
  endAt?: number;
  preserveAspectRatio?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0, target = 0, raf = 0, last = 0;

    const apply = (p: number) => paths.forEach((path) => { path.style.strokeDashoffset = String(1 - p); });
    const tick = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      current = smoothToward(current, target, dt, 150);
      if (Math.abs(target - current) < 0.0005) current = target;
      apply(current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    };
    const measure = () => {
      if (reduced) { current = target = 1; apply(1); return; }
      const r = svg.getBoundingClientRect();
      target = drawProgress(r.top, r.height, window.innerHeight, startAt, endAt);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [startAt, endAt]);

  return (
    <svg ref={ref} viewBox={viewBox} preserveAspectRatio={preserveAspectRatio} className={className} style={style} fill="none" aria-hidden focusable="false">
      {lines.map((l, i) => (
        <path
          key={i}
          d={l.d}
          style={{ stroke }}
          strokeWidth={l.width ?? 2}
          strokeLinecap="round"
          opacity={l.opacity ?? 1}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
        />
      ))}
    </svg>
  );
}
