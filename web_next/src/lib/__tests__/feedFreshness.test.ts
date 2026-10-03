import { describe, it, expect, beforeEach } from "vitest";
import { shouldForceFresh, _resetFeedFreshness, FRESH_WINDOW_MS } from "../feedFreshness";

describe("shouldForceFresh — when a feed load bypasses the gateway SWR cache", () => {
  beforeEach(() => _resetFeedFreshness());

  it("forces fresh on the first load of a key — this is the reload case, since a hard reload discards module state", () => {
    expect(shouldForceFresh("feed:home:all:all", false, 1000)).toBe(true);
  });

  it("always forces fresh on explicit intent, even inside the window", () => {
    shouldForceFresh("k", true, 1000);
    expect(shouldForceFresh("k", true, 1500)).toBe(true);
  });

  it("lets a chip switch back within the window ride the server cache", () => {
    shouldForceFresh("k", true, 1000);
    expect(shouldForceFresh("k", false, 1000 + FRESH_WINDOW_MS - 1)).toBe(false);
  });

  it("forces fresh again once the window has elapsed", () => {
    shouldForceFresh("k", true, 1000);
    expect(shouldForceFresh("k", false, 1000 + FRESH_WINDOW_MS)).toBe(true);
  });

  it("tracks each feed variant independently", () => {
    shouldForceFresh("feed:home:all:all", true, 1000);
    expect(shouldForceFresh("feed:home:specialty:cardiology", false, 1000)).toBe(true);
  });

  it("stamps only when it returns true, so a cached load does not extend the window", () => {
    shouldForceFresh("k", true, 1000);
    shouldForceFresh("k", false, 1010); // cached, must not re-stamp
    expect(shouldForceFresh("k", false, 1000 + FRESH_WINDOW_MS)).toBe(true);
  });
});
