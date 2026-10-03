"use client";
import { useState } from "react";
import { Check, CheckCheck, Reply, Forward, Trash2, Copy, SmilePlus, FileText, Download, Info } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import ShareCard from "@/components/ShareCard";
import { detectShare } from "@/lib/shareDetect";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const IMG_EXT = /\.(jpe?g|png|gif|webp|heic|avif)$/i;
const VID_EXT = /\.(mp4|mov|webm|mkv|avi)$/i;

const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
const fileNameOf = (m) =>
  m.mediaName || m.fileName || m.meta?.doc?.fileName || (isUrl(m.content) ? decodeURIComponent(String(m.content).split("/").pop()?.split("?")[0] || "file") : "file");
const humanSize = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

// The media/file URL of a message (uploads store it in content, or mediaUrl).
const mediaUrlOf = (m) => m.mediaUrl || (isUrl(m.content) ? m.content : null);
const kindOf = (m) => {
  const t = m.type || m.messageType;
  if (t === "image" || t === "video" || t === "audio") return t;
  if (t === "file" || t === "document") return "file";
  const url = mediaUrlOf(m);
  if (url && IMG_EXT.test(url)) return "image";
  if (url && VID_EXT.test(url)) return "video";
  if (url) return "file";
  return "text";
};

/**
 * One chat message: text / image / video / document (with download), a reply
 * quote, reactions, status ticks, and a hover actions menu (reply / react /
 * copy / forward / delete). Mirrors the Flutter chat bubble feature-set.
 */
export default function ChatMessage({ m, mine, bubble, peerName, onReply, onReact, onForward, onDelete, onInfo }) {
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);

  const share = m.isDeleted ? null : detectShare(m);
  const kind = m.isDeleted ? "text" : kindOf(m);
  const url = mediaUrlOf(m);
  const reply = m.replyTo || m.meta?.replyTo;
  const reactions = Array.isArray(m.reactions) ? m.reactions : [];

  const statusTick = mine && !m.isDeleted && (
    m.status === "seen" ? <CheckCheck size={13} className={cn(kind === "text" ? "text-sky-200" : "text-sky-500")} />
      : m.status === "delivered" ? <CheckCheck size={13} /> : <Check size={13} />
  );

  const Actions = () => (
    <div className={cn("absolute top-1 z-10 flex items-center gap-0.5 rounded-full border border-ink-900/10 bg-surface px-1 py-0.5 shadow-card", mine ? "right-full mr-1" : "left-full ml-1")}>
      <button title="React" onClick={() => setPicker((v) => !v)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5"><SmilePlus size={15} /></button>
      <button title="Reply" onClick={() => onReply?.(m)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5"><Reply size={15} /></button>
      <button title="Forward" onClick={() => onForward?.(m)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5"><Forward size={15} /></button>
      {kind === "text" && !share && (
        <button title="Copy" onClick={() => { navigator.clipboard?.writeText(m.content || ""); }} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5"><Copy size={15} /></button>
      )}
      {mine && (
        <button title="Info" onClick={() => onInfo?.(m)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5"><Info size={15} /></button>
      )}
      {mine && (
        <button title="Delete" onClick={() => onDelete?.(m)} className="rounded-full p-1.5 text-rose-600 hover:bg-rose-500/10"><Trash2 size={15} /></button>
      )}
    </div>
  );

  const ReactionPicker = () => (
    <div className={cn("absolute -top-9 z-20 flex items-center gap-0.5 rounded-full border border-ink-900/10 bg-surface px-1.5 py-1 shadow-card", mine ? "right-0" : "left-0")}>
      {QUICK_REACTIONS.map((e) => (
        <button key={e} onClick={() => { onReact?.(m, e); setPicker(false); }} className="rounded-full px-1 text-lg leading-none transition hover:scale-125">{e}</button>
      ))}
    </div>
  );

  // ── Body by kind ────────────────────────────────────────────────────────────
  let body;
  if (m.isDeleted) {
    body = <p className="italic opacity-70">This message was deleted.</p>;
  } else if (share) {
    body = <ShareCard shareType={share.shareType} entityId={share.entityId} mine={mine} />;
  } else if (kind === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    body = <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="max-h-72 w-full rounded-xl object-cover" /></a>;
  } else if (kind === "video" && url) {
    body = (
      <video src={url} controls className="max-h-72 w-full rounded-xl bg-black">
        <track kind="captions" />
      </video>
    );
  } else if (kind === "audio" && url) {
    body = <audio src={url} controls className="w-56 max-w-full" />;
  } else if (kind === "file" && url) {
    body = (
      <a href={url} download target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-ink-900/5 p-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600"><FileText size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink-900">{fileNameOf(m)}</span>
          <span className="block text-[11px] text-ink-400">{[fileNameOf(m).split(".").pop()?.toUpperCase(), humanSize(m.fileSize || m.meta?.doc?.size)].filter(Boolean).join(" · ")}</span>
        </span>
        <Download size={16} className={cn("shrink-0", mine ? "text-white/80" : "text-ink-400")} />
      </a>
    );
  } else {
    body = <p className="whitespace-pre-wrap break-words">{m.content}</p>;
  }

  // Share/media render outside the tinted bubble (like the Flutter cards).
  const bare = share || kind === "image" || kind === "video" || kind === "audio";

  return (
    <div className={cn("group flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
          <Actions />
          {picker && <ReactionPicker />}
        </div>
        <div className={cn(
          "relative max-w-[78vw] text-sm md:max-w-md",
          bare ? "" : cn("px-3.5 py-2.5 shadow-soft", mine ? cn(bubble?.mine, "bubble-mine text-white") : cn(bubble?.theirs, "bg-surface text-ink-900")),
        )}>
          {reply && (
            <div className={cn("mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs", mine ? "border-white/60 bg-white/10" : "border-brand-500 bg-ink-900/[.04]")}>
              <span className="block font-semibold opacity-90">{reply.senderName || (String(reply.senderId) === String(m.senderId) ? peerName : "You")}</span>
              <span className="block truncate opacity-75">{reply.preview || reply.content || "Message"}</span>
            </div>
          )}
          {body}
          {!bare && (
            <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-white/70" : "text-ink-400")}>
              {timeAgo(m.createdAt)} {statusTick}
            </p>
          )}
        </div>
        {reactions.length > 0 && (
          <div className={cn("relative -mt-1 flex flex-wrap gap-0.5", mine ? "justify-end" : "justify-start")}>
            {Object.entries(reactions.reduce((a: Record<string, number>, r) => ((a[r.emoji] = (a[r.emoji] || 0) + 1), a), {})).map(([e, n]) => (
              <span key={e} className="rounded-full border border-ink-900/10 bg-surface px-1.5 py-0.5 text-[11px] shadow-soft">{e}{Number(n) > 1 ? ` ${n}` : ""}</span>
            ))}
          </div>
        )}
      </div>
      {bare && (
        <p className="flex items-center gap-1 px-1 text-[10px] text-ink-400">{timeAgo(m.createdAt)} {statusTick}</p>
      )}
    </div>
  );
}
