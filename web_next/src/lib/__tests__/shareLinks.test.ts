import { describe, expect, it } from "vitest";
import {
  androidIntentUrl, appSchemeUrl, decodeSegment, parseHandle, platformFromUserAgent,
  postUrl, profileUrl, pulseUrl, safeHandleTarget, storeUrl,
} from "@/lib/shareLinks";
import { SITE_URL } from "@/lib/seo";

describe("share URLs", () => {
  it("builds a profile link from the username, lowercased and without @", () => {
    expect(profileUrl("@DrAnya", "u1")).toBe(`${SITE_URL}/dranya`);
  });

  it("falls back to /profile/<id> when there is no usable username", () => {
    expect(profileUrl(null, "u1")).toBe(`${SITE_URL}/profile/u1`);
    expect(profileUrl("no spaces", "u1")).toBe(`${SITE_URL}/profile/u1`);
    expect(profileUrl(undefined, undefined)).toBe("");
  });

  it("builds post and pulse links, encoding the id", () => {
    expect(postUrl("abc123")).toBe(`${SITE_URL}/p/abc123`);
    expect(pulseUrl("r/1")).toBe(`${SITE_URL}/pulse/r%2F1`);
  });

  it("defaults the site to the canonical www host, which app-link verification requires", () => {
    expect(SITE_URL).toBe(process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://www.orovion.com");
  });
});

describe("parseHandle", () => {
  it("accepts a canonical handle as-is", () => {
    expect(parseHandle("dr.anya_99")).toEqual({ handle: "dr.anya_99", canonical: true });
  });

  it("flags uppercase and @-prefixed handles for a redirect", () => {
    expect(parseHandle("DrAnya")).toEqual({ handle: "dranya", canonical: false });
    expect(parseHandle("%40dranya")).toEqual({ handle: "dranya", canonical: false });
  });

  it("rejects anything that cannot be a username", () => {
    expect(parseHandle("ab")).toBeNull();
    expect(parseHandle("has space")).toBeNull();
    expect(parseHandle("%E0%A4%A")).toBeNull();
  });

  it("only redirects to a real username, never off-site or back to itself", () => {
    expect(safeHandleTarget("drnew", "drold")).toBe("drnew");
    expect(safeHandleTarget("/evil.com")).toBeNull();
    expect(safeHandleTarget("drold", "drold")).toBeNull();
    expect(safeHandleTarget(null)).toBeNull();
    expect(safeHandleTarget(undefined)).toBeNull();
  });

  it("decodeSegment returns null for broken percent-encoding", () => {
    expect(decodeSegment("%E0%A4%A")).toBeNull();
    expect(decodeSegment("a%20b")).toBe("a b");
  });
});

describe("opening the app", () => {
  it("uses id-based scheme links every app build understands", () => {
    expect(appSchemeUrl({ type: "reel", id: "r1" })).toBe("orovion://reel/r1");
  });

  it("builds an Android intent link with an encoded browser fallback", () => {
    const url = androidIntentUrl({ type: "post", id: "p1" }, "https://orovion.com/mobile-app");
    expect(url).toBe(
      "intent://post/p1#Intent;scheme=orovion;package=com.orovion.app;" +
      "S.browser_fallback_url=https%3A%2F%2Forovion.com%2Fmobile-app;end",
    );
  });

  it("detects the platform from the user agent", () => {
    expect(platformFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(platformFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(platformFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("other");
  });

  it("sends 'Get the app' to /mobile-app until a store URL is configured", () => {
    expect(storeUrl("other")).toBe(`${SITE_URL}/mobile-app`);
  });
});
