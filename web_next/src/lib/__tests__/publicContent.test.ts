import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// React's cache() only exists in the server build Next bundles; in plain Node it
// is absent, and per-request memoisation is irrelevant to these tests anyway.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

const { fetchPublic } = await import("@/lib/publicContent");

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("fetchPublic", () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.PUBLIC_SSR_KEY;
    delete process.env.BACKEND_PROXY_TARGET;
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("returns the data of a 200", async () => {
    vi.stubGlobal("fetch", respond(200, { success: true, data: { post: { id: "p1" } } }));
    await expect(fetchPublic("/posts/p1")).resolves.toEqual({ kind: "ok", data: { post: { id: "p1" } } });
  });

  it("maps a 404 to notFound", async () => {
    vi.stubGlobal("fetch", respond(404, { success: false, data: null }));
    await expect(fetchPublic("/posts/p1")).resolves.toEqual({ kind: "notFound" });
  });

  it("maps a 5xx, a missing body or a thrown fetch to error — never throws", async () => {
    vi.stubGlobal("fetch", respond(503, { success: false }));
    await expect(fetchPublic("/posts/p1")).resolves.toEqual({ kind: "error" });

    vi.stubGlobal("fetch", respond(200, { success: true }));
    await expect(fetchPublic("/posts/p1")).resolves.toEqual({ kind: "error" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    await expect(fetchPublic("/posts/p1")).resolves.toEqual({ kind: "error" });
  });

  it("calls the proxy target when the browser base is same-origin, and sends the SSR key", async () => {
    process.env.BACKEND_PROXY_TARGET = "http://api:5000/";
    process.env.PUBLIC_SSR_KEY = "k".repeat(32);
    const fetchMock = respond(200, { data: {} });
    vi.stubGlobal("fetch", fetchMock);
    await fetchPublic("/profiles/dranya");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api:5000/api/public/profiles/dranya");
    expect(init.headers).toEqual({ "x-ssr-key": "k".repeat(32) });
  });

  it("sends no SSR header when no key is configured", async () => {
    const fetchMock = respond(200, { data: {} });
    vi.stubGlobal("fetch", fetchMock);
    await fetchPublic("/profiles/dranya");
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
  });
});
