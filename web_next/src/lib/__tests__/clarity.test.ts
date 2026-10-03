import { describe, it, expect } from "vitest";
import { isTrackablePath, isValidProjectId, clarityInitSnippet } from "../clarity";

describe("isValidProjectId", () => {
  it("accepts a real Clarity project id", () => {
    expect(isValidProjectId("abcd1234ef")).toBe(true);
    expect(isValidProjectId("A1")).toBe(true);
  });

  it("rejects anything that could break out of the inline script tag", () => {
    expect(isValidProjectId('");alert(1);//')).toBe(false);
    expect(isValidProjectId("abc</script>")).toBe(false);
    expect(isValidProjectId("has space")).toBe(false);
    expect(isValidProjectId("has-dash")).toBe(false);
    expect(isValidProjectId("")).toBe(false);
    expect(isValidProjectId(undefined)).toBe(false);
    expect(isValidProjectId(null)).toBe(false);
  });
});

describe("isTrackablePath — public routes are recorded", () => {
  it("allows the marketing and auth-entry routes", () => {
    for (const p of ["/", "/login", "/help", "/privacy", "/terms", "/mobile-app", "/team"]) {
      expect(isTrackablePath(p)).toBe(true);
    }
  });

  it("allows team member pages under the /team/ family", () => {
    expect(isTrackablePath("/team/pawan-gupta")).toBe(true);
  });

  it("ignores a trailing slash", () => {
    expect(isTrackablePath("/team/")).toBe(true);
    expect(isTrackablePath("/login/")).toBe(true);
  });
});

describe("isTrackablePath — sensitive routes are never recorded", () => {
  it("blocks every /app/* route (chat, cases, prescriptions, consults)", () => {
    for (const p of ["/app", "/app/", "/app/messages", "/app/pulse", "/app/cases", "/app/profile/abc"]) {
      expect(isTrackablePath(p)).toBe(false);
    }
  });

  it("blocks onboarding and the admin console", () => {
    expect(isTrackablePath("/onboarding")).toBe(false);
    expect(isTrackablePath("/admin")).toBe(false);
  });

  it("blocks the secret ADMIN_PANEL_SLUG route, which this code cannot know", () => {
    expect(isTrackablePath("/some-long-random-operator-slug")).toBe(false);
  });

  it("is fail-closed: an unlisted / future route is untracked by default", () => {
    expect(isTrackablePath("/pricing")).toBe(false);
    expect(isTrackablePath("/blog/whatever")).toBe(false);
  });

  it("does not let a lookalike prefix slip through", () => {
    expect(isTrackablePath("/teams")).toBe(false);
    expect(isTrackablePath("/team-secret")).toBe(false);
    expect(isTrackablePath("/loginx")).toBe(false);
  });

  it("rejects malformed input rather than assuming it is public", () => {
    expect(isTrackablePath("")).toBe(false);
    expect(isTrackablePath("login")).toBe(false); // no leading slash
    expect(isTrackablePath(undefined)).toBe(false);
    expect(isTrackablePath(null)).toBe(false);
    expect(isTrackablePath(42 as any)).toBe(false);
  });
});

describe("clarityInitSnippet", () => {
  it("returns null without a usable project id, so nothing is injected", () => {
    expect(clarityInitSnippet(undefined)).toBeNull();
    expect(clarityInitSnippet("")).toBeNull();
    expect(clarityInitSnippet('");alert(1);//')).toBeNull();
  });

  it("loads the tag for the given project", () => {
    const s = clarityInitSnippet("abcd1234ef")!;
    expect(s).toContain("https://www.clarity.ms/tag/");
    expect(s).toContain('"abcd1234ef"');
  });

  it("boots cookie-less: consent is denied for both storage types", () => {
    const s = clarityInitSnippet("abcd1234ef")!;
    expect(s).toContain("consentv2");
    expect(s).toContain('ad_Storage:"denied"');
    expect(s).toContain('analytics_Storage:"denied"');
  });

  it("installs the queueing stub, so a stop issued before load is not lost", () => {
    expect(clarityInitSnippet("abcd1234ef")!).toContain("c[a].q");
  });
});
