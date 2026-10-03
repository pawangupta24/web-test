/**
 * Per-tab feed session id.
 *
 * These pin the contract that fixes the blank-feed bug: media keys its "already
 * served" set on this id, so if the client never sends one, every request and
 * every guest shares a single bucket that accumulates every post and empties the
 * feed. The subtle half is ROTATION — the id must survive ordinary paging (or
 * cross-page dedup breaks) and must be discarded on a refresh gesture (or a
 * refresh shows the same exhausted set).
 *
 * The suite runs in vitest's `node` environment (repo convention — no jsdom), so
 * `window` is stubbed here. That is not a workaround: SSR really does run this
 * module with no window, and the no-window path is asserted below.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getFeedSessionId,
  setFeedSessionId,
  rotateFeedSession,
} from "../feedSession";

const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  } as Storage;
};

const throwingStorage = (): Storage => {
  const boom = () => { throw new Error("SecurityError"); };
  return { getItem: boom, setItem: boom, removeItem: boom } as unknown as Storage;
};

const useWindow = (storage: Storage | null) =>
  vi.stubGlobal("window", storage ? { sessionStorage: storage } : undefined);

beforeEach(() => useWindow(memoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe("feed session id", () => {
  test("starts empty so the first request omits it and the server mints one", () => {
    expect(getFeedSessionId("home")).toBeNull();
  });

  test("stores what the server minted and hands it back to be echoed", () => {
    setFeedSessionId("home", "sess_abc");
    expect(getFeedSessionId("home")).toBe("sess_abc");
  });

  test("home and explore never share a session — a shared served-set would hide content", () => {
    setFeedSessionId("home", "home_1");
    setFeedSessionId("explore", "explore_1");

    expect(getFeedSessionId("home")).toBe("home_1");
    expect(getFeedSessionId("explore")).toBe("explore_1");

    rotateFeedSession("home");
    expect(getFeedSessionId("home")).toBeNull();
    expect(getFeedSessionId("explore")).toBe("explore_1"); // untouched
  });

  test("rotating clears the id so the next request gets a fresh served-set", () => {
    setFeedSessionId("home", "sess_abc");
    rotateFeedSession("home");
    expect(getFeedSessionId("home")).toBeNull();
  });

  test("rotating an already-empty scope is not an error", () => {
    expect(() => rotateFeedSession("home")).not.toThrow();
    expect(getFeedSessionId("home")).toBeNull();
  });

  test("ignores a missing or non-string id rather than storing junk", () => {
    setFeedSessionId("home", undefined);
    setFeedSessionId("home", null);
    setFeedSessionId("home", "");
    expect(getFeedSessionId("home")).toBeNull();
  });

  test("reading does NOT rotate — paging must keep its session or dedup breaks", () => {
    setFeedSessionId("home", "sess_abc");
    getFeedSessionId("home");
    getFeedSessionId("home");
    expect(getFeedSessionId("home")).toBe("sess_abc");
  });
});

describe("hostile or absent storage", () => {
  test("SSR (no window) degrades to null instead of throwing during render", () => {
    useWindow(null);
    expect(getFeedSessionId("home")).toBeNull();
    expect(() => setFeedSessionId("home", "sess_abc")).not.toThrow();
    expect(() => rotateFeedSession("home")).not.toThrow();
  });

  test("Safari private mode (storage throws) degrades to null, feed still loads", () => {
    useWindow(throwingStorage());
    expect(() => getFeedSessionId("home")).not.toThrow();
    expect(getFeedSessionId("home")).toBeNull();
    expect(() => setFeedSessionId("home", "sess_abc")).not.toThrow();
    expect(() => rotateFeedSession("home")).not.toThrow();
  });
});
