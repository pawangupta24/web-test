import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { PublicProfileCard } from "@/components/public/PublicPreview";
import { getPublicProfile } from "@/lib/publicContent";
import { displayName, profileDescription } from "@/lib/publicPreview";
import { pageMetadata } from "@/lib/seo";
import { parseHandle, safeHandleTarget } from "@/lib/shareLinks";

// https://www.orovion.com/<username>. Every static root route (/app, /login, /help,
// …) and every file in public/ wins over this dynamic segment, which is why
// api-service reserves all of those names.
//
// Rendered on first request, then cached: a viral link costs one api call per
// two minutes, not one per visitor.
export const revalidate = 120;

type Props = { params: { username: string } };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseHandle(params.username);
  if (!parsed) return NOINDEX;
  const res = await getPublicProfile(parsed.handle);
  const p = res.kind === "ok" ? res.data.profile : undefined;
  if (!p) return NOINDEX;
  return pageMetadata({
    title: `${displayName(p)} (@${p.uniqueUsername})`,
    description: profileDescription(p),
    path: `/${p.uniqueUsername}`,
    image: p.profilePhoto || undefined,
    type: "profile",
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  const parsed = parseHandle(params.username);
  if (!parsed) notFound();
  if (!parsed.canonical) permanentRedirect(`/${parsed.handle}`);

  const res = await getPublicProfile(parsed.handle);
  if (res.kind === "notFound") notFound();
  // Thrown, not rendered: Next keeps serving the last good copy instead of
  // caching an outage as the page.
  if (res.kind === "error") throw new Error("Public profile temporarily unavailable");
  // A name the owner has since changed. Temporary: once the 30-day hold ends
  // the name can belong to someone else.
  if (res.data.redirectTo) {
    const next = safeHandleTarget(res.data.redirectTo, parsed.handle);
    if (!next) notFound();
    redirect(`/${next}`);
  }
  if (!res.data.profile) notFound();

  return <PublicProfileCard profile={res.data.profile} />;
}
