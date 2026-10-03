// Decides when a feed load must bypass the api-gateway's stale-while-revalidate
// cache (`?refresh=1`, honoured by content.gateway.getFeed).
//
// The rule is intent-scoped rather than blanket force-fresh: a real page reload
// or an explicit refresh gesture has to show current data, while a cheap in-app
// move (flipping between filter chips) can still ride the cached hero page.
//
// The timestamps live in MODULE scope on purpose — a hard browser reload discards
// the module, so the first feed load after F5 always forces fresh. That is the
// whole mechanism behind "reload actually reloads".
//
// Framework-free so it is unit-testable without React (repo rule: testable logic
// belongs in src/lib, not inside a component effect).

/** Feed variant key → epoch ms of the last forced-fresh load. */
const lastFresh = new Map<string, number>();

/** Matches HOME_FEED_FRESH_MS on the gateway, so client and server age out together. */
export const FRESH_WINDOW_MS = 20000;

/**
 * @param key        identifies the feed variant (filter kind + key)
 * @param userIntent true for a reload / pull-to-refresh / refresh-button load
 * @returns whether this request should carry `refresh=1`
 */
export function shouldForceFresh(
  key: string,
  userIntent: boolean,
  now: number = Date.now(),
  windowMs: number = FRESH_WINDOW_MS,
): boolean {
  const prev = lastFresh.get(key);
  const aged = prev === undefined || now - prev >= windowMs;
  if (userIntent || aged) {
    lastFresh.set(key, now);
    return true;
  }
  return false;
}

/** Test seam — clears the recorded timestamps. */
export function _resetFeedFreshness(): void {
  lastFresh.clear();
}
