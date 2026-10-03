// Offline-first data cache — the app-layer half of the offline story.
//
// The service worker (public/sw.js) makes the SHELL load offline; this makes the
// DATA render offline. It caches previously-fetched API payloads per user in
// IndexedDB so a returning visitor sees their last-known feed / profile / etc.
// instantly and even with no network.
//
// SECURITY: entries are namespaced by userId, so on a shared browser one account
// can never read another's cached data. Call `clearOfflineCache()` on logout for
// hygiene (keying already isolates accounts, but this frees the space and drops
// the previous session's data).
//
// The pure key logic lives here (unit-tested); the IndexedDB I/O is in idb.ts.

import { idbGet, idbSet, idbClear } from "./idb";

const SCHEMA = "v1"; // bump to invalidate all cached shapes after a breaking change

export interface CacheEntry<T> {
  data: T;
  cachedAt: number; // epoch ms — enables a "last updated" hint / TTL if ever needed
}

/** Namespaced cache key: SCHEMA + user + logical key. Isolates accounts. */
export function cacheKey(userId: string | null | undefined, key: string): string {
  return `${SCHEMA}:${userId || "guest"}:${key}`;
}

/** Read a cached payload for the given user, or null on miss/unavailable. */
export function readCache<T>(userId: string | null | undefined, key: string): Promise<CacheEntry<T> | null> {
  return idbGet<CacheEntry<T>>(cacheKey(userId, key));
}

/** Cache a payload for the given user (best-effort; never throws). */
export function writeCache<T>(userId: string | null | undefined, key: string, data: T): Promise<void> {
  return idbSet(cacheKey(userId, key), { data, cachedAt: Date.now() } satisfies CacheEntry<T>);
}

/**
 * Should an incoming list replace what is already cached?
 *
 * Guards one specific regression: the feed writes its result to the cache on
 * every load, so a single empty response would overwrite a good cached page with
 * `[]` — and the instant offline paint (which exists precisely so a returning
 * visitor never sees a blank feed) would then render nothing. An empty result is
 * far more often a transient upstream condition than a real "you have no
 * content", so it must never destroy known-good data.
 *
 * Empty over empty/nothing is fine — there is nothing to lose.
 */
export function shouldWriteFeedCache(next: unknown[], prev: unknown[] | null | undefined): boolean {
  if (next.length > 0) return true;
  return !(prev && prev.length > 0);
}

/** Drop all cached data (call on logout). */
export function clearOfflineCache(): Promise<void> {
  return idbClear();
}
