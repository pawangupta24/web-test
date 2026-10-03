"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Loader2, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { TileGridSkeleton } from "@/components/ui/Skeletons";
import PulseCard from "@/components/PulseCard";
import { dok } from "@/lib/api";
import { usePullToRefresh, useAutoRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { logFeedError, logFeedEmpty } from "@/lib/diagnostics";

const rid = (r) => r?._id || r?.id;
const PAGE = 10;

/**
 * Pulse tab — a vertical, one-reel-at-a-time discovery feed.
 *
 * Layout: a snap-scrolling column where every slide fills the content viewport, so
 * exactly one reel is ever on screen. Snapping is native (`snap-y snap-mandatory`),
 * which gives correct trackpad/touch/keyboard behaviour without a custom gesture
 * lock. Only the slide the user is looking at mounts a player (`active`) — the rest
 * stay posters, so a long feed never spawns a stack of <video>/hls.js instances.
 *
 * Pagination (docs/modules/recommendation.md §2): media-service materialises a
 * ranked session ONCE and every later page is an OFFSET slice of it. A continuation
 * is only honoured when BOTH `sessionId` and a non-zero `cursor` are sent —
 * otherwise the server discards the session and re-serves page 1. So `cursor` is
 * mandatory here, and the real end-of-feed signal is `nextCursor === null`, NOT
 * `exhausted` (which is just `!hasMore` and is already true on page 1 of a small
 * catalogue).
 */
export default function Pulses() {
  const [pulses, setPulses] = useState<any[] | null>(null);
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [over, setOver] = useState<Record<string, any>>({});
  const [atTop, setAtTop] = useState(true);

  const sessionId = useRef<string | null>(null); // discovery session — fresh per tab entry / refresh
  const cursor = useRef<string | null>(null);    // numeric OFFSET into the ranked session
  const seenIds = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const gen = useRef(0); // bumped on every refresh; invalidates in-flight pages
  const scroller = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(0);
  activeRef.current = active;

  const list = pulses || [];
  // the tail (spinner / end-of-feed) is a slide too, so arrows can reach it
  const totalSlides = list.length + (loadingMore || atEnd ? 1 : 0);

  /* ---------------------------------------------------------------- data --- */

  const fetchPage = useCallback(async (fresh) => {
    const g = gen.current;
    const params = new URLSearchParams({ limit: String(PAGE) });
    // Continuation needs the session id AND its offset; sending one without the
    // other silently rebuilds the session from offset 0 (feedSession.service.js).
    if (!fresh && sessionId.current && cursor.current) {
      params.set("sessionId", sessionId.current);
      params.set("cursor", cursor.current);
    }
    const d = await dok.pulses.feed(`?${params.toString()}`);
    // A refresh that landed while this was in flight owns the session now —
    // never let a superseded page overwrite its cursor or end-of-feed state.
    if (g !== gen.current) return [];
    if (!(d.reels || []).length) {
      logFeedEmpty("pulse", fresh ? "fresh session" : "continuation page", {
        sessionId: d.sessionId, nextCursor: d.nextCursor ?? null, exhausted: Boolean(d.exhausted),
      });
    }
    sessionId.current = d.sessionId || sessionId.current;
    cursor.current = d.nextCursor ?? null;
    setAtEnd(!d.nextCursor);
    setExhausted(Boolean(d.exhausted));
    return d.reels || [];
  }, []);

  // Both touch refs only, so they are stable for the effects/callbacks below.
  const take = useCallback((rows: any[]) => rows.filter((r) => {
    const k = rid(r);
    if (!k || seenIds.current.has(k)) return false;
    seenIds.current.add(k);
    return true;
  }), []);

  const resetSession = useCallback(() => {
    gen.current += 1;
    sessionId.current = null;
    cursor.current = null;
    seenIds.current = new Set();
  }, []);

  // fresh session on every entry into the tab
  useEffect(() => {
    let alive = true;
    resetSession();
    fetchPage(true)
      .then((r) => { if (alive) setPulses(take(r)); })
      .catch((err) => { logFeedError("pulse", "initial load", err); if (alive) setPulses([]); });
    return () => { alive = false; };
  }, [fetchPage, take, resetSession]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || atEnd || !cursor.current) return;
    const g = gen.current;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(false);
      if (g !== gen.current) return; // a refresh superseded this page
      const fresh = take(rows);
      // A page that adds nothing new means we are genuinely at the end — stop,
      // rather than letting the tail observer spin on it.
      if (fresh.length) setPulses((rs) => [...(rs || []), ...fresh]);
      else setAtEnd(true);
    } catch (err) { logFeedError("pulse", "next page", err); /* keep what we have */ }
    finally { loadingRef.current = false; setLoadingMore(false); }
  }, [fetchPage, atEnd, take]);

  /** Fresh discovery session — pull-to-refresh, tab return, end-of-feed CTA. */
  const reload = useCallback(async () => {
    resetSession();
    setAtEnd(false);
    setExhausted(false);
    setRefreshing(true);
    try {
      const r = take(await fetchPage(true));
      setPulses(r);
      setOver({});
      setActive(0);
      scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { logFeedError("pulse", "refresh", err); setPulses((x) => x || []); }
    finally { setRefreshing(false); }
  }, [fetchPage, take, resetSession]);

  // Only auto-refresh on tab return when the user is still on the first reel —
  // otherwise returning to the tab would yank them out of a deep scroll position.
  const autoReload = useCallback(() => { if (activeRef.current === 0) reload(); }, [reload]);
  useAutoRefresh(autoReload);

  // Pull-to-refresh competes with the vertical swipe between reels, so it is only
  // armed at the very top of the first slide.
  const { pull, refreshing: pulling } = usePullToRefresh(reload, { disabled: !(atTop && active === 0) });

  /* ------------------------------------------------------------ navigation --- */

  const goTo = useCallback((idx: number) => {
    const root = scroller.current;
    const node = root?.querySelector(`[data-slide="${idx}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The visible slide drives `active` (which reel plays and counts a view).
  useEffect(() => {
    const root = scroller.current;
    if (!root || !list.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number(e.target.getAttribute("data-slide")) || 0);
          }
        }
      },
      { root, threshold: [0.6] }
    );
    root.querySelectorAll("[data-slide]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [list.length]);

  // Arrow keys step one reel, unless a sheet or a text field owns the keyboard.
  useEffect(() => {
    const onKey = (e) => {
      if (document.body.style.overflow === "hidden") return; // a sheet/modal is open
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowDown") { e.preventDefault(); goTo(Math.min(active + 1, totalSlides - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goTo(Math.max(active - 1, 0)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, totalSlides, goTo]);

  // Prefetch the next page well before the tail.
  useEffect(() => {
    if (list.length && active >= list.length - 3) loadMore();
  }, [active, list.length, loadMore]);

  /* ---------------------------------------------------------------- render --- */

  const patch = useCallback((pulseId: string, p: Record<string, any>) => {
    setOver((o) => ({ ...o, [pulseId]: { ...o[pulseId], ...p } }));
  }, []);

  // The id stays in `seenIds` on purpose: a deleted / "not interested" reel must
  // not reappear if a later page still carries it.
  const removePulse = (id: string) => setPulses((rs) => (rs || []).filter((r) => rid(r) !== id));

  const slide = "h-[calc(100dvh-13rem)] min-h-[420px] lg:h-[calc(100dvh-10.5rem)]";

  return (
    <div>
      <PullToRefreshIndicator pull={pull} refreshing={pulling} />

      {/* Refresh is gesture-only: pull down on slide 0. No button in the header. */}
      <header className="mb-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Pulse</h1>
          <p className="truncate text-sm text-ink-500">
            {exhausted && list.length
              ? "You're all caught up — replaying top Pulses."
              : "Short-form medical teaching from verified clinicians."}
          </p>
        </div>
      </header>

      {pulses === null ? (
        <TileGridSkeleton count={1} className={slide} tile="h-full w-full rounded-3xl" />
      ) : list.length === 0 ? (
        <div className={`card grid ${slide} place-items-center gap-2 text-center`}>
          <div className="grid place-items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Play size={24} /></span>
            <p className="text-lg font-semibold text-ink-900">No Pulses yet</p>
            <p className="max-w-xs text-sm text-ink-500">Short clinical videos from people you follow will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scroller}
            onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 4)}
            className={`no-scrollbar ${slide} snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-3xl`}
          >
            {list.map((r, idx) => (
              <section
                key={rid(r)}
                data-slide={idx}
                className={`flex ${slide} w-full snap-start snap-always items-center justify-center`}
              >
                <PulseCard
                  reel={r}
                  active={idx === active}
                  over={over[rid(r)] || {}}
                  onPatch={patch}
                  muted={muted}
                  onToggleMute={() => setMuted((m) => !m)}
                  onRemoved={removePulse}
                  onEnded={() => goTo(Math.min(idx + 1, list.length - 1))}
                  loop={atEnd && idx === list.length - 1}
                  className="h-full w-full max-w-full rounded-2xl sm:aspect-[9/16] sm:w-auto sm:rounded-3xl"
                />
              </section>
            ))}

            {/* tail: end-of-feed / loading the next page */}
            {(loadingMore || atEnd) && (
              <section data-slide={list.length} className={`flex ${slide} w-full snap-start flex-col items-center justify-center gap-3 text-center`}>
                {loadingMore ? (
                  <Loader2 size={24} className="animate-spin text-brand-600" />
                ) : (
                  <>
                    <p className="text-lg font-semibold text-ink-900">That's every Pulse for now</p>
                    <p className="max-w-xs text-sm text-ink-500">Refresh to start a new discovery session.</p>
                    <button onClick={reload} disabled={refreshing} className="btn-primary mt-1 px-4 py-2 text-sm">
                      <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} /> Refresh
                    </button>
                  </>
                )}
              </section>
            )}
          </div>

          {/* desktop up/down nav */}
          <div className="pointer-events-none absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
            <button
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous Pulse"
              className="press pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-ink-950/40 text-white backdrop-blur transition hover:bg-ink-950/60 disabled:opacity-30"
            >
              <ChevronUp size={20} />
            </button>
            <button
              onClick={() => goTo(active + 1)}
              disabled={active >= totalSlides - 1}
              aria-label="Next Pulse"
              className="press pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-ink-950/40 text-white backdrop-blur transition hover:bg-ink-950/60 disabled:opacity-30"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
