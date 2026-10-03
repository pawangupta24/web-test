import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Served at /robots.txt — a Next 14 metadata route, so it is generated from
 * `SITE_URL` at build time and can never go stale the way a checked-in static
 * file does.
 *
 * Only the public marketing + legal surface is crawlable. Everything under
 * /app/* is auth-gated and renders an empty shell to a crawler; /login and
 * /onboarding are dead ends that would compete with the home page for the
 * brand query.
 *
 * The admin console is deliberately NOT listed. It lives behind the secret
 * `ADMIN_PANEL_SLUG` path (see `src/middleware.ts`) and robots.txt is public —
 * naming the slug here would publish the secret to anyone who asks for the
 * file. The guessable /admin path already 404s, and is listed only for tidiness.
 *
 * `/_next/` is intentionally NOT disallowed: Google must fetch the CSS and JS
 * to render the page, and blocking those assets degrades ranking.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/login", "/onboarding", "/admin", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
