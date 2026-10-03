import type { Metadata } from "next";

/**
 * Single source of truth for every SEO surface — canonical URLs, OpenGraph /
 * Twitter cards, robots.txt, sitemap.xml and JSON-LD all read from here.
 *
 * The public origin is env-driven on purpose: a preview deployment that emitted
 * canonical tags pointing at production would ask Google to drop its own URLs.
 * `NEXT_PUBLIC_SITE_URL` is inlined at BUILD time like every other
 * `NEXT_PUBLIC_*` var, so set it before `npm run build`.
 *
 * NOTE: this is the *site* origin (where this Next app is served). It is NOT
 * `api.orovion.com` / `chat.orovion.com` — those are backend origins and are
 * configured separately in `src/lib/backend.ts`.
 */
// www is canonical (the apex 308s to it). Share links and the Android/iOS
// app-link verification files are served from exactly this host, and app-link
// matching is host-exact — the app's AppConfig.appDomain and its App Links host
// must be this same value.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.orovion.com").replace(/\/+$/, "");

export const SITE_NAME = "Orovion";

/** Title of the home page, and the fallback for anything that doesn't set one. */
export const DEFAULT_TITLE = "Orovion — A trusted network of clinicians";

/** `<meta name="description">` fallback for every page without its own. */
export const DEFAULT_DESCRIPTION =
  "Orovion is a professional healthcare network for doctors, medical students and patients to connect, share clinical knowledge, discuss cases, discover insights and access consultations.";

/**
 * Official brand profiles, emitted as `Organization.sameAs`. This is the signal
 * Google uses to tie this domain to the Orovion brand entity — the prerequisite
 * for a Knowledge Panel. Keep in sync with `SOCIALS` in `src/lib/marketing.ts`
 * (the marketing footer and /contact render those).
 */
export const SOCIAL_PROFILES = [
  "https://www.linkedin.com/company/orovion/",
  "https://x.com/orovion",
  "https://www.instagram.com/orovion.app",
  "https://www.facebook.com/people/Orovion/61591959148775/",
];

export const CONTACT_EMAIL = "hello@orovion.com";
export const SUPPORT_EMAIL = "support@orovion.com";

/** Root-relative path -> absolute URL on the public origin. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaInput = {
  /** Bare title — " — Orovion" is appended for you. */
  title: string;
  description?: string;
  /** Route path (e.g. "/team"); becomes the canonical URL. */
  path: string;
  /** Root-relative or absolute OG image. Omit to inherit the generated site card. */
  image?: string;
  type?: "website" | "article" | "profile";
  /** Set for pages that must never appear in search results. */
  noindex?: boolean;
};

/**
 * Builds a page's complete Metadata — canonical + OpenGraph + Twitter in one
 * call — so no route file hand-rolls tags and none of the three can drift apart.
 */
export function pageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = "website",
  noindex = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = `${title} — ${SITE_NAME}`;
  const images = image ? [{ url: image, width: 1200, height: 630, alt: fullTitle }] : undefined;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      locale: "en_US",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
