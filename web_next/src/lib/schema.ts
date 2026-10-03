import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, SOCIAL_PROFILES, CONTACT_EMAIL, absoluteUrl } from "@/lib/seo";
import type { TeamMember } from "@/lib/team";

/**
 * JSON-LD builders (schema.org). Pure functions with no React or Next imports,
 * so they stay unit-testable from `src/lib/__tests__/`.
 *
 * Stable `@id` values let the graph cross-reference itself: a Person points at
 * the Organization, the Organization lists its founders. Google reads that as
 * one connected entity rather than a pile of unrelated snippets — which is what
 * makes a brand eligible for a Knowledge Panel.
 */

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

/** Canonical `@id` for a founder, derived from their team slug. */
export function personId(slug: string): string {
  return absoluteUrl(`/team/${slug}#person`);
}

export function organizationSchema(team: TeamMember[] = []) {
  const founders = team
    .filter((m) => /founder/i.test(m.role))
    .map((m) => ({ "@type": "Person", "@id": personId(m.slug), name: m.name }));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    // TODO: swap for a 512x512 PNG when one exists — Google's logo guidelines
    // do not officially support SVG.
    logo: absoluteUrl("/brand/wordmark-primary.svg"),
    image: absoluteUrl("/opengraph-image"),
    description: DEFAULT_DESCRIPTION,
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_PROFILES,
    ...(founders.length ? { founder: founders } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        availableLanguage: ["English"],
      },
    ],
  };
}

export function webSiteSchema() {
  // Deliberately NO `potentialAction: SearchAction`. That markup declares a
  // PUBLIC search results URL, and Orovion's search lives at /app/search behind
  // auth — pointing Google at a login wall would be a false claim. Add it only
  // if a public, crawlable search results page ever ships.
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export function personSchema(m: TeamMember) {
  const sameAs = [m.socials.linkedin, m.socials.instagram].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId(m.slug),
    name: m.name,
    url: absoluteUrl(`/team/${m.slug}`),
    ...(m.role ? { jobTitle: m.role } : {}),
    description: m.tagline,
    ...(m.photo ? { image: absoluteUrl(m.photo) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(m.education ? { alumniOf: { "@type": "EducationalOrganization", name: m.education } } : {}),
    ...(m.location ? { homeLocation: { "@type": "Place", name: m.location } } : {}),
    knowsAbout: m.focus,
    worksFor: { "@id": ORG_ID },
  };
}

export function faqPageSchema(items: readonly (readonly [string, string])[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl("/help#faq"),
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function mobileAppSchema() {
  // No `offers` and no `aggregateRating`: the store listings are not live yet
  // (the landing badges route to /mobile-app), and inventing a price or a rating
  // is exactly what earns a structured-data manual action. Add `downloadUrl` +
  // real ratings once the apps ship.
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} — healthcare network`,
    url: absoluteUrl("/mobile-app"),
    applicationCategory: "HealthApplication",
    operatingSystem: "iOS, Android",
    description: DEFAULT_DESCRIPTION,
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}
