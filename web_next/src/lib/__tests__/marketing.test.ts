import { describe, it, expect } from "vitest";
import { LANDING_FAQ, CONTACT_FAQ, NAV_LINKS, SITEMAP } from "../marketing";
import { ALL_FAQ_ITEMS } from "../faq";

const questions = new Set(ALL_FAQ_ITEMS.map(([q]) => q));

describe("marketing FAQ selections", () => {
  // The marketing FAQs reuse Help center answers; if a question is renamed in
  // faq.ts the selection must follow, never silently fall out of sync.
  it.each([["landing", LANDING_FAQ], ["contact", CONTACT_FAQ]] as const)("%s FAQ only uses Help center questions", (_, items) => {
    expect(items.length).toBeGreaterThanOrEqual(4);
    for (const [q, a] of items) {
      expect(questions.has(q)).toBe(true);
      expect(a.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate questions", () => {
    for (const items of [LANDING_FAQ, CONTACT_FAQ]) {
      expect(new Set(items.map(([q]) => q)).size).toBe(items.length);
    }
  });
});

describe("site links", () => {
  it("points every nav and sitemap link at an internal path", () => {
    for (const l of [...NAV_LINKS, ...SITEMAP.flat()]) expect(l.href.startsWith("/")).toBe(true);
  });
});
