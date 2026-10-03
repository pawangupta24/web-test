import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPostCard } from "@/components/public/PublicPreview";
import { getPublicPost } from "@/lib/publicContent";
import { clip, displayName, postHeadline } from "@/lib/publicPreview";
import { pageMetadata } from "@/lib/seo";
import { CONTENT_ID_RE } from "@/lib/shareLinks";

// https://www.orovion.com/p/<postId> — public posts only; case studies, research and
// theses are never public (api-service answers 404).
export const revalidate = 120;

type Props = { params: { id: string } };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!CONTENT_ID_RE.test(params.id)) return NOINDEX;
  const res = await getPublicPost(params.id);
  const p = res.kind === "ok" ? res.data.post : undefined;
  if (!p) return NOINDEX;
  return pageMetadata({
    title: postHeadline(p),
    description: clip(p.excerpt, 200) || `A post by ${displayName(p.author)} on Orovion.`,
    path: `/p/${p.id}`,
    image: p.imageUrl || undefined,
    type: "article",
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  if (!CONTENT_ID_RE.test(params.id)) notFound();
  const res = await getPublicPost(params.id);
  if (res.kind === "notFound") notFound();
  if (res.kind === "error") throw new Error("Public post temporarily unavailable");
  if (!res.data.post) notFound();
  return <PublicPostCard post={res.data.post} />;
}
