import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveProfileRef } from "@/lib/publicContent";
import { decodeSegment, PROFILE_REF_RE, safeHandleTarget } from "@/lib/shareLinks";

// https://www.orovion.com/profile/<ref> — older profile links carried a user id or a
// publicProfileSlug, and a profile share with no username yet still does. Sends
// them to the canonical /<username>. Temporary redirect: a rename changes it.
export const revalidate = 120;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }: { params: { ref: string } }) {
  const ref = decodeSegment(params.ref);
  if (!ref || !PROFILE_REF_RE.test(ref)) notFound();

  const res = await resolveProfileRef(ref);
  if (res.kind === "notFound") notFound();
  if (res.kind === "error") throw new Error("Profile link temporarily unavailable");
  const username = safeHandleTarget(res.data.username);
  if (!username) notFound();
  redirect(`/${username}`);
}
