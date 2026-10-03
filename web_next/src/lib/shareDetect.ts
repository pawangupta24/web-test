/**
 * Recognise content shared into a chat, so the message renders as a card rather
 * than a bare link or id. Pure, so it is unit-tested (src/lib/__tests__).
 */

export type ShareType = "post" | "pulse" | "profile";
export type DetectedShare = { shareType: ShareType; entityId: string } | null;

// Keys are chat message TYPES on the wire and must not be renamed; the values are
// the card's internal discriminator, which uses the product name.
const SHARED_TYPE: Record<string, ShareType> = {
  shared_post: "post",
  shared_reel: "pulse",
  shared_profile: "profile",
};

// Every content path a share link can carry, on any host or the app scheme:
//   /p/<id>       the canonical post link (posts, cases, research, theses)
//   /pulse/<id>   the current Pulse link
//   /reel/<id>    legacy Pulse link — still in sent messages, the web redirect and
//                 the `orovion://reel/<id>` scheme every app build emits
//   /post|case|research|thesis/<id>   legacy post links
// Each segment must be followed by `/`, so `/pulses/…` or `/posts/…` never match.
const LINK = /(?:https?:\/\/[^\s/]+|orovion:\/\/)\/?(p|post|pulse|reel|profile|case|research|thesis)\/([\w-]+)/i;
const POST_SEGMENTS = new Set(["p", "post", "case", "research", "thesis"]);

export function detectShare(message: { type?: string; messageType?: string; content?: unknown } | null | undefined): DetectedShare {
  const t = message?.type || message?.messageType || "";
  const content = String(message?.content ?? "").trim();
  const link = content.match(LINK);

  if (SHARED_TYPE[t] && content) {
    // A typed share normally carries the bare id, but the app's fallback send puts
    // the public URL in `content`. Take the id out of the URL rather than looking up
    // "https://…" as an id, which 404s and shows "no longer available".
    return { shareType: SHARED_TYPE[t], entityId: link ? link[2] : content };
  }
  if (!link) return null;
  const seg = link[1].toLowerCase();
  if (POST_SEGMENTS.has(seg)) return { shareType: "post", entityId: link[2] };
  return { shareType: seg === "reel" ? "pulse" : (seg as ShareType), entityId: link[2] };
}
