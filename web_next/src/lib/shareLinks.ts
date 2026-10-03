import { absoluteUrl } from "@/lib/seo";

/**
 * The one place the web builds share links. Same shapes as the Flutter app's
 * ShareService and api-service's share-link endpoints:
 *
 *   profile  https://www.orovion.com/<username>     (no username yet: /profile/<userId>)
 *   post     https://www.orovion.com/p/<postId>     (case studies, research, theses too)
 *   pulse    https://www.orovion.com/pulse/<reelId>
 *
 * The public pages behind them live in `src/app/(public)/`. The origin is
 * `SITE_URL`, so a share link always points at the canonical site.
 */

/** Username format as api-service accepts it. The api owns the reserved list. */
export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

/** Post / pulse ids (CUID2-style), as api-service's public endpoints accept them. */
export const CONTENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** What older profile links carried: a user id, a publicProfileSlug or a username. */
export const PROFILE_REF_RE = /^[A-Za-z0-9._-]{1,64}$/;

/** A URL path segment, decoded; null when it isn't valid percent-encoding. */
export function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function profileUrl(username?: string | null, userId?: string | null): string {
  const handle = String(username || "").replace(/^@/, "").toLowerCase();
  if (USERNAME_RE.test(handle)) return absoluteUrl(`/${handle}`);
  return userId ? absoluteUrl(`/profile/${encodeURIComponent(userId)}`) : "";
}

export const postUrl = (id: string) => absoluteUrl(`/p/${encodeURIComponent(id)}`);
export const pulseUrl = (id: string) => absoluteUrl(`/pulse/${encodeURIComponent(id)}`);

/**
 * Reads the handle out of a `/<username>` path segment. null when it can't be a
 * username (the page 404s without asking the api); otherwise the lowercase
 * handle, and whether the URL is already canonical (`/@DrAnya` is not — it
 * redirects to `/dranya`).
 */
export function parseHandle(segment: string): { handle: string; canonical: boolean } | null {
  const raw = decodeSegment(segment);
  if (raw === null) return null;
  const handle = raw.replace(/^@/, "").toLowerCase();
  if (!USERNAME_RE.test(handle)) return null;
  return { handle, canonical: raw === handle };
}

/**
 * A username the api returned as a redirect target, or null if it isn't one.
 * Guards `redirect(\`/${target}\`)`: a value like "/evil.com" would become the
 * off-site `//evil.com`, and a target equal to the current handle would loop.
 */
export function safeHandleTarget(value: unknown, current?: string): string | null {
  return typeof value === "string" && USERNAME_RE.test(value) && value !== current ? value : null;
}

// ── Opening the app ─────────────────────────────────────────────────────────

/**
 * Custom-scheme targets every released app build already routes
 * (`handleGenerateRoute` in the app's main.dart) — deliberately id-based, so an
 * old install opens the right screen from a new link.
 */
export type AppTarget = { type: "profile" | "post" | "reel"; id: string };

export const APP_SCHEME = "orovion";
export const APP_PACKAGE = "com.orovion.app";

export const appSchemeUrl = ({ type, id }: AppTarget) => `${APP_SCHEME}://${type}/${encodeURIComponent(id)}`;

/** Android intent link: opens the app when installed, otherwise `fallbackUrl`. */
export const androidIntentUrl = ({ type, id }: AppTarget, fallbackUrl: string) =>
  `intent://${type}/${encodeURIComponent(id)}#Intent;scheme=${APP_SCHEME};package=${APP_PACKAGE};` +
  `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;

export type Platform = "android" | "ios" | "other";

export function platformFromUserAgent(ua: string): Platform {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

/** Where "Get the app" points: the store listing once it exists, else /mobile-app. */
export function storeUrl(platform: Platform): string {
  const configured =
    platform === "android" ? process.env.NEXT_PUBLIC_PLAY_STORE_URL
    : platform === "ios" ? process.env.NEXT_PUBLIC_APP_STORE_URL
    : undefined;
  return configured || absoluteUrl("/mobile-app");
}
