import type { CSSProperties } from "react";

/**
 * Progressive blur behind the transparent desktop nav: 8 stacked
 * backdrop-filter layers (0.16px → 20px), each masked to its own 12.5% band,
 * strongest at the very top. Content melts into soft focus as it scrolls under
 * the bar. Desktop only — the tablet/phone bar is solid.
 */
const LAYERS = 8;
const MAX_BLUR = 20;

function layerStyle(i: number): CSSProperties {
  const blur = MAX_BLUR / 2 ** (LAYERS - 1 - i); // 0.156 … 20
  const step = 100 / LAYERS; // 12.5%
  const a = i * step, b = a + step, c = b + step, d = c + step;
  const stops = i === LAYERS - 1
    ? `rgba(0,0,0,0) ${a}%, rgba(0,0,0,1) ${b}%`
    : i === LAYERS - 2
      ? `rgba(0,0,0,0) ${a}%, rgba(0,0,0,1) ${b}%, rgba(0,0,0,1) ${c}%`
      : `rgba(0,0,0,0) ${a}%, rgba(0,0,0,1) ${b}%, rgba(0,0,0,1) ${c}%, rgba(0,0,0,0) ${d}%`;
  const mask = `linear-gradient(to top, ${stops})`;
  return {
    position: "absolute",
    inset: 0,
    zIndex: i + 1,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    maskImage: mask,
    WebkitMaskImage: mask,
  };
}

export default function BlurGradient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 hidden h-[220px] desk:block">
      {Array.from({ length: LAYERS }, (_, i) => <div key={i} style={layerStyle(i)} />)}
    </div>
  );
}
