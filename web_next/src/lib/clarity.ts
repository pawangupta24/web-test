/**
 * Microsoft Clarity (heatmaps + session recordings) — pure half.
 *
 * Framework-free so it can be unit-tested without React or a DOM (see
 * `src/lib/__tests__/clarity.test.ts`). The DOM side — injecting the tag and
 * starting/stopping it across SPA navigations — lives in
 * `src/components/analytics/ClarityAnalytics.tsx`.
 *
 * ## Why an allowlist, not a denylist
 *
 * Orovion is a healthcare product: `/app/*` renders private clinician DMs,
 * case studies, prescriptions and consult notes, and session replay captures the
 * DOM. So tracking is **fail-closed** — a route is recorded only if it is named
 * here. Anything unlisted is untracked, which covers three things a denylist
 * would get wrong:
 *
 *   1. `/app/*` and `/onboarding` — the PHI surfaces.
 *   2. The operator console, served at a secret `ADMIN_PANEL_SLUG` that is
 *      server-only and therefore *unknowable* to this client code. A denylist
 *      literally could not name it.
 *   3. Any route added in future, which stays untracked until someone
 *      deliberately adds it below.
 */

/** Public marketing / auth-entry routes. Exact matches. */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/help",
  "/privacy",
  "/terms",
  "/mobile-app",
  "/team",
]);

/** Public route families (dynamic segments), e.g. /team/pawan-gupta. */
const PUBLIC_PREFIXES = ["/team/"];

/**
 * A Clarity project id as minted by clarity.microsoft.com — short lowercase
 * alphanumeric. Validated because the id is interpolated into an INLINE script
 * tag: a malformed or hostile env value must never become executable code.
 */
const PROJECT_ID_RE = /^[a-z0-9]{1,32}$/i;

export function isValidProjectId(id: string | undefined | null): boolean {
  return typeof id === "string" && PROJECT_ID_RE.test(id);
}

/** Strip a trailing slash so "/team/" and "/team" resolve the same. */
function normalize(pathname: string): string {
  if (!pathname) return "";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname;
}

/** May Clarity record this route? Unlisted routes are always false. */
export function isTrackablePath(pathname: string | undefined | null): boolean {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return false;
  const path = normalize(pathname);
  if (PUBLIC_ROUTES.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

/**
 * The official Clarity tag, plus an immediate `consentv2` call that denies both
 * storage types so the tag runs **cookie-less** (no `_clck` / `_clsk`). That is
 * what makes shipping this without a cookie banner defensible. If a consent
 * banner is added later, flip these to "granted" once the user opts in.
 *
 * Returns null for an invalid/absent id so the caller renders nothing.
 */
export function clarityInitSnippet(projectId: string | undefined | null): string | null {
  if (!isValidProjectId(projectId)) return null;
  return (
    `(function(c,l,a,r,i,t,y){` +
    `c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};` +
    `t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;` +
    `y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);` +
    `})(window,document,"clarity","script","${projectId}");` +
    `window.clarity("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"});`
  );
}
