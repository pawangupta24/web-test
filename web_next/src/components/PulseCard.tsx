"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Volume2, VolumeX, Link2, PenLine, Trash2, EyeOff, UserX, AlertTriangle, Loader2,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { BottomSheet, SheetRow, Modal } from "@/components/ui/Overlays";
import FollowButton from "@/components/ui/FollowButton";
import ShareSheet from "@/components/ShareSheet";
import LikesSheet from "@/components/LikesSheet";
import CommentsSheet from "@/components/CommentsSheet";
import EditPostModal, { canEditPost } from "@/components/EditPostModal";
import PulseVideo from "@/components/PulseVideo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { cn, compact, timeAgoLong, pulsePoster } from "@/lib/utils";
import { dok } from "@/lib/api";
import { pulseUrl } from "@/lib/shareLinks";

const rid = (r) => r?._id || r?.id;

type Overrides = { liked?: boolean; likesCount?: number; saved?: boolean; commentsCount?: number };

type PulseCardProps = {
  reel: any;
  active?: boolean;
  over?: Overrides;
  onPatch?: (pulseId: any, patch: Overrides) => void;
  muted?: boolean;
  onToggleMute?: () => void;
  onRemoved?: (id: any) => void;
  onEnded?: () => void;
  onNavigateAway?: () => void;
  loop?: boolean;
  /** an overlay header sits above the card — push controls down */
  chromeInset?: boolean;
  className?: string;
};

/**
 * One Pulse (reel) and its full interaction stack (docs/modules/reels.md):
 * optimistic like + likers list, the network FollowButton state machine, reel
 * comments (@mentions / nested replies), save, share, view/watched pings and the
 * owner / third-party 3-dot menu.
 *
 * Used by both surfaces so they cannot drift apart:
 *   - `PulseViewer` — full-screen overlay opened from a grid (profile reels).
 *   - `Reels` — the Pulse tab's one-reel-at-a-time vertical feed.
 *
 * `active` means "this is the reel the user is looking at". Only an active card
 * mounts a <video> and fires view/watched pings, so a feed of N cards never
 * spawns N players or N phantom views.
 *
 * Engagement overrides are owned by the PARENT (`over` + `onPatch`) so like/save
 * counts survive scrolling away and back within a session.
 */
export default function PulseCard({
  reel: pulse,
  active = true,
  over = {},
  onPatch,
  muted = true,
  onToggleMute,
  onRemoved,
  onEnded,
  onNavigateAway,
  loop = true,
  chromeInset = false,
  className = "",
}: PulseCardProps) {
  const { user: me, demo } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const id = rid(pulse);
  const author = pulse?.author || {};
  const authorId = author.id || author._id;
  const isOwn = Boolean(authorId && (me?._id === authorId || me?.id === authorId));

  const liked = over.liked ?? Boolean(pulse?.isLiked);
  const likesCount = over.likesCount ?? (pulse?.likesCount || 0);
  const saved = over.saved ?? Boolean(pulse?.isSaved);
  const commentsCount = over.commentsCount ?? (pulse?.commentsCount || 0);
  const patch = (p) => onPatch?.(id, p);

  const [fly, setFly] = useState(false);
  const [more, setMore] = useState(false);
  const [share, setShare] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [caption, setCaption] = useState(pulse?.caption);

  // keep the caption in sync when the card is recycled onto another reel
  useEffect(() => { setCaption(pulse?.caption); }, [pulse?.caption]);

  // view + watched pings — only for the reel actually on screen
  useEffect(() => {
    if (!active || demo || !id) return;
    dok.pulses.view(id).catch(() => {});
    const t = setTimeout(() => dok.pulses.watched(id).catch(() => {}), 8000);
    return () => clearTimeout(t);
  }, [id, active, demo]);

  const openAuthor = () => {
    if (!authorId) return;
    onNavigateAway?.();
    nav(`/app/profile/${authorId}`);
  };

  /* ---- like engine: optimistic toggle + rollback ---- */
  const toggleLike = () => {
    const next = !liked;
    patch({ liked: next, likesCount: Math.max(0, likesCount + (next ? 1 : -1)) });
    if (demo) return;
    dok.pulses.like(id)
      .then((d) => { if (typeof d?.likesCount === "number") patch({ likesCount: d.likesCount, liked: d.isLiked ?? next }); })
      .catch(() => { patch({ liked, likesCount }); toast?.error("Couldn't update your reaction"); });
  };

  const dblTap = () => {
    if (!liked) toggleLike();
    setFly(true);
    setTimeout(() => setFly(false), 900);
  };

  /* ---- save engine ---- */
  const toggleSave = () => {
    const next = !saved;
    patch({ saved: next });
    if (demo) return;
    dok.pulses.save(id).catch(() => { patch({ saved }); toast?.error("Couldn't update saved items"); });
  };

  /* ---- 3-dot actions ---- */
  const copyLink = async () => {
    setMore(false);
    try {
      await navigator.clipboard.writeText(pulseUrl(id));
      toast?.success("Link copied — safe to share publicly");
    } catch { toast?.error("Couldn't copy the link"); }
  };

  const notInterested = () => {
    setMore(false);
    if (!demo) dok.pulses.notInterested(id).catch(() => {});
    toast?.success("We'll show you fewer like this");
    onRemoved?.(id);
  };

  const muteAuthor = () => {
    setMore(false);
    if (!demo) dok.feed.mute(authorId).catch(() => {});
    toast?.success(`You won't see suggestions from ${author.fullName} anymore`);
  };

  const deletePulse = async () => {
    setDeleting(true);
    try {
      if (!demo) await dok.pulses.remove(id);
      setConfirmDelete(false);
      toast?.success("Pulse deleted");
      onRemoved?.(id);
    } catch {
      toast?.error("Couldn't delete the Pulse — try again");
    } finally {
      setDeleting(false);
    }
  };

  if (!pulse) return null;
  const editable = canEditPost(pulse);

  return (
    <div className={cn("relative overflow-hidden bg-ink-950", className)}>
      {active ? (
        <PulseVideo
          src={pulse.hlsUrl || pulse.videoUrl}
          poster={pulsePoster(pulse)}
          muted={muted}
          status={pulse.processingStatus}
          loop={loop}
          onEnded={onEnded}
          onDoubleClick={dblTap}
        />
      ) : (
        // Off-screen slides stay as a poster: no <video>, no hls.js, no autoplay.
        // Only when a REAL poster exists — reels uploaded via POST /api/reels have
        // none, and an <img> with no src renders as a broken tile. The container's
        // bg-ink-950 is the placeholder.
        pulsePoster(pulse) ? (
          <img
            src={pulsePoster(pulse)}
            alt=""
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
            className="h-full w-full object-contain opacity-90"
            loading="lazy"
          />
        ) : null
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

      <button
        onClick={() => onToggleMute?.()}
        aria-label={muted ? "Unmute" : "Mute"}
        className={cn(
          "press absolute right-3 grid place-items-center rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20",
          chromeInset ? "top-16" : "top-3"
        )}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* right action rail */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5 text-white">
        <Rail icon={Heart} label={compact(likesCount)} active={liked} fill={liked} onIcon={toggleLike} onLabel={() => setLikesOpen(true)} />
        <Rail icon={MessageCircle} label={compact(commentsCount)} onIcon={() => setCommentsOpen(true)} onLabel={() => setCommentsOpen(true)} />
        <Rail icon={Share2} label={compact(pulse.sharesCount || 0)} onIcon={() => setShare(true)} onLabel={() => setShare(true)} />
        <Rail icon={Bookmark} label="Save" active={saved} fill={saved} onIcon={toggleSave} onLabel={toggleSave} />
        <button onClick={() => setMore(true)} aria-label="More options" className="press grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><MoreHorizontal size={20} /></button>
      </div>

      {/* caption + author */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pr-20 text-white">
        <div className="mb-2 flex items-center gap-2">
          <button onClick={openAuthor} className="press shrink-0">
            <Avatar user={author} size={36} className="ring-2 ring-white/70" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{author.fullName}</span>
              {author.isVerified && <Verified size={13} />}
            </div>
            <p className="truncate text-xs text-white/70">{author.professionalHeadline?.split("·")[0] || author.specialization || "Clinician"}</p>
          </div>
          {!isOwn && <FollowButton user={author} demo={demo} className="ml-1" simple />}
        </div>
        <p className="text-sm leading-snug text-white/90">{caption}</p>
      </div>

      {fly && <div className="pointer-events-none absolute inset-0 grid place-items-center"><Heart size={96} className="anim-heart-fly fill-white text-white drop-shadow-lg" /></div>}

      {/* 3-dot context menu */}
      <BottomSheet open={more} onClose={() => setMore(false)} title={isOwn ? "Your Pulse" : `Pulse by ${author.fullName}`} subtitle={pulse.createdAt ? timeAgoLong(pulse.createdAt) : undefined}>
        {isOwn ? (
          <>
            <SheetRow icon={PenLine} title="Edit caption" desc={editable ? "Update the caption and tags" : "Editing closes 24 hours after posting"} onClick={editable ? () => { setMore(false); setEditOpen(true); } : undefined} disabled={!editable} />
            <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
            <SheetRow icon={Share2} title="Share to message" desc="Send privately" onClick={() => { setMore(false); setShare(true); }} />
            <div className="my-1 h-px bg-ink-900/[.06]" />
            <SheetRow icon={Trash2} title="Delete forever" desc="Removes the Pulse permanently" danger onClick={() => { setMore(false); setConfirmDelete(true); }} />
          </>
        ) : (
          <>
            <SheetRow icon={Bookmark} title={saved ? "Remove from saved" : "Save Pulse"} desc={saved ? "In your private Saved tab" : "Add to your private Saved tab"} onClick={() => { toggleSave(); setMore(false); }} />
            <SheetRow icon={Share2} title="Share to message" desc="Send privately" onClick={() => { setMore(false); setShare(true); }} />
            <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
            <div className="my-1 h-px bg-ink-900/[.06]" />
            <SheetRow icon={EyeOff} title="Not interested" desc="Hide this and show fewer like it" onClick={notInterested} />
            <SheetRow icon={UserX} title="Don't recommend" desc={`Stop suggesting Pulses from ${author.fullName}`} onClick={muteAuthor} />
          </>
        )}
      </BottomSheet>

      {/* destructive confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} className="max-w-sm">
        <div className="grid place-items-center gap-3 p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-500"><AlertTriangle size={26} /></span>
          <h3 className="font-display text-lg font-extrabold text-ink-900">Delete this Pulse forever?</h3>
          <p className="text-sm text-ink-500">It will be permanently removed for everyone, along with its reactions and replies. This can't be undone.</p>
          <div className="mt-2 flex w-full gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1 py-2.5 text-sm">Keep Pulse</button>
            <button onClick={deletePulse} disabled={deleting} className="btn flex-1 bg-danger-500 py-2.5 text-sm text-white hover:bg-danger-700">
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete forever
            </button>
          </div>
        </div>
      </Modal>

      {/* overlays — reel-aware */}
      <ShareSheet open={share} onClose={() => setShare(false)} post={{ ...pulse, content: caption }} demo={demo} kind="reel" />
      <LikesSheet open={likesOpen} onClose={() => setLikesOpen(false)} postId={id} count={likesCount} demo={demo} kind="reel" />
      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} post={{ ...pulse, commentsCount }} demo={demo} kind="reel" onCountChange={(d) => patch({ commentsCount: Math.max(0, commentsCount + d) })} />
      <EditPostModal open={editOpen} onClose={() => setEditOpen(false)} post={pulse} demo={demo} kind="reel" onSaved={(text) => setCaption(text)} />
    </div>
  );
}

function Rail({ icon: Icon, label, active, fill, onIcon, onLabel }: {
  icon: any; label: any; active?: boolean; fill?: boolean; onIcon: () => void; onLabel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onIcon} className="press grid h-11 w-11 place-items-center rounded-full backdrop-blur transition" style={{ background: active ? "var(--rail-active, rgba(255,255,255,.18))" : "rgba(255,255,255,.1)" }}>
        <Icon size={20} className={cn("text-white transition", fill && "fill-white")} />
      </button>
      <button onClick={onLabel} className="press text-xs font-semibold text-white">{label}</button>
    </div>
  );
}
