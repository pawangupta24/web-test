import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPulseCard } from "@/components/public/PublicPreview";
import { getPublicPulse } from "@/lib/publicContent";
import { clip, displayName, pulseHeadline } from "@/lib/publicPreview";
import { pageMetadata } from "@/lib/seo";
import { CONTENT_ID_RE } from "@/lib/shareLinks";

// https://www.orovion.com/pulse/<reelId> — poster only; signed-out visitors never get
// a playable stream.
export const revalidate = 120;

type Props = { params: { id: string } };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!CONTENT_ID_RE.test(params.id)) return NOINDEX;
  const res = await getPublicPulse(params.id);
  const p = res.kind === "ok" ? res.data.pulse : undefined;
  if (!p) return NOINDEX;
  return pageMetadata({
    title: pulseHeadline(p),
    description: clip(p.caption, 200) || `A pulse by ${displayName(p.author)} on Orovion.`,
    path: `/pulse/${p.id}`,
    image: p.posterUrl || undefined,
    type: "article",
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  if (!CONTENT_ID_RE.test(params.id)) notFound();
  const res = await getPublicPulse(params.id);
  if (res.kind === "notFound") notFound();
  if (res.kind === "error") throw new Error("Public pulse temporarily unavailable");
  if (!res.data.pulse) notFound();
  return <PublicPulseCard pulse={res.data.pulse} />;
}
