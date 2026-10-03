/**
 * Shapes returned by api-service `/api/public/*` (docs/API.md → "Public
 * share-link previews") and the text the public pages derive from them. Pure,
 * so the titles and descriptions that end up in link-preview cards are tested.
 */

export type PublicAuthor = {
  id: string;
  fullName: string | null;
  titlePrefix: string | null;
  uniqueUsername: string | null;
  profilePhoto: string | null;
  isVerified: boolean;
};

export type PublicProfile = PublicAuthor & {
  uniqueUsername: string;
  role: string | null;
  professionalHeadline: string | null;
  specialization: string | null;
  followersCount: number;
  postsCount: number;
};

export type PublicPost = {
  id: string;
  postType: string;
  title: string | null;
  excerpt: string;
  imageUrl: string | null;
  mediaCount: number;
  hasVideo: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PublicAuthor;
};

export type PublicPulse = {
  id: string;
  caption: string;
  posterUrl: string | null;
  durationSec: number | null;
  ready: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  author: PublicAuthor;
};

/** "Dr. Anya Sharma" — without doubling a prefix the name already carries. */
export function displayName(a: Pick<PublicAuthor, "fullName" | "titlePrefix">): string {
  const name = (a.fullName || "").trim() || "Orovion member";
  const prefix = (a.titlePrefix || "").trim();
  if (!prefix || name.toLowerCase().startsWith(prefix.toLowerCase())) return name;
  return `${prefix} ${name}`;
}

export function clip(text: string | null | undefined, max: number): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** 1234 → "1.2K". */
export const compactCount = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

export function profileDescription(p: PublicProfile): string {
  const about = p.professionalHeadline || p.specialization;
  const followers = `${compactCount(p.followersCount)} follower${p.followersCount === 1 ? "" : "s"}`;
  return [about, followers, "View on Orovion."].filter(Boolean).join(" · ");
}

export function postHeadline(p: PublicPost): string {
  return clip(p.title || p.excerpt, 70) || `Post by ${displayName(p.author)}`;
}

export function pulseHeadline(p: PublicPulse): string {
  return clip(p.caption, 70) || `Pulse by ${displayName(p.author)}`;
}
