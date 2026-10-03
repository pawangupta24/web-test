"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import PulseCard from "@/components/PulseCard";

const rid = (r) => r?._id || r?.id;

/**
 * Full-screen Pulse (reel) overlay opened from a grid (profile reels).
 *
 * This component owns only the shell — portal, backdrop, close/up/down chrome and
 * the current index. Everything about a single reel (player, rail, caption,
 * sheets, pings) lives in `PulseCard`, shared with the Pulse tab's vertical feed.
 *
 * Per-reel engagement lives in a keyed override map held HERE so state survives
 * up/down navigation within the session.
 */
export default function PulseViewer({ reels: pulses, index, onClose, onRemoved, onReachEnd }) {
  const [i, setI] = useState(index);
  const [muted, setMuted] = useState(true);
  const [over, setOver] = useState({});

  const pulse = pulses[i];
  const id = rid(pulse);

  const patch = useCallback((pulseId, p) => {
    setOver((o) => ({ ...o, [pulseId]: { ...o[pulseId], ...p } }));
  }, []);

  const go = useCallback((d) => {
    setI((v) => Math.max(0, Math.min(pulses.length - 1, v + d)));
  }, [pulses.length]);

  const isLast = i >= pulses.length - 1;

  // Scroll (wheel) + swipe navigation between reels, throttled so one gesture = one reel.
  const navLock = useRef(false);
  const touchY = useRef(null);
  const onWheel = (e) => {
    if (navLock.current || Math.abs(e.deltaY) < 24) return;
    navLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { navLock.current = false; }, 420);
  };
  const onTouchStart = (e) => { touchY.current = e.touches?.[0]?.clientY ?? null; };
  const onTouchEnd = (e) => {
    if (touchY.current == null) return;
    const dy = (e.changedTouches?.[0]?.clientY ?? touchY.current) - touchY.current;
    if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1); // swipe up → next, down → previous
    touchY.current = null;
  };

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowUp") go(-1);
      else if (e.key === "ArrowDown") go(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // prefetch the next page of the discovery feed as the viewer nears the end
  useEffect(() => {
    if (i >= pulses.length - 2) onReachEnd?.();
  }, [i, pulses.length, onReachEnd]);

  // A removed reel (deleted / not-interested) drops out of the list; step onto a
  // neighbour, or close when it was the only one.
  const handleRemoved = (removedId) => {
    onRemoved?.(removedId);
    if (pulses.length > 1) go(i === pulses.length - 1 ? -1 : 1);
    else onClose?.();
  };

  if (!pulse) return null;

  return createPortal(
    // z-[60]: above app chrome (z-40) but BELOW the sheets it opens (z-[70]) so the
    // 3-dot menu, share, comments and likes sheets are not covered by the reel card
    <div onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95 animate-fade-in">
      {/* header */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 text-white">
        <button onClick={onClose} className="press rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20"><X size={20} /></button>
        <p className="text-sm font-semibold">Pulse · <span className="text-white/70">For you</span></p>
        <span className="w-9" />
      </div>

      {/* up/down nav */}
      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button onClick={() => go(-1)} disabled={i === 0} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"><ChevronUp size={20} /></button>
        <button onClick={() => go(1)} disabled={isLast} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"><ChevronDown size={20} /></button>
      </div>

      {/* phone frame */}
      <PulseCard
        key={id}
        reel={pulse}
        active
        over={over[id] || {}}
        onPatch={patch}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onRemoved={handleRemoved}
        onEnded={() => go(1)}
        onNavigateAway={onClose}
        loop={isLast}
        chromeInset
        className="h-[88vh] w-[min(94vw,420px)] rounded-3xl shadow-2xl anim-pop"
      />
    </div>,
    document.body
  );
}
