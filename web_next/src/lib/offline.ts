// Offline-first: how the service worker should handle a given request.
//
// Pure + framework-free so it's unit-testable without a ServiceWorker/DOM (per
// this repo's "keep testable logic in src/lib" rule). `public/sw.js` MIRRORS
// these rules — keep the two in sync.
//
// Design constraint: this app's auth is per-user and sensitive (in-memory access
// token + httpOnly refresh cookie + CSRF). So the shared SW cache must NEVER
// hold authenticated, user-specific responses — otherwise one account could be
// served another's data, and auth/CSRF flows would be disturbed. Therefore all
// `/api`, `/socket.io`, `/health`, `/auth` and every non-GET request BYPASS the
// SW entirely. Offline DATA (reads/writes per user) is handled separately at the
// app layer (IndexedDB), not here. This worker's job is purely the app SHELL +
// static assets, so the site loads offline after a first visit.

export type SwStrategy = "bypass" | "cache-first" | "network-first" | "swr";

export interface SwRequestInfo {
  method: string;
  url: string; // full request URL
  origin: string; // the app's own origin (self.location.origin)
  mode?: string; // Request.mode — "navigate" for top-level page loads
}

// Never-cache paths: user-specific data, auth, realtime, liveness.
const NETWORK_ONLY: RegExp[] = [/^\/api\//, /^\/socket\.io\//, /^\/health$/, /^\/auth\//];

export function swStrategyFor(req: SwRequestInfo): SwStrategy {
  if (req.method !== "GET") return "bypass"; // never cache mutations

  let path: string;
  let sameOrigin: boolean;
  try {
    const u = new URL(req.url);
    sameOrigin = u.origin === req.origin;
    path = u.pathname;
  } catch {
    return "bypass";
  }

  // Cross-origin (fonts, Firebase, CDN, media) → leave to the browser/HTTP cache.
  if (!sameOrigin) return "bypass";
  // Authenticated / realtime / health → network-only (see header).
  if (NETWORK_ONLY.some((re) => re.test(path))) return "bypass";
  // Content-hashed immutable build output → cache-first (instant, offline-safe).
  if (path.startsWith("/_next/static/")) return "cache-first";
  // Page navigations → network-first, fall back to cached page then offline shell
  // (fresh when online; still loads a previously-visited route offline).
  if (req.mode === "navigate") return "network-first";
  // Other same-origin static assets (svg/img/manifest/icons) → stale-while-revalidate.
  return "swr";
}
