"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { FileText, Stethoscope, Clapperboard, PenLine, Loader2, Sparkles, Search as SearchIcon } from "lucide-react";
import PostCard from "@/components/PostCard";
import RightRail from "@/components/layout/RightRail";
import { Avatar } from "@/components/ui/Primitives";
import { PostFeedSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { readCache, writeCache, shouldWriteFeedCache } from "@/lib/offline-cache";
import { shouldForceFresh } from "@/lib/feedFreshness";
import { getFeedSessionId, setFeedSessionId } from "@/lib/feedSession";
import { useToast } from "@/components/ui/Toast";
import { sendOrQueue } from "@/lib/offline-queue";
import { cn, roleLabel } from "@/lib/utils";
import { usePullToRefresh, useAutoRefresh } from "@/hooks/usePullToRefresh";
import { logFeedError, logFeedEmpty } from "@/lib/diagnostics";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";

/** Post types the composer can launch. Typed so `label` stays a string. */
const COMPOSER_SHORTCUTS: { icon: any; label: string }[] = [
  { icon: PenLine, label: "Post" },
  { icon: Stethoscope, label: "Case" },
  { icon: FileText, label: "Research" },
  { icon: Clapperboard, label: "Pulse" },
];


/**
 * Home feed (docs/feed.md §1) — loads the unified multi-specialty feed.
 */

const PAGE = "limit=12";

export default function Feed() {
  const { user, demo } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const [filter, setFilter] = useState({ kind: "all", key: "all", label: "All" });
  const [posts, setPosts] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // chip switch (keeps layout, dims list)
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumped to re-pull the feed from page 1
  const sentinel = useRef(null);
  const reqSeq = useRef(0);
  // Mirrors `posts` for reads inside async callbacks, where the effect closure
  // would otherwise see a stale value.
  const postsRef = useRef(null);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  const pendingRefresh = useRef(null);
  const refresh = useCallback(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return new Promise((resolve) => {
      pendingRefresh.current?.(); // settle any prior awaiter
      pendingRefresh.current = resolve;
      setRefreshKey((k) => k + 1);
    });
  }, []);

  // Refresh is gesture-only by design: pull the feed down (touch) or overscroll up
  // at the top (trackpad/wheel). There is deliberately no refresh button.
  const { pull, refreshing: pulling } = usePullToRefresh(refresh);
  useAutoRefresh(refresh);

  const buildQuery = useCallback((f, cur, fresh = false) => {
    const parts = [PAGE];
    if (f.kind === "specialty") parts.push(`specialty=${encodeURIComponent(f.key)}`);
    if (f.kind === "type") parts.push(`type=${f.key}`);
    if (cur) parts.push(`cursor=${encodeURIComponent(cur)}`);
    // Echo this tab's session so media keeps ONE served-set per session instead
    // of the shared bucket that used to accumulate every post and empty the feed.
    // Absent on the first load of a tab — the server mints one and returns it.
    const sess = getFeedSessionId("home");
    if (sess) parts.push(`sessionId=${encodeURIComponent(sess)}`);
    // Bypass the gateway's SWR cache. Never on cursor pages — those are already
    // served live server-side, so the flag would only add noise.
    if (fresh && !cur) parts.push("refresh=1");
    return `?${parts.join("&")}`;
  }, []);

  /* feed loads — instant background request on every chip change.
     Offline-first: paint the per-user cached first page INSTANTLY (even with no
     network), let the live request win the moment it resolves, and fall back to
     the cache when the request fails (offline). The first page is cached on every
     successful load so a returning visitor never sees an empty feed. */
  const uid = user?._id || user?.id;
  const lastRefreshKey = useRef(-1);
  useEffect(() => {
    const seq = ++reqSeq.current;
    const key = `feed:home:${filter.kind}:${filter.key}`;
    let settled = false; // the network (success OR failure) has produced a result

    // User intent = a fresh mount (page load / reload, posts still null) or a
    // refreshKey bump (refresh button, pull-to-refresh, return-to-tab). Those must
    // BYPASS the gateway cache; a plain chip switch may still ride it.
    const userIntent = posts === null || refreshKey !== lastRefreshKey.current;
    lastRefreshKey.current = refreshKey;

    // The session is deliberately KEPT across refresh. The server excludes
    // everything already served in it, so a refresh returns posts not yet seen.
    // Rotating it here (as this used to) reset that exclusion set, and because
    // the ranking is deterministic every refresh re-served the IDENTICAL posts in
    // the same order — which is exactly "refresh does nothing". When the whole
    // pool has been served, the server resets the set itself and serves a fresh
    // page, so keeping the session cannot strand the feed empty.

    if (posts === null) {
      // Instant paint from cache — only applied while the network is still in
      // flight, so a fast live response is never overwritten by stale cache.
      readCache(uid, key).then((c) => {
        if (!settled && seq === reqSeq.current && c?.data) setPosts(c.data as any);
      });
    } else {
      setRefreshing(true); // chip switch → keep the layout, dim the list
    }

    dok.feed
      .home(buildQuery(filter, null, shouldForceFresh(key, userIntent)))
      .then(async (d) => {
        settled = true;
        if (seq !== reqSeq.current) return; // a newer chip tap superseded this payload
        setFeedSessionId("home", d.sessionId); // server-minted on an establishing load
        const list = d.feed || d.posts || [];
        if (!list.length) {
          logFeedEmpty("feed", "home feed load", {
            filter: `${filter.kind}:${filter.key}`, hasMore: Boolean(d.hasMore), forcedFresh: userIntent,
          });
        }
        // Never let an empty response wipe a good cached page — that turned a
        // transient empty result into a blank feed even on the instant paint.
        //
        // The in-memory ref is NOT sufficient to decide this: on a cold mount it
        // is still null until the IndexedDB read resolves, and a cold
        // indexedDB.open() can lose the race to a warm HTTP round trip. Checking
        // only the ref would then see "nothing to lose" and overwrite a page that
        // is very much still on disk. Only the empty path pays the extra read.
        if (list.length) {
          writeCache(uid, key, list);
        } else {
          const onDisk = await readCache(uid, key).catch(() => null);
          if (shouldWriteFeedCache(list, (onDisk?.data as any[]) ?? postsRef.current)) {
            writeCache(uid, key, list);
          }
        }
        if (seq !== reqSeq.current) return; // the await above yielded — re-check
        setPosts(list);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      })
      .catch(async (err) => {
        settled = true;
        if (seq !== reqSeq.current) return;
        // Offline / error: keep what's on screen, else fall back to the cache
        // (covers the case where the network failed before the cache read landed).
        // The fallback is silent to the user, so the reason has to reach the console
        // or an empty feed is indistinguishable from a broken one.
        logFeedError("feed", `home feed load (${filter.kind}:${filter.key})`, err);
        const c = await readCache<any[]>(uid, key);
        if (!c?.data?.length) logFeedEmpty("feed", "offline cache fallback", { cached: c?.data?.length ?? 0 });
        // Say so when we fall back. Silently keeping the old list made a backend
        // outage look exactly like "refresh does nothing".
        if ((postsRef.current as unknown[] | null)?.length || c?.data?.length) {
          toast?.show("Couldn't refresh — showing saved posts", { type: "info" });
        }
        setPosts((p) => p ?? c?.data ?? []);
        setHasMore(false);
      })
      .finally(() => {
        if (seq === reqSeq.current) setRefreshing(false);
        if (pendingRefresh.current) { pendingRefresh.current(); pendingRefresh.current = null; }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, demo, refreshKey]);

  const loadingMoreRef = useRef(false);

  /* cursor-paginated infinite scroll */
  useEffect(() => {
    if (!hasMore || !sentinel.current || demo) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const seq = reqSeq.current;
      try {
        const d = await dok.feed.home(buildQuery(filter, cursor));
        if (seq !== reqSeq.current) return;
        setFeedSessionId("home", d.sessionId);
        setPosts((p) => [...(p || []), ...(d.feed || d.posts || [])]);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      } catch (err) {
        logFeedError("feed", "home feed next page", err);
        setHasMore(false);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }, { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, cursor, filter, demo, buildQuery]);

  const removePost = (id) => setPosts((p) => (p || []).filter((x) => (x._id || x.id) !== id));

  return (
    <div className="flex gap-6">
      <PullToRefreshIndicator pull={pull} refreshing={pulling} />
      <div className="mx-auto w-full max-w-xl space-y-5 pb-24">
        {/* mobile search entry — the top-bar search is desktop-only */}
        <button onClick={() => nav("/app/search")} className="press flex w-full items-center gap-2 rounded-full border border-ink-900/10 bg-surface px-4 py-3 text-sm text-ink-400 transition hover:border-brand-300 sm:hidden">
          <SearchIcon size={18} /> Search people, papers, #tags…
        </button>
        {/* Health-professional stats strip (app parity, mobile only) */}
        {user?.role === "doctor" && <DoctorStatsStrip />}

        {/* Composer — one block, not two stacked cards. The prompt reads as a line
            the user is about to type into, and the type shortcuts sit beneath it as
            icons rather than a second full-width card competing for attention. */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar user={user} size={42} />
            <button onClick={() => nav("/app/create")} className="flex-1 truncate text-left text-[17px] text-ink-400 transition hover:text-ink-500">
              Share a case, paper or update…
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1 pl-[54px]">
            {COMPOSER_SHORTCUTS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => nav("/app/create")}
                title={label}
                aria-label={`Create ${label}`}
                className="press grid h-9 w-9 place-items-center rounded-full text-brand-600 transition hover:bg-brand-50"
              >
                <Icon size={18} />
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => nav("/app/create")} className="btn-primary px-5 py-2 text-sm">Post</button>
          </div>
        </div>

        {/* Posts */}
        {posts === null ? (
          <PostFeedSkeleton />
        ) : posts.length === 0 ? (
          <Empty filter={filter} onReset={() => setFilter({ kind: "all", key: "all", label: "All" })} />
        ) : (
          <div className={cn("transition-opacity duration-200", refreshing && "pointer-events-none opacity-50")}>
            {/* One surface, hairline-divided rows. `divide-y` owns the separators so
                the last row never carries a trailing border. */}
            <div className="card overflow-hidden divide-y divide-ink-900/[.06]">
              {posts.map((p, i) => (
                <Fragment key={p._id || p.id}>
                  <PostCard post={p} demo={demo} onRemoved={removePost} flush />
                  {i === 1 && <PeopleYouMayKnow />}
                </Fragment>
              ))}
            </div>
            {/* Sentinel sits outside the panel so it never renders as an empty row. */}
            {hasMore && (
              <div ref={sentinel} className="grid place-items-center py-6">
                {loadingMore && <Loader2 size={22} className="animate-spin text-brand-600" />}
              </div>
            )}
          </div>
        )}
      </div>
      <RightRail />
    </div>
  );
}

/* ---------------- doctor stats strip (app parity, mobile only) ----------------
   "Unread" is live (notifications). Priority / Paid Priority have no backend yet,
   so they show a neutral placeholder — never a fake number (see CLAUDE.md). */

function DoctorStatsStrip() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(null);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    dok.notifications
      .unread()
      .then((d) => setUnread(typeof d === "number" ? d : d?.count ?? d?.unread ?? 0))
      .catch(() => setUnread(null));
  }, []);

  const cards = [
    { key: "unread", label: "Unread", value: unread ?? "—", tint: "brand", onClick: () => nav("/app/notifications") },
    { key: "priority", label: "Priority", value: "—", tint: "ink", onClick: () => setSoon(true) },
    { key: "paid", label: "Paid Priority", value: "—", tint: "rose", onClick: () => setSoon(true) },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            className={cn(
              "card press flex flex-col items-start gap-1 p-3 text-left",
              c.tint === "rose" && "bg-rose-50 ring-1 ring-rose-100"
            )}
          >
            <span
              className={cn(
                "font-display text-2xl font-extrabold leading-none",
                c.tint === "rose" ? "text-rose-600" : c.tint === "brand" ? "text-brand-700" : "text-ink-900"
              )}
            >
              {c.value}
            </span>
            <span className="text-xs font-medium text-ink-500">{c.label}</span>
          </button>
        ))}
      </div>
      {soon && (
        <p className="mt-2 px-1 text-xs text-ink-400">Priority &amp; paid queues arrive with consultations.</p>
      )}
    </div>
  );
}

/* ---------------- people you may know (app parity, mobile only) ---------------- */

function PeopleYouMayKnow() {
  const nav = useNavigate();
  const { demo } = useAuth();
  const [people, setPeople] = useState(null);

  useEffect(() => {
    dok.follows
      .suggestions()
      .then((d) => setPeople(d.suggestions || []))
      .catch(() => setPeople([]));
  }, []);

  if (!people || people.length === 0) return null;

  return (
    // Flush, not a card: this renders inside the feed's divided panel, and a card
    // nested in a card is always wrong. The panel's divide-y supplies the separator.
    <div className="bg-surface p-4 lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">People you may know</h3>
        <button onClick={() => nav("/app/network")} className="text-xs font-semibold text-brand-700">See all</button>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1">
        {people.map((u) => (
          <SuggestionCard key={u._id || u.id} user={u} demo={demo} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ user, demo }) {
  const [done, setDone] = useState(false);
  const connect = async () => {
    setDone(true); // optimistic
    if (!demo) {
      // Offline-first: if the request can't go out now (no network), it's durably
      // queued and replayed on reconnect — the optimistic "Requested" stands.
      try {
        await sendOrQueue({
          kind: "connect",
          method: "post",
          url: `/network/request/${user._id || user.id}`,
          dedupeKey: `connect:${user._id || user.id}`,
        });
      } catch {
        // permanent error (e.g. already requested) — keep the optimistic state,
        // matching the prior behaviour (this action was already fire-and-forget).
      }
    }
  };
  return (
    <div className="w-36 shrink-0 rounded-2xl border border-ink-900/[.06] p-3 text-center">
      <Avatar user={user} size={56} className="mx-auto" />
      <p className="mt-2 truncate text-sm font-semibold text-ink-900">{user.fullName}</p>
      <p className="truncate text-xs text-ink-500">{user.professionalHeadline || roleLabel(user.role)}</p>
      <button
        onClick={connect}
        disabled={done}
        className={cn("mt-2 w-full rounded-full py-1.5 text-xs font-semibold transition", done ? "btn-outline" : "bg-brand-600 text-white hover:bg-brand-700")}
      >
        {done ? "Requested" : "+ Connect"}
      </button>
    </div>
  );
}

function Empty({ filter, onReset }) {
  return (
    <div className="card grid place-items-center gap-3 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Sparkles size={24} /></span>
      <p className="text-lg font-semibold text-ink-900">
        {filter.kind === "all" ? "Nothing here yet" : `No ${filter.label} posts yet`}
      </p>
      <p className="max-w-xs text-sm text-ink-500">
        {filter.kind === "all"
          ? "Follow clinicians to fill your feed with cases, research and updates."
          : "Be the first to publish here, or check another specialty."}
      </p>
      {filter.kind !== "all" && (
        <button onClick={onReset} className="btn-ghost px-5 py-2 text-sm">Back to All</button>
      )}
    </div>
  );
}
