"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { Send, Check, CheckCheck, Phone, Video, Search, MessageSquare, ArrowLeft, Paperclip, X, MoreVertical, BellOff, Trash2, Eraser, Mic, Square } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { RowsSkeleton, ChatThreadSkeleton } from "@/components/ui/Skeletons";
import { useAppearance } from "@/context/AppearanceContext";
import { BUBBLES, WALLPAPERS } from "@/lib/appearance";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { readCache, writeCache } from "@/lib/offline-cache";
import { getSocket } from "@/lib/socket";
import { cn, timeAgo, newClientId } from "@/lib/utils";
import ChatMessage from "@/components/ChatMessage";
import { readDeletedConversationIds, writeDeletedConversationIds, filterOutDeleted } from "@/lib/chatDeletedConversations";

const cidOf = (c) => c?.conversationId || c?.id || c?._id;
const midOf = (m) => m?._id || m?.id;
// chat-service returns a page NEWEST-first (it sorts by `_id` descending, and
// the cursor pages backwards in time). The thread renders top-to-bottom, and
// every insert path below — socket append, optimistic send, load-more prepend —
// plus the scroll-to-bottom all assume OLDEST-first, so each fetched page is
// flipped here. Do not drop this: without it the thread renders upside down and
// a just-sent message jumps to the top as soon as the conversation is reopened.
// Cursor pages only — the same endpoint's `?sinceSeq` mode already returns
// ascending, so a delta response must NOT be passed through this.
const toAscending = (page) => (Array.isArray(page) ? [...page].reverse() : []);

const STATUS_RANK = { sent: 0, delivered: 1, seen: 2 };

export default function Messages() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const toast = useToast();
  const myId = user?._id || user?.id;
  const [sp] = useSearchParams();
  // Chat customization (Settings → Appearance): bubble shape + wallpaper.
  const { appearance } = useAppearance();
  const bubble = BUBBLES[appearance.bubble];
  const wallpaper = WALLPAPERS[appearance.wallpaper].className;

  const [convos, setConvos] = useState(null); // null = loading
  const [active, setActive] = useState(null);
  // Below md the list and the thread share the screen (master–detail): tapping
  // a conversation slides to the thread, the header back button returns. On
  // md+ both panes are always visible and this flag has no effect.
  const [mobileThread, setMobileThread] = useState(false);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [forwarding, setForwarding] = useState(null); // message to forward → pick a chat
  const [uploading, setUploading] = useState(false);
  const [convMenu, setConvMenu] = useState(false); // thread 3-dot menu
  const [peerAllowsCalls, setPeerAllowsCalls] = useState(true); // peer lets me call them
  const [hasMore, setHasMore] = useState(false); // older messages available
  const [loadingMore, setLoadingMore] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null); // message-info modal target
  const [recording, setRecording] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const nextCursorRef = useRef<any>(null);
  const threadRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  // Persisted "user deleted this conversation" guard — see chatDeletedConversations.ts.
  // Lazily read once; localStorage isn't available during SSR, only in this
  // client component after mount, so a plain useRef initializer is safe here.
  const deletedConvIdsRef = useRef<Set<string>>(
    typeof window !== "undefined" ? readDeletedConversationIds(window.localStorage) : new Set(),
  );

  // Socket handlers are registered once; refs give them the current values.
  const activeRef = useRef(null);
  activeRef.current = active;
  const myIdRef = useRef(null);
  myIdRef.current = myId;
  const peerTypingTimer = useRef(null);
  const selfTyping = useRef({ last: 0, timer: null });

  // The "other" participant on a 1:1 conversation, regardless of payload shape.
  const peer = (c) =>
    c?.participant ||
    (c?.participants || []).find((p) => (p.id || p._id) !== myId) ||
    (c?.participants || [])[0] ||
    {};

  // The other participant's userId (decorated `participant` or raw subdocs).
  const peerIdOf = (c) => {
    const p = c?.participant || c?.other || c?.otherParticipant;
    return (
      p?.id || p?._id || p?.userId ||
      (c?.participants || [])
        .map((x) => x.userId || x.id || x._id)
        .find((id) => id && String(id) !== String(myIdRef.current))
    );
  };

  const markSeen = (c) => {
    const cid = cidOf(c);
    const pid = peerIdOf(c);
    if (!cid || !pid) return;
    getSocket().emit("mark_seen", { conversationId: String(cid), senderId: String(pid) });
    setConvos((prev) => (prev ? prev.map((x) => (cidOf(x) === cid ? { ...x, unreadCount: 0 } : x)) : prev));
  };

  // load conversation list — offline-first: paint the per-user cached list
  // instantly (even offline), let the live list win, fall back to cache on error.
  useEffect(() => {
    let settled = false;
    const key = "chat:conversations";
    readCache<any[]>(myId, key).then((c) => {
      if (!settled && convos === null && c?.data) {
        setConvos(filterOutDeleted(c.data, deletedConvIdsRef.current, cidOf));
      }
    });
    dok.chat.conversations()
      .then((d) => {
        settled = true;
        const list = d.conversations || d || [];
        setConvos(filterOutDeleted(list, deletedConvIdsRef.current, cidOf));
        writeCache(myId, key, list);
      })
      .catch(async () => {
        settled = true;
        const c = await readCache<any[]>(myId, key);
        setConvos((prev) =>
          prev ?? (c?.data ? filterOutDeleted(c.data, deletedConvIdsRef.current, cidOf) : [])
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pick the deep-linked (?c=) conversation, else the first one
  useEffect(() => {
    if (!convos) return;
    const wanted = sp?.get("c");
    const match = wanted ? convos.find((c) => String(cidOf(c)) === String(wanted)) : null;
    if (match) setMobileThread(true); // deep link opens the thread on small screens too
    setActive((a) => a || match || convos[0] || null);
  }, [convos, sp]);

  // load messages for the active conversation, join its room, mark it seen
  useEffect(() => {
    setReplyTo(null);
    setConvMenu(false);
    setHasMore(false);
    nextCursorRef.current = null;
    if (!active) { setMsgs(active === null ? null : []); return; }
    setPeerTyping(false);
    getSocket().emit("join_conversation", { conversationId: String(cidOf(active)) });
    setMsgs(null);
    let alive = true;
    dok.chat.messages(cidOf(active))
      .then((d) => {
        if (!alive) return;
        setMsgs(toAscending(d.messages || d));
        setHasMore(!!d.hasMore);
        nextCursorRef.current = d.nextCursor || null;
        markSeen(active);
      })
      .catch(() => alive && setMsgs([]));
    // Calling permission gate: can I call this peer right now?
    setPeerAllowsCalls(true);
    dok.chat.getCalling(cidOf(active))
      .then((d) => alive && setPeerAllowsCalls(d?.peerAllowsCalls !== false))
      .catch(() => {});
    return () => { alive = false; };
  }, [active]);

  // Load older messages (cursor pagination) when scrolling to the top.
  const loadMore = async () => {
    if (!active || !hasMore || loadingMore || !nextCursorRef.current) return;
    setLoadingMore(true);
    const el = threadRef.current;
    const prevH = el?.scrollHeight || 0;
    try {
      const d = await dok.chat.messages(cidOf(active), `?cursor=${nextCursorRef.current}&limit=30`);
      const older = toAscending(d.messages || d); // oldest-first, like the initial page
      setMsgs((prev) => [...older, ...(prev || [])]);
      setHasMore(!!d.hasMore);
      nextCursorRef.current = d.nextCursor || null;
      // Preserve scroll position after prepending.
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH; });
    } catch { /* keep what we have */ } finally { setLoadingMore(false); }
  };

  // realtime: subscribe once to the chat-service socket events
  useEffect(() => {
    const s = getSocket();

    // Move the conversation to the top of the list with a fresh preview.
    const bump = (m, { unread }) =>
      setConvos((prev) => {
        if (!prev) return prev;
        const cid = String(m.conversationId);
        const idx = prev.findIndex((c) => String(cidOf(c)) === cid);
        if (idx === -1) {
          // Brand-new conversation (to this tab's state) — refetch to pick it
          // up. This is also how a conversation the user previously deleted
          // legitimately comes back: a genuine new message revives it, same
          // as WhatsApp. Only THIS conversation's id is revived — every other
          // still-deleted conversation stays filtered out of the refetch.
          if (deletedConvIdsRef.current.delete(cid)) {
            writeDeletedConversationIds(window.localStorage, deletedConvIdsRef.current);
          }
          dok.chat.conversations()
            .then((d) => setConvos(filterOutDeleted(d.conversations || d || [], deletedConvIdsRef.current, cidOf)))
            .catch(() => {});
          return prev;
        }
        const c = {
          ...prev[idx],
          lastMessage: { content: m.content, type: m.type, messageType: m.type, senderId: m.senderId, timestamp: m.createdAt, createdAt: m.createdAt },
          unreadCount: unread ? (prev[idx].unreadCount || 0) + 1 : prev[idx].unreadCount || 0,
        };
        return [c, ...prev.filter((_, i) => i !== idx)];
      });

    // Append to the open thread, replacing an optimistic temp / skipping dupes.
    const appendToThread = (m) =>
      setMsgs((prev) => {
        if (!prev) return prev; // thread still loading — the fetch will include it
        if (prev.some((x) => String(midOf(x)) === String(midOf(m)))) return prev;
        const tmpIdx = prev.findIndex(
          (x) => String(midOf(x)).startsWith("tmp-") && x.content === m.content && String(x.senderId) === String(m.senderId),
        );
        if (tmpIdx !== -1) { const next = [...prev]; next[tmpIdx] = m; return next; }
        return [...prev, m];
      });

    const onNewMessage = (m) => {
      const act = activeRef.current;
      const isActive = act && String(cidOf(act)) === String(m.conversationId);
      if (isActive) {
        appendToThread(m);
        setPeerTyping(false);
        // viewing the thread — flip it to seen right away
        s.emit("mark_seen", { conversationId: String(m.conversationId), senderId: String(m.senderId) });
      }
      bump(m, { unread: !isActive });
    };

    // Echo of our own message (from this tab or another device).
    const onMessageSent = (m) => {
      const act = activeRef.current;
      if (act && String(cidOf(act)) === String(m.conversationId)) appendToThread(m);
      bump(m, { unread: false });
    };

    // Unified shape: { conversationId, messageIds, status, seenBy? }.
    // Only upgrade (sent → delivered → seen) so late events can't downgrade.
    const onStatus = ({ conversationId, messageIds, status }) => {
      if (!messageIds?.length) return;
      const act = activeRef.current;
      if (!act || String(cidOf(act)) !== String(conversationId)) return;
      const ids = new Set(messageIds.map(String));
      setMsgs((prev) =>
        prev
          ? prev.map((x) =>
              ids.has(String(midOf(x))) && (STATUS_RANK[status] ?? 0) > (STATUS_RANK[x.status] ?? 0)
                ? { ...x, status }
                : x,
            )
          : prev,
      );
    };

    const onDeleted = ({ messageId, conversationId }) => {
      const act = activeRef.current;
      if (!act || (conversationId && String(cidOf(act)) !== String(conversationId))) return;
      setMsgs((prev) =>
        prev ? prev.map((x) => (String(midOf(x)) === String(messageId) ? { ...x, content: "This message was deleted.", isDeleted: true } : x)) : prev,
      );
    };

    // Realtime reaction update: { messageId, reactions } (or { userId, emoji }).
    const onReaction = (payload) => {
      const mid = payload?.messageId || payload?._id;
      if (!mid) return;
      setMsgs((prev) => (prev ? prev.map((x) => {
        if (String(midOf(x)) !== String(mid)) return x;
        if (Array.isArray(payload.reactions)) return { ...x, reactions: payload.reactions };
        // Fallback: single-user toggle payload.
        const others = (x.reactions || []).filter((r) => String(r.userId) !== String(payload.userId));
        return { ...x, reactions: payload.emoji ? [...others, { userId: payload.userId, emoji: payload.emoji }] : others };
      }) : prev));
    };

    // Peer toggled whether I can call them → live-update the call-button gate.
    const onCallingChanged = (d) => {
      const act = activeRef.current;
      if (!act) return;
      const enablerId = String(d?.enablerId ?? d?.userId ?? "");
      if (enablerId && enablerId === String(peerIdOf(act))) setPeerAllowsCalls(d?.enabled === true);
    };

    const onTypingStart = ({ userId: uid, conversationId }) => {
      const act = activeRef.current;
      if (!act || String(cidOf(act)) !== String(conversationId) || String(uid) === String(myIdRef.current)) return;
      setPeerTyping(true);
      clearTimeout(peerTypingTimer.current);
      peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
    };

    const onTypingStop = ({ conversationId }) => {
      const act = activeRef.current;
      if (act && String(cidOf(act)) === String(conversationId)) setPeerTyping(false);
    };

    // Rooms don't survive a reconnect — rejoin the open conversation.
    const onConnect = () => {
      const act = activeRef.current;
      if (act) s.emit("join_conversation", { conversationId: String(cidOf(act)) });
    };

    s.on("connect", onConnect);
    s.on("new_message", onNewMessage);
    s.on("message_sent", onMessageSent);
    s.on("message_status_update", onStatus);
    s.on("message_deleted", onDeleted);
    s.on("message_reaction", onReaction);
    s.on("calling_changed", onCallingChanged);
    s.on("typing_start", onTypingStart);
    s.on("typing_stop", onTypingStop);
    return () => {
      s.off("connect", onConnect);
      s.off("new_message", onNewMessage);
      s.off("message_sent", onMessageSent);
      s.off("message_status_update", onStatus);
      s.off("message_deleted", onDeleted);
      s.off("message_reaction", onReaction);
      s.off("calling_changed", onCallingChanged);
      s.off("typing_start", onTypingStart);
      s.off("typing_stop", onTypingStop);
      clearTimeout(peerTypingTimer.current);
      clearTimeout(selfTyping.current.timer);
    };
  }, []);

  // Auto-scroll to the newest message — but NOT while prepending older history
  // (load-more), and only when the user is already near the bottom.
  useEffect(() => {
    if (loadingMore) return;
    const el = threadRef.current;
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (nearBottom) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loadingMore]);

  const isMine = (m) => m.mine ?? ((m.senderId || m.sender?.id || m.sender?._id) === myId);

  const onInputChange = (e) => {
    setText(e.target.value);
    if (!active) return;
    const s = getSocket();
    const cid = String(cidOf(active));
    const now = Date.now();
    if (now - selfTyping.current.last > 1200) {
      selfTyping.current.last = now;
      s.emit("typing_start", { conversationId: cid });
    }
    clearTimeout(selfTyping.current.timer);
    selfTyping.current.timer = setTimeout(() => s.emit("typing_stop", { conversationId: cid }), 1500);
  };

  // Build the meta.replyTo payload from the message being replied to.
  const replyMeta = (r) =>
    r ? { replyTo: { messageId: String(midOf(r)), senderId: String(r.senderId || r.sender?._id || ""), senderName: isMine(r) ? "You" : peer(active).fullName, preview: (r.content || "").slice(0, 120), type: r.type || r.messageType || "text" } } : undefined;

  const send = async () => {
    const content = text.trim();
    if (!content || !active || sending) return;
    const reply = replyTo;
    const meta = replyMeta(reply);
    // One key per message. A transport-level replay (the 401-refresh retry, or
    // the backend failover in lib/api.ts) is then deduplicated server-side
    // instead of posting the message twice.
    const clientId = newClientId();
    const temp = { _id: `tmp-${Date.now()}`, senderId: myId, content, status: "sent", createdAt: new Date().toISOString(), meta };
    setMsgs((m) => [...(m || []), temp]);
    setText("");
    setReplyTo(null);
    setSending(true);
    clearTimeout(selfTyping.current.timer);
    getSocket().emit("typing_stop", { conversationId: String(cidOf(active)) });
    try {
      const d = await dok.chat.send(cidOf(active), { content, type: "text", messageType: "text", clientId, ...(meta ? { meta } : {}) });
      const real = d.message || d;
      if (midOf(real)) {
        setMsgs((m) => {
          const list = m || [];
          if (list.some((x) => String(midOf(x)) === String(midOf(real)))) return list.filter((x) => midOf(x) !== temp._id);
          return list.map((x) => (midOf(x) === temp._id ? real : x));
        });
      }
    } catch {
      setMsgs((m) => (m || []).filter((x) => midOf(x) !== temp._id));
      setText(content);
      if (reply) setReplyTo(reply);
      toast?.error("Couldn't send — try again");
    } finally {
      setSending(false);
    }
  };

  // Upload + send a media/document message (image, video, PDF, any file).
  const sendMedia = async (file) => {
    if (!file || !active || uploading) return;
    setUploading(true);
    try {
      const d = await dok.chat.upload(cidOf(active), file, newClientId());
      const real = d.message || d;
      if (midOf(real)) setMsgs((m) => ((m || []).some((x) => String(midOf(x)) === String(midOf(real))) ? m : [...(m || []), real]));
    } catch {
      toast?.error("Upload failed — try again");
    } finally {
      setUploading(false);
    }
  };

  // Voice message: record with MediaRecorder, then upload as an audio file.
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) { toast?.error("Recording not supported"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) {
          const ext = (rec.mimeType || "audio/webm").includes("ogg") ? "ogg" : "webm";
          sendMedia(new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }));
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch { toast?.error("Microphone permission denied"); }
  };

  // Toggle a reaction (optimistic) — mirrors WhatsApp's tap-to-react.
  const reactToMsg = async (m, emoji) => {
    const id = midOf(m);
    const mineReacted = (m.reactions || []).some((r) => String(r.userId) === String(myId) && r.emoji === emoji);
    setMsgs((prev) => (prev || []).map((x) => {
      if (String(midOf(x)) !== String(id)) return x;
      const others = (x.reactions || []).filter((r) => String(r.userId) !== String(myId));
      return { ...x, reactions: mineReacted ? others : [...others, { userId: myId, emoji }] };
    }));
    try { await dok.chat.react(id, mineReacted ? "" : emoji); } catch { /* server echoes via socket */ }
  };

  // Delete a message: offer "for everyone" only for my own recent messages.
  const deleteMsg = async (m) => {
    const id = midOf(m);
    const canEveryone = isMine(m);
    const mode = canEveryone
      ? (window.confirm("Delete for everyone? (Cancel = delete for me)") ? "for_everyone" : "me")
      : "me";
    setMsgs((prev) => (prev || []).map((x) => (String(midOf(x)) === String(id)
      ? (mode === "for_everyone" ? { ...x, isDeleted: true, content: "This message was deleted." } : x)
      : x)).filter((x) => mode === "me" ? String(midOf(x)) !== String(id) : true));
    try { await dok.chat.deleteMessage(id, mode); } catch { toast?.error("Couldn't delete"); }
  };

  // Forward the picked message into another conversation, then open it.
  const doForward = async (targetConv) => {
    const m = forwarding;
    setForwarding(null);
    if (!m || !targetConv) return;
    try {
      const kind = m.type || m.messageType || "text";
      await dok.chat.send(cidOf(targetConv), { content: m.content, type: kind, messageType: kind });
      toast?.success("Forwarded");
      setActive(targetConv);
      setMobileThread(true);
    } catch { toast?.error("Couldn't forward"); }
  };

  // ── Conversation-level actions (thread 3-dot menu) ──────────────────────────
  const muteConv = async () => {
    if (!active) return;
    setConvMenu(false);
    const muted = !active.isMuted;
    setActive((c) => ({ ...c, isMuted: muted }));
    setConvos((prev) => (prev || []).map((c) => (cidOf(c) === cidOf(active) ? { ...c, isMuted: muted } : c)));
    try { await dok.chat.mute(cidOf(active), muted); } catch { /* best-effort */ }
  };
  const clearConv = async () => {
    if (!active) return;
    setConvMenu(false);
    if (!window.confirm("Clear all messages in this chat?")) return;
    setMsgs([]);
    try { await dok.chat.clear(cidOf(active), true); } catch { toast?.error("Couldn't clear"); }
  };
  const deleteConv = async () => {
    if (!active) return;
    setConvMenu(false);
    if (!window.confirm("Delete this conversation?")) return;
    const cid = String(cidOf(active));
    try { await dok.chat.mute(cid, false); } catch { /* reset mute on delete */ }
    try { await dok.chat.clear(cid, true); } catch { /* clear server copy */ }
    // No backend delete endpoint exists — the server still returns this
    // conversation, so remember it locally or it reappears on the next
    // conversations refetch (a page reload, or another chat's new-message
    // event triggering the full-list refetch above).
    deletedConvIdsRef.current.add(cid);
    writeDeletedConversationIds(window.localStorage, deletedConvIdsRef.current);
    setConvos((prev) => (prev || []).filter((c) => String(cidOf(c)) !== cid));
    setActive(null);
    setMobileThread(false);
  };

  const shown = (convos || []).filter((c) => {
    if (!query.trim()) return true;
    return (peer(c).fullName || "").toLowerCase().includes(query.toLowerCase());
  });

  return (
    // Height: 9rem = topbar (4rem) + page padding + breathing room. Below lg
    // the fixed bottom nav (~3.5rem) also eats viewport, or the composer ends
    // up underneath it — hence the smaller mobile height.
    <div className="flex h-[calc(100vh-12.5rem)] overflow-hidden rounded-2xl border border-ink-900/[.06] bg-surface shadow-card lg:h-[calc(100vh-9rem)]">
      {/* List — fixed-width sidebar, always visible on md+; on small screens it
          hides while a thread is open (master–detail). */}
      <div className={cn("min-h-0 w-full shrink-0 flex-col border-r border-ink-900/[.06] md:w-80 md:flex", mobileThread && active ? "hidden" : "flex")}>
        <div className="border-b border-ink-900/[.06] p-4">
          <h2 className="font-display text-lg font-extrabold">Messages</h2>
          {forwarding ? (
            <div className="mt-3 flex items-center justify-between rounded-full bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <span>Select a chat to forward to…</span>
              <button onClick={() => setForwarding(null)} className="rounded-full p-1 hover:bg-brand-100"><X size={15} /></button>
            </div>
          ) : (
            <div className="relative mt-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-full bg-ink-900/[.04] py-2 pl-9 pr-3 text-sm outline-none" /></div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convos === null ? (
            <RowsSkeleton count={5} className="p-1.5" />
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-400">{query ? "No matches" : "No conversations yet. Connect with colleagues to start chatting."}</p>
          ) : shown.map((c) => {
            const p = peer(c);
            const lm = c.lastMessage || {};
            return (
              <button key={cidOf(c)} onClick={() => { if (forwarding) { doForward(c); } else { setActive(c); setMobileThread(true); } }}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-900/[.03]", cidOf(active) === cidOf(c) && "bg-brand-50")}>
                <div className="relative"><Avatar user={p} size={46} />{c.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">{p.fullName} {p.isVerified && <Verified size={11} />} {c.isMuted && <BellOff size={11} className="text-ink-400" />}</p>
                  <p className="truncate text-xs text-ink-500">{lm.content || ""}</p>
                </div>
                <div className="text-right">
                  {(lm.createdAt || lm.timestamp) && <p className="text-[11px] text-ink-400">{timeAgo(lm.createdAt || lm.timestamp)}</p>}
                  {c.unreadCount > 0 && <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread — flexes to fill; full-screen on small screens once a chat opens */}
      <div className={cn("min-h-0 min-w-0 flex-1 flex-col bg-ink-50", mobileThread && active ? "flex" : "hidden md:flex")}>
        {!active ? (
          <div className="grid flex-1 place-items-center text-center text-ink-400">
            <div><MessageSquare size={40} className="mx-auto mb-2 text-ink-300" /><p className="text-sm">Select a conversation to start messaging.</p></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-ink-900/[.06] bg-surface px-3 py-3 md:px-5">
              <button onClick={() => setMobileThread(false)} aria-label="Back to conversations"
                className="-mr-1 shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 md:hidden"><ArrowLeft size={20} /></button>
              <Avatar user={peer(active)} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate font-semibold">{peer(active).fullName} {peer(active).isVerified && <Verified size={12} />}</p>
                <p className="text-xs text-emerald-600">{peerTyping ? "typing…" : active.isOnline ? "Online" : "last seen recently"}</p>
              </div>
              <button disabled={!peerAllowsCalls}
                onClick={() => { const p = peer(active); startCall(p.id || p._id, p.fullName || "User", p.profilePhoto || p.avatar || null, "audio"); }}
                className="shrink-0 rounded-full p-2 text-ink-500 hover:bg-ink-900/5 disabled:cursor-not-allowed disabled:opacity-40"
                title={peerAllowsCalls ? "Audio call" : "This user isn't accepting calls"}><Phone size={18} /></button>
              <button disabled={!peerAllowsCalls}
                onClick={() => { const p = peer(active); startCall(p.id || p._id, p.fullName || "User", p.profilePhoto || p.avatar || null, "video"); }}
                className="shrink-0 rounded-full p-2 text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                title={peerAllowsCalls ? "Video call" : "This user isn't accepting calls"}><Video size={18} /></button>
              <div className="relative shrink-0">
                <button onClick={() => setConvMenu((v) => !v)} className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5" title="More"><MoreVertical size={18} /></button>
                {convMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setConvMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-ink-900/10 bg-surface py-1 shadow-card">
                      <button onClick={muteConv} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-900/5"><BellOff size={15} /> {active.isMuted ? "Unmute" : "Mute"}</button>
                      <button onClick={clearConv} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-900/5"><Eraser size={15} /> Clear chat</button>
                      <button onClick={deleteConv} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/10"><Trash2 size={15} /> Delete chat</button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div ref={threadRef} onScroll={(e) => { if (e.currentTarget.scrollTop < 60) loadMore(); }}
              className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-5", wallpaper)}>
              {msgs === null ? (
                <ChatThreadSkeleton />
              ) : msgs.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-400">No messages yet — say hello 👋</p>
              ) : (
                <>
                  {loadingMore && <p className="py-1 text-center text-xs text-ink-400">Loading…</p>}
                  {msgs.map((m) => (
                    <ChatMessage
                      key={midOf(m)}
                      m={m}
                      mine={isMine(m)}
                      bubble={bubble}
                      peerName={peer(active).fullName}
                      onReply={setReplyTo}
                      onReact={reactToMsg}
                      onForward={setForwarding}
                      onDelete={deleteMsg}
                      onInfo={setInfoMsg}
                    />
                  ))}
                </>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-ink-900/[.06] bg-surface">
              {replyTo && (
                <div className="flex items-center gap-2 border-b border-ink-900/[.06] px-3 py-2">
                  <div className="min-w-0 flex-1 border-l-2 border-brand-500 pl-2">
                    <p className="text-xs font-semibold text-brand-600">{isMine(replyTo) ? "You" : peer(active).fullName}</p>
                    <p className="truncate text-xs text-ink-500">{replyTo.content || "Attachment"}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-900/5"><X size={16} /></button>
                </div>
              )}
              <div className="flex items-center gap-2 p-3">
                {/* Any file(s) — images, video, PDF, DICOM (.dcm), zip, etc. Each
                    picked file becomes its own outgoing message, in order. */}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    for (const f of files) await sendMedia(f);
                  }}
                />
                <button onClick={() => fileRef.current?.click()} disabled={uploading || recording} title="Attach a file" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-900/5 disabled:opacity-50"><Paperclip size={18} /></button>
                <input value={text} onChange={onInputChange} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={recording ? "Recording… tap ⏹ to send" : uploading ? "Uploading…" : "Type a message…"} disabled={recording} className="flex-1 rounded-full bg-ink-900/[.04] px-4 py-3 text-sm outline-none disabled:opacity-60" />
                {text.trim() ? (
                  <button onClick={send} disabled={sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-glow disabled:opacity-50"><Send size={18} /></button>
                ) : (
                  <button onClick={toggleRecording} disabled={uploading} title={recording ? "Stop & send" : "Record voice message"} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-glow disabled:opacity-50", recording ? "animate-pulse bg-rose-600" : "bg-brand-600")}>{recording ? <Square size={16} /> : <Mic size={18} />}</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Message info modal — status + timestamps for a single message. */}
      {infoMsg && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4" onClick={() => setInfoMsg(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-surface p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Message info</h3>
              <button onClick={() => setInfoMsg(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-900/5"><X size={18} /></button>
            </div>
            <p className="rounded-xl bg-ink-900/[.04] px-3 py-2 text-sm text-ink-700">{infoMsg.content || infoMsg.mediaName || "Attachment"}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-400">Status</dt><dd className="font-medium capitalize">{infoMsg.status || "sent"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Sent</dt><dd className="font-medium">{infoMsg.createdAt ? new Date(infoMsg.createdAt).toLocaleString() : "—"}</dd></div>
              {infoMsg.deliveredAt && <div className="flex justify-between"><dt className="text-ink-400">Delivered</dt><dd className="font-medium">{new Date(infoMsg.deliveredAt).toLocaleString()}</dd></div>}
              {infoMsg.seenAt && <div className="flex justify-between"><dt className="text-ink-400">Seen</dt><dd className="font-medium">{new Date(infoMsg.seenAt).toLocaleString()}</dd></div>}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
