import { describe, it, expect } from "vitest";
import { detectShare } from "@/lib/shareDetect";

/**
 * REGRESSION GUARDS for chat share cards. Each `null` here is a share that would
 * render as a bare link instead of a card, which is how these bugs looked:
 *  - Pulse links moved to /pulse/<id> while this only knew /reel/<id>, so every
 *    shared Pulse showed as plain text.
 *  - The canonical post link /p/<id> was never recognised at all.
 *  - A typed share whose content was a URL (the app's fallback send) was looked
 *    up by the whole URL, 404'd, and showed "no longer available".
 */
const text = (content: string) => ({ type: "text", content });

describe("typed shares (the message type says what it is)", () => {
  it("maps each wire type to its card", () => {
    expect(detectShare({ type: "shared_reel", content: "r1" })).toEqual({ shareType: "pulse", entityId: "r1" });
    expect(detectShare({ type: "shared_post", content: "p1" })).toEqual({ shareType: "post", entityId: "p1" });
    expect(detectShare({ type: "shared_profile", content: "u1" })).toEqual({ shareType: "profile", entityId: "u1" });
  });

  it("reads messageType when type is absent", () => {
    expect(detectShare({ messageType: "shared_reel", content: "r1" })).toEqual({ shareType: "pulse", entityId: "r1" });
  });

  it("takes the id out of a URL instead of looking up the URL itself", () => {
    expect(detectShare({ type: "shared_reel", content: "https://www.orovion.com/pulse/r1" }))
      .toEqual({ shareType: "pulse", entityId: "r1" });
    expect(detectShare({ type: "shared_post", content: "https://www.orovion.com/p/p1?utm_source=x" }))
      .toEqual({ shareType: "post", entityId: "p1" });
  });

  it("ignores a typed share with no content", () => {
    expect(detectShare({ type: "shared_reel", content: "" })).toBeNull();
  });
});

describe("links pasted into a text message", () => {
  it("recognises the current Pulse link", () => {
    expect(detectShare(text("look https://www.orovion.com/pulse/r1"))).toEqual({ shareType: "pulse", entityId: "r1" });
  });

  it("still recognises legacy reel links, web and app-scheme, any case", () => {
    expect(detectShare(text("https://www.orovion.com/reel/r1"))).toEqual({ shareType: "pulse", entityId: "r1" });
    expect(detectShare(text("orovion://reel/r1"))).toEqual({ shareType: "pulse", entityId: "r1" });
    expect(detectShare(text("Orovion://Pulse/r1"))).toEqual({ shareType: "pulse", entityId: "r1" });
  });

  it("recognises the canonical post link and every legacy post path", () => {
    for (const seg of ["p", "post", "case", "research", "thesis"]) {
      expect(detectShare(text(`https://www.orovion.com/${seg}/p1`))).toEqual({ shareType: "post", entityId: "p1" });
    }
  });

  it("recognises a profile link", () => {
    expect(detectShare(text("https://www.orovion.com/profile/u1"))).toEqual({ shareType: "profile", entityId: "u1" });
  });

  it("does not mistake a longer path for a share segment", () => {
    // Each segment must be followed by "/" — `pulses` is not `pulse`.
    expect(detectShare(text("https://www.orovion.com/pulses/r1"))).toBeNull();
    expect(detectShare(text("https://www.orovion.com/posts/p1"))).toBeNull();
  });

  it("returns null for ordinary text", () => {
    expect(detectShare(text("see you at 5"))).toBeNull();
    expect(detectShare(null)).toBeNull();
    expect(detectShare(undefined)).toBeNull();
  });
});
