// Per-tab feed session id, echoed back to the api-gateway on every feed request.
//
// WHY THIS EXISTS
// media's personalized feed keeps a Redis "already served" set keyed by
// `posts:served:{viewer}:{session}` so page 2 never repeats page 1. When the
// client sends no session id, media used to fall back to a single literal
// 'default' key shared by every request, every tab and every guest, whose TTL
// was renewed on each call — so it never expired, accumulated every post, and
// the feed went blank. media now MINTS an id and returns it; this module is the
// client half of that contract: store what the server minted and send it back.
//
// KEEP THE SESSION — DO NOT ROTATE IT ON REFRESH. This module originally rotated
// the id on every refresh gesture, reasoning that a fresh served-set would
// surface new content. The opposite happens: the ranking is deterministic, so
// an empty served-set re-serves the IDENTICAL top posts in the same order, and
// "refresh" visibly did nothing. Keeping the id is what makes a refresh (or a
// reload) return posts not yet served. When the whole pool has been served the
// server resets the set itself and serves a fresh page, so the feed cannot be
// stranded empty. Rotation is for logout only.
//
// Never omit the id on page 2+ either: without it the server mints a new
// session per request, and page 2 comes back identical to page 1.
//
// sessionStorage, not localStorage: it is per-tab, so two tabs get independent
// served-sets instead of corrupting each other's pagination. It is also cleared
// by the browser when the tab closes, which is exactly the desired lifetime.
//
// Framework-free so it is unit-testable without React (repo rule: testable logic
// belongs in src/lib, not inside a component effect).

/** Feeds with independent served-sets. Home and explore must never share one. */
export type FeedScope = "home" | "explore";

const storageKey = (scope: FeedScope) => `orovion:feed:session:${scope}`;

// Every access is guarded: sessionStorage is absent during SSR and throws
// outright in Safari private mode. A feed that cannot read its session id still
// works — it just gets a freshly minted one from the server each time.
const store = (): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/** The current session id for this tab, or null if none is established yet. */
export function getFeedSessionId(scope: FeedScope): string | null {
  try {
    return store()?.getItem(storageKey(scope)) || null;
  } catch {
    return null;
  }
}

/** Remember the id the server minted, so the next request can echo it. */
export function setFeedSessionId(scope: FeedScope, id: string | null | undefined): void {
  if (!id || typeof id !== "string") return;
  try {
    store()?.setItem(storageKey(scope), id);
  } catch {
    /* private mode / quota — the server just mints another one next request */
  }
}

/**
 * Drop this tab's session so the next request omits the id and the server mints
 * a fresh one. Call on LOGOUT only. Calling it on refresh re-serves the same
 * posts — see the header.
 */
export function rotateFeedSession(scope: FeedScope): void {
  try {
    store()?.removeItem(storageKey(scope));
  } catch {
    /* nothing to clear is not an error */
  }
}

/** Test seam — clears every scope. */
export function _resetFeedSessions(): void {
  (["home", "explore"] as FeedScope[]).forEach(rotateFeedSession);
}
