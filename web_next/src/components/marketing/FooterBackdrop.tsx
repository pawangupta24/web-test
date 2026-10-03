"use client";
import { useCallback, useRef } from "react";
import { parallaxOffset, parallaxTravel } from "@/lib/motion";
import { useScrollFrame } from "./useScrollFrame";

// Deterministic "particles" — soft light specks drifting over the horizon glow.
// Integer-only pseudo-random (an LCG), so server and browser render identical
// markup; Math.sin can differ in the last bits between engines and break hydration.
const SPECKS = (() => {
  let seed = 7;
  const next = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  return Array.from({ length: 34 }, () => ({
    x: round(next() * 100), y: round(30 + next() * 55), s: round(1 + next() * 2.4, 1), o: round(0.18 + next() * 0.5),
  }));
})();

/**
 * The footer's backdrop, an image-free brand scene: deep brand-900 with glowing
 * radial pools, soft wave lines across a luminous horizon, light specks and a
 * fine noise grain. Every color is accent-var driven (Appearance retheme-safe).
 *
 * Parallax (reference values): the scene layer extends 320px (desktop) / 160px
 * (tablet) above the footer and travels 0 → that distance while the footer
 * scrolls into view, so it settles slower than the page. Off on phones and
 * under reduced motion.
 */
export default function FooterBackdrop() {
  const frame = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  useScrollFrame(useCallback(() => {
    const f = frame.current, s = scene.current;
    if (!f || !s) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const travel = reduced ? 0 : parallaxTravel(window.innerWidth);
    const r = f.getBoundingClientRect(); // untransformed wrapper — no feedback loop
    s.style.transform = travel ? `translate3d(0, ${parallaxOffset(r.top, r.height, window.innerHeight, travel)}px, 0)` : "";
  }, []));

  return (
    <div ref={frame} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-0 select-none tab:-top-40 desk:-top-80">
      <div ref={scene} className="mk-footer-scene absolute inset-0 will-change-transform">
        <svg className="absolute inset-x-0 top-[48%] h-[38%] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" fill="none">
          <defs>
            <filter id="mk-wave-blur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter>
            <linearGradient id="mk-wave-fade" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g filter="url(#mk-wave-blur)" stroke="url(#mk-wave-fade)" strokeLinecap="round">
            <path d="M0 210 C 240 150, 420 260, 720 205 S 1200 150, 1440 200" strokeWidth="2" opacity=".55" />
            <path d="M0 240 C 260 190, 470 300, 760 235 S 1180 185, 1440 232" strokeWidth="1.4" opacity=".35" />
            <path d="M0 182 C 200 140, 460 220, 700 178 S 1220 120, 1440 170" strokeWidth="1" opacity=".3" />
            <path d="M0 275 C 300 230, 520 330, 820 268 S 1220 225, 1440 262" strokeWidth="3" opacity=".18" />
          </g>
        </svg>
        <div className="absolute inset-0">
          {SPECKS.map((p, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, opacity: p.o, boxShadow: `0 0 ${p.s * 3}px rgb(255 255 255 / .6)` }} />
          ))}
        </div>
        <div className="mk-noise absolute inset-0" />
      </div>
    </div>
  );
}
