"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Eye, Users, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatGridSkeleton } from "@/components/ui/Skeletons";

/**
 * Insights — web equivalent of the Flutter app's features/insights/.
 * Phase 1 only: the Overview tab is wired to the real backend
 * (GET /api/insights/overview); Content/Audience/Consultations show an
 * honest "coming soon" state — see docs/modules/insights.md in api-service
 * for the phased plan. No fake numbers anywhere in this screen.
 *
 * Tabs render from ROLE_TABS — there is no `if (role === ...)` anywhere else
 * in this file, mirroring RoleInsightConfiguration on mobile.
 */
const TAB_LABEL: Record<string, string> = {
  overview: "Overview",
  content: "Content",
  audience: "Audience",
  consultations: "Consultations",
};

const ROLE_TABS: Record<string, string[]> = {
  doctor: ["overview", "content", "audience", "consultations"],
  student: ["overview", "content", "audience"],
  general_user: ["overview", "content", "audience"],
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "previous_month", label: "Previous month" },
  { value: "this_year", label: "This year" },
];

const CACHE_KEY = "dl_insights_overview_cache";

type Metric = { value: number; previousValue?: number | null; growthPercent?: number | null };

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

function GrowthBadge({ growthPercent }: { growthPercent?: number | null }) {
  if (growthPercent === null || growthPercent === undefined) {
    return <span className="text-xs text-ink-300">—</span>;
  }
  const isFlat = growthPercent === 0;
  const isPositive = growthPercent > 0;
  const Icon = isFlat ? ArrowRight : isPositive ? ArrowUp : ArrowDown;
  const color = isFlat ? "text-ink-400" : isPositive ? "text-emerald-600" : "text-rose-600";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", color)}>
      <Icon size={12} />
      {Math.abs(growthPercent)}%
    </span>
  );
}

function MetricCard({ label, metric, suffix = "" }: { label: string; metric?: Metric; suffix?: string }) {
  const value = metric?.value ?? 0;
  return (
    <div className="card space-y-1.5 p-4">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className="font-display text-xl font-extrabold text-ink-900">
        {fmt(value)}{suffix}
      </p>
      <GrowthBadge growthPercent={metric?.growthPercent} />
    </div>
  );
}

function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
        <BarChart3 size={24} />
      </div>
      <p className="font-display text-base font-bold text-ink-900">{title}</p>
      <p className="max-w-sm text-sm text-ink-400">{message}</p>
    </div>
  );
}

export default function Insights() {
  const { user } = useAuth();
  const role = user?.role || "general_user";
  const tabs = useMemo(() => ROLE_TABS[role] || ROLE_TABS.general_user, [role]);

  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [period, setPeriod] = useState("last_30_days");
  const [overview, setOverview] = useState<any>(null); // null = loading
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab]);

  const load = async (p: string) => {
    setError(null);
    setOverview(null);
    try {
      const d = await dok.insights.overview(p);
      setOverview(d);
      setFromCache(false);
      try {
        localStorage.setItem(`${CACHE_KEY}:${p}`, JSON.stringify(d));
      } catch { /* best-effort */ }
    } catch (e: any) {
      // Offline / API error → fall back to the last snapshot cached for this
      // exact period, same as the Flutter app's InsightsLocalCache.
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}:${p}`);
        if (cached) {
          setOverview(JSON.parse(cached));
          setFromCache(true);
          return;
        }
      } catch { /* fall through to error */ }
      setError(e?.message || "Failed to load insights.");
    }
  };

  useEffect(() => {
    if (activeTab === "overview") load(period);
  }, [activeTab, period]);

  const refresh = async () => {
    setRefreshing(true);
    try { await dok.insights.refresh(); } catch { /* best-effort */ }
    await load(period);
    setRefreshing(false);
  };

  const m = overview?.metrics;
  const noActivityYet =
    activeTab === "overview" && m &&
    !m.profileViews?.value && !m.reach?.value && !m.interactions?.value && !m.postsPublished?.value;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-ink-900">Insights</h1>
        {activeTab === "overview" && (
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-full border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-900 outline-none"
            >
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-full border border-ink-900/10 px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-ink-900/[.06]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              activeTab === t ? "border-brand-600 text-brand-600" : "border-transparent text-ink-400 hover:text-ink-600",
            )}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {activeTab !== "overview" ? (
        <ComingSoon
          title={
            activeTab === "content" ? "Content insights are next"
              : activeTab === "audience" ? "Audience insights are next"
                : "Consultation insights are next"
          }
          message={
            activeTab === "content" ? "Per-post and per-pulse analytics — views, engagement, traffic sources, retention — are Phase 2."
              : activeTab === "audience" ? "Who your audience is — location, age, gender, device — lands in Phase 3."
                : "Requests, response time, acceptance rate, and revenue, reported from your existing consultations data, land in Phase 4."
          }
        />
      ) : error ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <WifiOff size={28} className="text-ink-300" />
          <p className="text-sm text-ink-500">{error}</p>
          <button onClick={() => load(period)} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
        </div>
      ) : overview === null ? (
        <StatGridSkeleton count={8} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" />
      ) : (
        <div className="space-y-4">
          {fromCache && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
              <WifiOff size={14} /> Showing last saved data — you're offline.
            </div>
          )}
          {noActivityYet && (
            <div className="rounded-xl bg-ink-900/[.03] px-4 py-3 text-sm text-ink-500">
              Not enough activity yet for this period — numbers will fill in as people view and interact with your profile.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard label="Profile views" metric={m.profileViews} />
            <MetricCard label="Reach" metric={m.reach} />
            <MetricCard label="Impressions" metric={m.impressions} />
            <MetricCard label="Interactions" metric={m.interactions} />
            <MetricCard label="Engagement rate" metric={m.engagementRate} suffix="%" />
            <MetricCard label="Likes" metric={m.likes} />
            <MetricCard label="Comments" metric={m.comments} />
            <MetricCard label="Shares" metric={m.shares} />
            <MetricCard label="Bookmarks" metric={m.bookmarks} />
            <MetricCard label="New followers" metric={m.newFollowers} />
            <MetricCard label="Lost followers" metric={m.lostFollowers} />
            <MetricCard label="Net followers" metric={m.netFollowers} />
            <MetricCard label="Posts published" metric={m.postsPublished} />
            <MetricCard label="Website clicks" metric={m.websiteClicks} />
            {m.followers != null && (
              <div className="card space-y-1.5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400"><Users size={12} /> Followers</p>
                <p className="font-display text-xl font-extrabold text-ink-900">{fmt(m.followers)}</p>
              </div>
            )}
            {m.following != null && (
              <div className="card space-y-1.5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400"><Eye size={12} /> Following</p>
                <p className="font-display text-xl font-extrabold text-ink-900">{fmt(m.following)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
