import { describe, it, expect } from "vitest";
import { swStrategyFor } from "../offline";

const O = "https://app.orovion.com"; // this app's origin
const req = (p: Partial<{ method: string; url: string; mode: string }>) =>
  swStrategyFor({ method: "GET", origin: O, url: `${O}/`, ...p });

describe("swStrategyFor", () => {
  it("bypasses every non-GET (mutations never cached)", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(swStrategyFor({ method, origin: O, url: `${O}/anything` })).toBe("bypass");
    }
  });

  it("bypasses authenticated / realtime / health paths", () => {
    expect(req({ url: `${O}/api/feed/home` })).toBe("bypass");
    expect(req({ url: `${O}/api/profile/me` })).toBe("bypass");
    expect(req({ url: `${O}/socket.io/?EIO=4` })).toBe("bypass");
    expect(req({ url: `${O}/health` })).toBe("bypass");
    expect(req({ url: `${O}/auth/refresh-token` })).toBe("bypass");
  });

  it("bypasses cross-origin (fonts / CDN / firebase / media)", () => {
    expect(req({ url: "https://fonts.gstatic.com/x.woff2" })).toBe("bypass");
    expect(req({ url: "https://res.cloudinary.com/img.jpg" })).toBe("bypass");
  });

  it("cache-first for immutable hashed build output", () => {
    expect(req({ url: `${O}/_next/static/chunks/main-abc123.js` })).toBe("cache-first");
  });

  it("network-first for page navigations (offline load after first visit)", () => {
    expect(req({ url: `${O}/app/feed`, mode: "navigate" })).toBe("network-first");
    expect(req({ url: `${O}/login`, mode: "navigate" })).toBe("network-first");
  });

  it("stale-while-revalidate for other same-origin static assets", () => {
    expect(req({ url: `${O}/favicon.svg` })).toBe("swr");
    expect(req({ url: `${O}/manifest.webmanifest` })).toBe("swr");
    expect(req({ url: `${O}/brand/wordmark.svg` })).toBe("swr");
  });

  it("bypasses a malformed url safely", () => {
    expect(swStrategyFor({ method: "GET", origin: O, url: "::::not a url" })).toBe("bypass");
  });
});
