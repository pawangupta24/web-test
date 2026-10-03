import { describe, it, expect } from "vitest";
import {
  TOUCH_DAMP,
  WHEEL_DAMP,
  MAX_OVERPULL,
  WHEEL_GESTURE_GAP_MS,
  damp,
  accumulate,
  shouldRefresh,
  startsNewGesture,
} from "../pullToRefresh";

const THRESHOLD = 70;

describe("damp", () => {
  it("scales raw travel by the device factor", () => {
    expect(damp(100, THRESHOLD, TOUCH_DAMP)).toBe(50);
    expect(damp(100, THRESHOLD, WHEEL_DAMP)).toBeCloseTo(45);
  });

  it("clamps the rubber band at threshold * MAX_OVERPULL", () => {
    expect(damp(100000, THRESHOLD, TOUCH_DAMP)).toBe(THRESHOLD * MAX_OVERPULL);
  });

  it("never returns a negative or NaN pull", () => {
    expect(damp(0, THRESHOLD, TOUCH_DAMP)).toBe(0);
    expect(damp(-500, THRESHOLD, TOUCH_DAMP)).toBe(0);
    expect(damp(NaN, THRESHOLD, TOUCH_DAMP)).toBe(0);
  });
});

describe("accumulate", () => {
  it("builds up travel across a continuous upward run", () => {
    let raw = 0;
    for (const d of [-40, -30, -20]) raw = accumulate(raw, d);
    expect(raw).toBe(90);
  });

  it("abandons the gesture the moment intent turns downward", () => {
    expect(accumulate(120, 5)).toBe(0);
    expect(accumulate(120, 0)).toBe(0); // a zero delta is not upward intent
  });
});

describe("shouldRefresh", () => {
  it("fires only at or past the threshold", () => {
    expect(shouldRefresh(THRESHOLD - 1, THRESHOLD)).toBe(false);
    expect(shouldRefresh(THRESHOLD, THRESHOLD)).toBe(true);
    expect(shouldRefresh(THRESHOLD + 1, THRESHOLD)).toBe(true);
  });
});

describe("startsNewGesture", () => {
  it("treats the very first wheel event as a new gesture", () => {
    expect(startsNewGesture(1000, null)).toBe(true);
  });

  it("treats a continuous stream as one gesture", () => {
    expect(startsNewGesture(1000, 1000 - 16)).toBe(false);
    expect(startsNewGesture(1000, 1000 - WHEEL_GESTURE_GAP_MS)).toBe(false);
  });

  it("treats a deltas after a pause as a new gesture", () => {
    expect(startsNewGesture(1000, 1000 - WHEEL_GESTURE_GAP_MS - 1)).toBe(true);
    expect(startsNewGesture(1000, 500)).toBe(true);
  });
});

/**
 * The behaviour that actually matters: flinging up from further down the page
 * must NOT refresh when the momentum tail slams into the top, but a deliberate
 * second flick made at the top must.
 */
describe("momentum does not self-trigger a refresh", () => {
  /** Mirrors the hook's arming rules over a stream of (t, deltaY, atTop) events. */
  const run = (events: Array<[number, number, boolean]>) => {
    let raw = 0;
    let last: number | null = null;
    let armed = false;
    let pull = 0;
    for (const [t, deltaY, atTop] of events) {
      const fresh = startsNewGesture(t, last);
      last = t;
      if (!atTop) { armed = false; raw = 0; pull = 0; continue; }
      if (fresh) { armed = true; raw = 0; }
      if (!armed) continue;
      if (deltaY >= 0) { armed = false; raw = 0; pull = 0; continue; }
      raw = accumulate(raw, deltaY);
      pull = damp(raw, THRESHOLD, WHEEL_DAMP);
    }
    return shouldRefresh(pull, THRESHOLD);
  };

  it("ignores the momentum tail of a fling that began below the top", () => {
    // One unbroken 16ms stream: starts mid-page, reaches the top, keeps coasting.
    const events: Array<[number, number, boolean]> = [];
    let t = 0;
    for (let i = 0; i < 6; i++) events.push([(t += 16), -120, false]); // still scrolling up
    for (let i = 0; i < 25; i++) events.push([(t += 16), -120, true]); // coasting at the top
    expect(run(events)).toBe(false);
  });

  it("fires on a deliberate flick made after a pause at the top", () => {
    const events: Array<[number, number, boolean]> = [];
    let t = 0;
    for (let i = 0; i < 6; i++) events.push([(t += 16), -120, false]);
    for (let i = 0; i < 10; i++) events.push([(t += 16), -120, true]); // momentum, ignored
    t += WHEEL_GESTURE_GAP_MS + 50; // the user lets go, then pulls again
    for (let i = 0; i < 4; i++) events.push([(t += 16), -60, true]);
    expect(run(events)).toBe(true);
  });

  it("abandons a pull the moment the user scrolls back down", () => {
    const events: Array<[number, number, boolean]> = [
      [1000, -200, true],
      [1016, -200, true],
      [1032, 40, true], // downward intent cancels it
    ];
    expect(run(events)).toBe(false);
  });
});
