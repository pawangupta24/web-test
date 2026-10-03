import { describe, expect, it } from "vitest";
import {
  clip, compactCount, displayName, postHeadline, profileDescription, pulseHeadline,
  type PublicAuthor, type PublicPost, type PublicProfile, type PublicPulse,
} from "@/lib/publicPreview";

const author: PublicAuthor = {
  id: "a1", fullName: "Anya Sharma", titlePrefix: "Dr.", uniqueUsername: "dranya", profilePhoto: null, isVerified: true,
};

describe("displayName", () => {
  it("prefixes the title", () => {
    expect(displayName(author)).toBe("Dr. Anya Sharma");
  });

  it("does not double a prefix the name already carries", () => {
    expect(displayName({ fullName: "Dr. Anya Sharma", titlePrefix: "Dr." })).toBe("Dr. Anya Sharma");
  });

  it("never renders an empty name", () => {
    expect(displayName({ fullName: "  ", titlePrefix: null })).toBe("Orovion member");
  });
});

describe("clip", () => {
  it("collapses whitespace and ellipsises past the limit", () => {
    expect(clip("a  b\n\nc", 10)).toBe("a b c");
    expect(clip("x".repeat(20), 10)).toBe(`${"x".repeat(9)}…`);
    expect(clip(null, 10)).toBe("");
  });
});

describe("link-preview text", () => {
  it("describes a profile by headline and follower count", () => {
    const p = { ...author, uniqueUsername: "dranya", role: "doctor", professionalHeadline: "Cardiologist",
      specialization: null, followersCount: 1234, postsCount: 5 } as PublicProfile;
    expect(profileDescription(p)).toBe("Cardiologist · 1.2K followers · View on Orovion.");
    expect(profileDescription({ ...p, professionalHeadline: null, followersCount: 1 })).toBe("1 follower · View on Orovion.");
  });

  it("titles a post by its title, else its text, else its author", () => {
    const base = { author, title: null, excerpt: "" } as PublicPost;
    expect(postHeadline({ ...base, title: "Rare presentation" })).toBe("Rare presentation");
    expect(postHeadline({ ...base, excerpt: "Short note" })).toBe("Short note");
    expect(postHeadline(base)).toBe("Post by Dr. Anya Sharma");
  });

  it("titles a pulse by its caption, else its author", () => {
    const base = { author, caption: "" } as PublicPulse;
    expect(pulseHeadline(base)).toBe("Pulse by Dr. Anya Sharma");
  });

  it("formats counts compactly", () => {
    expect(compactCount(1234)).toBe("1.2K");
    expect(compactCount(0)).toBe("0");
  });
});
