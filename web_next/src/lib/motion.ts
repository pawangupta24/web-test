/**
 * Marketing-page motion math (public pages only — never /app/*).
 *
 * Framework-free on purpose (see CLAUDE.md) so it is unit-testable from
 * `src/lib/__tests__/`. The DOM side lives in `src/components/marketing/`.
 * Timings and distances follow the measured reference spec in
 * `docs/marketing-motion.md`.
 */

/** Layout breakpoints of the marketing pages (px, min-width). */
export const MOTION_BREAKPOINTS = { tablet: 810, desktop: 1200 } as const;

/**
 * The nav switches to its on-dark style once a dark section's top edge has
 * scrolled to within this many px of the viewport top — i.e. when the dark
 * section reaches the nav's text baseline.
 */
export const NAV_SWAP_LINE = 44;

/** id of the dark section the marketing nav turns white over (the site footer). */
export const DARK_SECTION_ID = "site-footer";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Footer parallax travel for a viewport width: 320px desktop, 160px tablet, none on phones. */
export function parallaxTravel(viewportWidth: number): number {
  if (viewportWidth >= MOTION_BREAKPOINTS.desktop) return 320;
  if (viewportWidth >= MOTION_BREAKPOINTS.tablet) return 160;
  return 0;
}

/**
 * Scroll progress of a layer, 0..1: 0 while its top edge is at (or below) the
 * viewport bottom, 1 once its bottom edge reaches the viewport bottom.
 * `top` is the layer's `getBoundingClientRect().top` — measure an untransformed
 * wrapper, or the transform feeds back into the measurement.
 */
export function parallaxProgress(top: number, height: number, viewportHeight: number): number {
  if (!(height > 0)) return 0;
  return clamp((viewportHeight - top) / height, 0, 1);
}

/** translateY in px for a parallax layer (linear in scroll, rounded to 0.1px). */
export function parallaxOffset(top: number, height: number, viewportHeight: number, travel: number): number {
  return Math.round(parallaxProgress(top, height, viewportHeight) * travel * 10) / 10;
}

/** True once a dark section's top edge has reached the nav (see NAV_SWAP_LINE). */
export function isOverDarkSection(sectionTop: number, line: number = NAV_SWAP_LINE): boolean {
  return sectionTop <= line;
}

/** True while the nav line sits inside a dark zone (its rect spans the line). */
export function isInsideDarkZone(zoneTop: number, zoneBottom: number, line: number = NAV_SWAP_LINE): boolean {
  return zoneTop <= line && zoneBottom > line;
}

/* ── home page scroll effects ─────────────────────────────────────────── */

/** Linear progress of `value` from `start` to `end` (either direction), clamped to 0..1. */
export function rangeProgress(value: number, start: number, end: number): number {
  if (start === end) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
}

/**
 * Draw-on-scroll progress (ScrollTrigger "top 50%" → "bottom 50%"): 0 when the
 * element's top reaches `startAt` of the viewport height, 1 when its bottom
 * reaches `endAt`. `top`/`height` come from getBoundingClientRect().
 */
export function drawProgress(top: number, height: number, viewportHeight: number, startAt = 0.5, endAt = 0.5): number {
  const span = height + (startAt - endAt) * viewportHeight;
  if (!(span > 0)) return 0;
  return clamp((startAt * viewportHeight - top) / span, 0, 1);
}

/** stroke-dashoffset that shows `progress` of a path of `length` (fully hidden at 0). */
export function dashOffset(length: number, progress: number): number {
  return length * (1 - clamp(progress, 0, 1));
}

/**
 * Scroll-reveal progress for text that lights up word by word: 0 while the
 * block's top is at `startAt` of the viewport (default: the bottom edge), 1 once
 * it has risen to `endAt` (default: 25% from the top).
 */
export function revealProgress(top: number, viewportHeight: number, startAt = 1, endAt = 0.25): number {
  return rangeProgress(top, startAt * viewportHeight, endAt * viewportHeight);
}

/** Opacity of word `index` of `count`: each word owns an equal slice of the progress. */
export function wordOpacity(progress: number, index: number, count: number, min = 0.2, max = 1): number {
  if (count <= 0) return max;
  const local = rangeProgress(progress, index / count, (index + 1) / count);
  return min + (max - min) * local;
}

/**
 * Image parallax inside a fixed frame: the image is `intensity` px taller than
 * the frame and slides from −intensity (frame entering at the bottom) to 0
 * (frame leaving at the top), so it drifts slower than the page.
 */
export function imageParallaxY(top: number, height: number, viewportHeight: number, intensity: number): number {
  const p = rangeProgress(viewportHeight - top, 0, viewportHeight + height);
  return Math.round((p - 1) * intensity * 10) / 10;
}

/**
 * Opacity of a background layer that fades in while `enterTop` (an element's
 * top) rises through the viewport and fades out while `exitTop` does.
 */
export function fadeThrough(enterTop: number, exitTop: number, viewportHeight: number): number {
  const fadeIn = rangeProgress(enterTop, viewportHeight, 0);
  const fadeOut = rangeProgress(exitTop, viewportHeight, 0);
  return Math.round(fadeIn * (1 - fadeOut) * 1000) / 1000;
}

export type ToggleState = "start" | "off" | "on";

/**
 * The hero's trust toggle: a lone dot ("start"), then a switch ("off") once
 * its start marker crosses `line` (default mid-screen), then "on" once the on
 * marker does. Inputs are the markers' getBoundingClientRect().top values.
 */
export function toggleState(startMarkerTop: number, onMarkerTop: number, viewportHeight: number, line = 0.5): ToggleState {
  const y = viewportHeight * line;
  if (onMarkerTop <= y) return "on";
  if (startMarkerTop <= y) return "off";
  return "start";
}

/** Frame-rate independent smoothing toward `target` (time constant `tau` ms). */
export function smoothToward(current: number, target: number, dtMs: number, tauMs = 150): number {
  if (!(tauMs > 0)) return target;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dtMs) / tauMs));
}

/* ── Custom cursor (marketing pages) ─────────────────────────────────── */

export type SpringConfig = { stiffness: number; damping: number; mass?: number };
export type SpringState = { value: number; velocity: number };

/**
 * The cursor's springs. `follow` and `shape` are measured on the reference
 * cursor: `follow` moves the follower (overdamped — trails the pointer, never
 * overshoots); `shape` drives size, scale and opacity (a ~6% bounce).
 * `wobble` is Orovion's own: the water-drop stretch, loose enough to jiggle
 * once the drop stops.
 */
export const CURSOR_SPRINGS = {
  follow: { stiffness: 220, damping: 26, mass: 0.6 },
  shape: { stiffness: 380, damping: 26, mass: 1 },
  wobble: { stiffness: 260, damping: 14, mass: 1 },
} as const satisfies Record<string, SpringConfig>;

/**
 * How far the water-drop cursor stretches along its direction of travel at a
 * given speed (px/s): 0 at rest, easing toward +35%.
 */
export function dropStretch(speed: number): number {
  return speed > 0 ? 0.35 * (1 - Math.exp(-speed / 1500)) : 0;
}

/**
 * Advances a damped spring toward `target` by `dtMs` (semi-implicit Euler in
 * 4ms sub-steps; frames longer than 64ms — a background tab — are clamped).
 */
export function springStep(s: SpringState, target: number, dtMs: number, { stiffness, damping, mass = 1 }: SpringConfig): SpringState {
  let { value, velocity } = s;
  let left = clamp(dtMs, 0, 64) / 1000;
  while (left > 1e-9) {
    const h = Math.min(left, 0.004);
    velocity += ((-stiffness * (value - target) - damping * velocity) / mass) * h;
    value += velocity * h;
    left -= h;
  }
  return { value, velocity };
}

/** True once a spring is within `delta` of its target and (almost) still. */
export function springSettled(s: SpringState, target: number, delta: number): boolean {
  return Math.abs(target - s.value) <= delta && Math.abs(s.velocity) <= delta * 10;
}

/**
 * The cursor frame that wraps a snap target: `pad` px outside every edge,
 * centered on it, corners concentric with the target's (radius + pad), and
 * never rounder than a pill.
 */
export function snapFrame(rect: { left: number; top: number; width: number; height: number }, radius: number, pad = 5) {
  const w = rect.width + pad * 2, h = rect.height + pad * 2;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w, h, r: Math.min(Math.max(0, radius) + pad, Math.min(w, h) / 2) };
}
