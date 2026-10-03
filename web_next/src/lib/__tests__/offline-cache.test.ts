import { describe, it, test, expect } from "vitest";
import { cacheKey, shouldWriteFeedCache } from "../offline-cache";

describe("cacheKey", () => {
  it("namespaces by user so accounts never collide", () => {
    expect(cacheKey("userA", "feed:home:all")).not.toBe(cacheKey("userB", "feed:home:all"));
  });

  it("is stable for the same (user, key)", () => {
    expect(cacheKey("userA", "feed:home:all")).toBe(cacheKey("userA", "feed:home:all"));
  });

  it("falls back to a 'guest' namespace when there is no user", () => {
    expect(cacheKey(null, "feed:home:all")).toBe("v1:guest:feed:home:all");
    expect(cacheKey(undefined, "feed:home:all")).toBe("v1:guest:feed:home:all");
  });

  it("carries the schema version prefix (for global invalidation)", () => {
    expect(cacheKey("userA", "x").startsWith("v1:")).toBe(true);
  });

  it("distinguishes different logical keys for the same user", () => {
    expect(cacheKey("userA", "feed:home:all")).not.toBe(cacheKey("userA", "feed:home:type:research"));
  });
});

/**
 * The feed writes its result to the cache on every load. A single empty response
 * would therefore overwrite a good cached page with [], and the instant offline
 * paint — which exists so a returning visitor never sees a blank feed — would
 * then render nothing. An empty result is far more often transient than real.
 */
describe("shouldWriteFeedCache", () => {
  test("a non-empty result always replaces the cache", () => {
    expect(shouldWriteFeedCache([1, 2], [3])).toBe(true);
    expect(shouldWriteFeedCache([1], null)).toBe(true);
  });

  test("an empty result must NOT wipe a good cached page", () => {
    expect(shouldWriteFeedCache([], [1, 2, 3])).toBe(false);
  });

  test("empty over nothing is fine — there is nothing to lose", () => {
    expect(shouldWriteFeedCache([], null)).toBe(true);
    expect(shouldWriteFeedCache([], undefined)).toBe(true);
    expect(shouldWriteFeedCache([], [])).toBe(true);
  });
});
