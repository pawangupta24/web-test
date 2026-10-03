/* Orovion service worker — app-shell offline support.
 *
 * Makes the site LOAD OFFLINE after a first visit by caching the app shell and
 * static assets. It deliberately does NOT touch `/api`, `/socket.io`, `/health`,
 * `/auth` or any non-GET request: those are user-specific/auth-sensitive and are
 * left network-only so no account is ever served another's cached data. Offline
 * DATA (per-user reads/writes) is handled at the app layer, not here.
 *
 * Request routing MIRRORS src/lib/offline.ts (swStrategyFor) — keep in sync.
 */
const VERSION = "orovion-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";

// Minimal shell precached on install so an offline first-load still shows a page.
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  // Activate the new worker immediately on next load (old caches cleaned below).
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Manual update trigger from the page (ServiceWorkerRegister) if ever needed.
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

const NETWORK_ONLY = [/^\/api\//, /^\/socket\.io\//, /^\/health$/, /^\/auth\//];

function strategyFor(request) {
  if (request.method !== "GET") return "bypass";
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }
  if (url.origin !== self.location.origin) return "bypass";
  const path = url.pathname;
  if (NETWORK_ONLY.some((re) => re.test(path))) return "bypass";
  if (path.startsWith("/_next/static/")) return "cache-first";
  if (request.mode === "navigate") return "network-first";
  return "swr";
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) (await caches.open(STATIC_CACHE)).put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    // Offline: serve the previously-visited page, else the offline shell.
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request);
  if (strategy === "bypass") return; // let the request hit the network normally
  if (strategy === "cache-first") return event.respondWith(cacheFirst(event.request));
  if (strategy === "network-first") return event.respondWith(networkFirst(event.request));
  return event.respondWith(staleWhileRevalidate(event.request));
});
