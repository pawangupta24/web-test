import { afterEach, describe, it, expect, vi } from "vitest";
import { cn, compact, roleLabel, initials, timeAgo, timeAgoLong, avatarColor, pulsePoster, newClientId } from "@/lib/utils";

describe("newClientId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a distinct key per call", () => {
    const keys = new Set([newClientId(), newClientId(), newClientId()]);
    expect(keys.size).toBe(3);
    keys.forEach((k) => expect(k.length).toBeGreaterThan(8));
  });

  it("falls back when crypto.randomUUID is unavailable (non-secure context)", () => {
    // randomUUID needs https or localhost; without the fallback a send would
    // throw here and the message would never leave the browser.
    vi.stubGlobal("crypto", {});
    const id = newClientId();
    expect(id).toMatch(/^web-\d+-[0-9a-z]+$/);
  });
});

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
    expect(cn()).toBe("");
  });
});

describe("compact", () => {
  it("formats counts the way the feed metrics expect", () => {
    expect(compact(0)).toBe("0");
    expect(compact(999)).toBe("999");
    expect(compact(1000)).toBe("1k");
    expect(compact(1500)).toBe("1.5k");
    expect(compact(1_000_000)).toBe("1.0M");
    expect(compact(2_500_000)).toBe("2.5M");
  });
  it("defaults to 0", () => {
    expect(compact()).toBe("0");
  });
});

describe("roleLabel", () => {
  it("maps backend role keys to display labels", () => {
    expect(roleLabel("doctor")).toBe("Health Professional");
    expect(roleLabel("student")).toBe("Medical Student");
    expect(roleLabel("general_user")).toBe("General User");
    expect(roleLabel("anything-else")).toBe("Member");
  });
});

describe("initials", () => {
  it("strips honorifics and takes up to two initials", () => {
    expect(initials("Dr. Priya Sharma")).toBe("PS");
    expect(initials("John")).toBe("J");
    expect(initials("")).toBe("");
  });
});

describe("timeAgo / timeAgoLong", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  it("renders relative buckets", () => {
    expect(timeAgo(ago(0))).toBe("now");
    expect(timeAgo(ago(2 * 60_000))).toBe("2m");
    expect(timeAgo(ago(3 * 3600_000))).toBe("3h");
    expect(timeAgo(ago(2 * 86_400_000))).toBe("2d");
    expect(timeAgo("")).toBe("");
  });
  it("appends 'ago' but never says 'now ago'", () => {
    expect(timeAgoLong(ago(0))).toBe("just now");
    expect(timeAgoLong(ago(5 * 60_000))).toBe("5m ago");
  });
});

describe("avatarColor", () => {
  it("is deterministic for a given seed", () => {
    expect(avatarColor("Priya")).toBe(avatarColor("Priya"));
  });
});

/**
 * pulsePoster used to derive a poster by swapping the video extension to .jpg,
 * which Cloudinary renders on demand. Storage moved to S3 + CloudFront, which
 * serves only real objects, so that swap pointed at a file nobody uploaded:
 * verified in production as a 404 on the .jpg beside a 200 on the .mp4, surfaced
 * to the browser as CloudFront 403 AccessDenied on every reel on screen.
 *
 * It now returns a poster ONLY when one genuinely exists. Callers render a
 * placeholder for undefined instead of an <img> with no src.
 */
describe("pulsePoster", () => {
  const mp4 = "https://cdn.example.net/orovion/users/u1/reels/a.mp4";

  it("never invents a .jpg from a video url — the object does not exist on S3", () => {
    expect(pulsePoster({ videoUrl: mp4 })).toBeUndefined();
  });

  it("returns undefined when every media field is the same video file", () => {
    // api's S3 upload returns no thumbnail_url, so media stores null and the
    // client sees only video URLs. This is the COMMON case for reels today.
    expect(pulsePoster({ videoUrl: mp4, thumbnailUrl: mp4, posterUrl: mp4 })).toBeUndefined();
  });

  it("uses a real image thumbnail when one is provided", () => {
    expect(pulsePoster({ videoUrl: mp4, thumbnailUrl: "https://cdn/x/cover.jpg" })).toBe("https://cdn/x/cover.jpg");
  });

  it("accepts posterUrl as the fallback image source", () => {
    expect(pulsePoster({ videoUrl: mp4, posterUrl: "https://cdn/x/poster.webp" })).toBe("https://cdn/x/poster.webp");
  });

  it("does not treat an hls playlist as an image", () => {
    expect(pulsePoster({ hlsUrl: "https://cdn/x/a.m3u8?token=1" })).toBeUndefined();
  });

  it("still recognises an image carrying a query string", () => {
    expect(pulsePoster({ thumbnailUrl: "https://cdn/x/cover.jpg?v=2" })).toBe("https://cdn/x/cover.jpg?v=2");
  });

  it("returns undefined when there is no media at all", () => {
    expect(pulsePoster({})).toBeUndefined();
    expect(pulsePoster(null)).toBeUndefined();
  });
});
