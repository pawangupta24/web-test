"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, MessageCircle, Eye } from "lucide-react";
import { Link } from "@/lib/router";
import { Verified } from "@/components/ui/Primitives";
import { dok } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

/**
 * Rich preview card for content shared into a chat (post / pulse / profile),
 * mirroring the Flutter app's ShareContentCard. Replaces the plain-text raw-id
 * bubble with an X/Twitter-style embed: thumbnail, author + verified + time, and
 * the post text with #hashtag / @mention links.
 */

// Which messages are shares, and of what, is decided by `detectShare` in
// src/lib/shareDetect.ts (pure + unit-tested); this file only renders the card.
const hrefFor = (shareType, id) =>
  shareType === "profile" ? `/app/profile/${id}` : shareType === "pulse" ? `/app/pulse?pulse=${id}` : `/app/post/${id}`;

// Render post text with #hashtag / @mention as accent-colored spans.
function LinkifiedText({ text }) {
  const parts = String(text).split(/(#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[#@][A-Za-z0-9_]+$/.test(p) ? (
          <span key={i} className="text-brand-600">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function ShareCard({ shareType, entityId, mine }) {
  const [data, setData] = useState<any>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let res;
        if (shareType === "pulse") res = await dok.pulses.get(entityId);
        else if (shareType === "profile") res = await dok.profile.byId(entityId);
        else res = await dok.posts.get(entityId);
        if (!alive) return;
        // Unwrap nested entity: posts under .post, profiles under .user, reels under .reel.
        const d = res?.post || res?.user || res?.reel || res || {};
        setData(d);
      } catch (e) {
        // Only an explicit 404 means the content is gone; anything else keeps it.
        if (alive && (e?.status === 404 || e?.response?.status === 404)) setGone(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shareType, entityId]);

  if (gone) {
    return (
      <div className="w-[260px] rounded-xl border border-ink-900/10 bg-ink-900/5 px-3 py-3 text-xs italic text-ink-400">
        This content is no longer available.
      </div>
    );
  }

  const d = data || {};
  const author = d.author || d.user || d;
  const authorName = author.fullName || author.name || d.fullName || "";
  const authorAvatar = author.profilePhoto || author.photoURL || author.avatarUrl || d.profilePhoto || null;
  const verified = author.isVerified === true || d.isVerified === true;
  const body = String(d.content ?? d.caption ?? d.subtitle ?? d.headline ?? d.professionalHeadline ?? "").trim();
  const thumb =
    (Array.isArray(d.mediaUrls) && d.mediaUrls[0]) ||
    d.thumbnailUrl ||
    d.thumbnail ||
    d.coverUrl ||
    (Array.isArray(d.media) && (d.media[0]?.url || d.media[0])) ||
    null;
  const createdAt = d.createdAt;
  const likes = d.likesCount ?? d.likes;
  const comments = d.commentsCount ?? d.comments;
  const views = d.viewsCount ?? d.views;

  return (
    <Link
      to={hrefFor(shareType, entityId)}
      className="block w-[268px] overflow-hidden rounded-xl border border-ink-900/10 bg-surface text-left transition hover:shadow-soft"
    >
      {thumb && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-ink-900/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink-900/5">
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="truncate text-[13.5px] font-bold text-ink-900">{authorName || "Unknown"}</span>
            {verified && <Verified size={14} />}
          </div>
          {createdAt && <span className="shrink-0 text-[11px] text-ink-400">{timeAgo(createdAt)}</span>}
        </div>

        {body && (
          <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap text-[12.5px] leading-snug text-ink-700">
            <LinkifiedText text={body} />
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400">
          {likes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Heart size={11} /> {likes}
            </span>
          )}
          {comments > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={11} /> {comments}
            </span>
          )}
          {views > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye size={11} /> {views}
            </span>
          )}
          <ArrowUpRight size={13} className="ml-auto text-brand-600" />
        </div>
      </div>
    </Link>
  );
}
