/**
 * Pure pull-to-refresh maths, framework-free so it can be unit-tested without a
 * DOM or a React tree (see `src/lib/__tests__/pullToRefresh.test.ts`). The DOM
 * side — listeners, preventDefault, the await — lives in
 * `src/hooks/usePullToRefresh.ts`.
 *
 * Two input devices feed the same model:
 *   - touch: one drag, with a real `touchend` to settle on.
 *   - wheel/trackpad: a stream of deltas with NO end event, so the hook settles
 *     the gesture on an idle timer and has to ignore the momentum tail that
 *     arrives after a fast scroll up.
 */

/** Rubber-band factors: raw travel is scaled down so the pull feels weighted. */
export const TOUCH_DAMP = 0.5;
export const WHEEL_DAMP = 0.45;

/** Hard stop on the indicator: `threshold * MAX_OVERPULL` pixels. */
export const MAX_OVERPULL = 1.6;

/** No `wheelend` event exists — treat this much idle time as "gesture over". */
export const WHEEL_SETTLE_MS = 140;

/**
 * Idle gap that separates two wheel gestures. Momentum arrives as a continuous
 * stream (~16ms apart), so anything after a longer pause is a new, deliberate
 * gesture.
 */
export const WHEEL_GESTURE_GAP_MS = 120;

/** Damped on-screen distance for a raw travel of `raw` px. Never negative. */
export function damp(raw: number, threshold: number, factor: number): number {
  if (!(raw > 0)) return 0;
  return Math.min(raw * factor, threshold * MAX_OVERPULL);
}

/**
 * Fold one wheel delta into the accumulated raw travel. Any downward intent
 * (`deltaY >= 0`) abandons the gesture, so a pull can only ever be built out of
 * a continuous upward run.
 */
export function accumulate(raw: number, deltaY: number): number {
  if (deltaY >= 0) return 0;
  return raw + -deltaY;
}

/** Did the gesture travel far enough to fire? */
export function shouldRefresh(pull: number, threshold: number): boolean {
  return pull >= threshold;
}

/**
 * Does this wheel event begin a NEW gesture?
 *
 * This is what keeps a refresh from firing on its own: a pull only counts when
 * the gesture *begins* with the surface already at the top. When the user flings
 * up from further down the page, the momentum tail that slams into the top is one
 * unbroken stream — never "new" — so it is ignored. A deliberate second flick,
 * made after a pause, is.
 */
export function startsNewGesture(
  now: number,
  lastWheelAt: number | null,
  gapMs: number = WHEEL_GESTURE_GAP_MS,
): boolean {
  return lastWheelAt === null || now - lastWheelAt > gapMs;
}
