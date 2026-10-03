import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamMemberPage from "@/screens/TeamMemberPage";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { personSchema, breadcrumbSchema } from "@/lib/schema";
import { TEAM } from "@/lib/team";

/** Prerender one page per founder at build time. */
export function generateStaticParams() {
  return TEAM.map((m) => ({ slug: m.slug }));
}

// Anything not in TEAM is a real 404, not a rendered-empty page. Without this a
// crawler hitting /team/anything would get a 200 with no content — a soft 404.
export const dynamicParams = false;

function findMember(slug: string) {
  return TEAM.find((m) => m.slug === slug);
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const m = findMember(params.slug);
  if (!m) return { title: "Not found — Orovion", robots: { index: false, follow: false } };

  // Built defensively: an empty `role` must not leave a dangling em dash in the
  // title or "is  at Orovion" in the snippet, both of which ship straight to
  // Google.
  const role = m.role?.trim();

  return pageMetadata({
    // Comma, not a dash: pageMetadata already appends " — Orovion", and two
    // em dashes in one <title> reads as a broken string in a search result.
    title: role ? `${m.name}, ${role}` : m.name,
    // The tagline is a single sentence written for humans; it makes a better
    // search snippet than a truncated story paragraph.
    description: [role ? `${m.name} is ${role} at Orovion.` : `${m.name} at Orovion.`, m.tagline]
      .filter(Boolean)
      .join(" ")
      .slice(0, 300),
    path: `/team/${m.slug}`,
    image: m.photo,
    type: "profile",
  });
}

export default function Page({ params }: { params: { slug: string } }) {
  const member = findMember(params.slug);
  if (!member) notFound();

  return (
    <>
      <JsonLd
        data={[
          personSchema(member),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Team", path: "/team" },
            { name: member.name, path: `/team/${member.slug}` },
          ]),
        ]}
      />
      <TeamMemberPage member={member} />
    </>
  );
}
