import { describe, it, expect } from "vitest";
import { backoffMs, isRetryableStatus, dedupeInsert, dueItems, type QueueItem } from "../offline-queue";

const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: Math.random().toString(36).slice(2),
  kind: "connect",
  method: "post",
  url: "/network/request/1",
  createdAt: 0,
  retryCount: 0,
  nextAttemptAt: 0,
  ...over,
});

describe("backoffMs", () => {
  it("grows exponentially then caps at 5 minutes", () => {
    expect(backoffMs(1)).toBe(4000);
    expect(backoffMs(2)).toBe(8000);
    expect(backoffMs(3)).toBe(16000);
    expect(backoffMs(20)).toBe(5 * 60_000); // capped
  });
  it("is monotonically non-decreasing", () => {
    for (let n = 1; n < 12; n++) expect(backoffMs(n + 1)).toBeGreaterThanOrEqual(backoffMs(n));
  });
});

describe("isRetryableStatus", () => {
  it("retries no-response (offline/network) and 5xx", () => {
    expect(isRetryableStatus(undefined)).toBe(true);
    expect(isRetryableStatus(null)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });
  it("treats 4xx as permanent", () => {
    for (const s of [400, 401, 403, 404, 409, 422]) expect(isRetryableStatus(s)).toBe(false);
  });
});

describe("dedupeInsert", () => {
  it("replaces a pending item sharing the same dedupeKey (latest wins)", () => {
    const q = [item({ id: "a", dedupeKey: "connect:1" })];
    const next = dedupeInsert(q, item({ id: "b", dedupeKey: "connect:1" }));
    expect(next.map((x) => x.id)).toEqual(["b"]);
  });
  it("keeps items with different keys and appends", () => {
    const q = [item({ id: "a", dedupeKey: "connect:1" })];
    const next = dedupeInsert(q, item({ id: "b", dedupeKey: "connect:2" }));
    expect(next.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("appends keyless items without deduping (e.g. toggles replay in order)", () => {
    const q = [item({ id: "a" })];
    const next = dedupeInsert(q, item({ id: "b" }));
    expect(next.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("dueItems", () => {
  it("returns only items whose backoff gate has elapsed", () => {
    const q = [item({ id: "past", nextAttemptAt: 100 }), item({ id: "future", nextAttemptAt: 5000 })];
    expect(dueItems(q, 1000).map((x) => x.id)).toEqual(["past"]);
  });
});
