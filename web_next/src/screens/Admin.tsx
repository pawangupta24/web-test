"use client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { AnalyticsDashboard } from "@/features/analytics";
import {
  ShieldCheck, LayoutDashboard, Users2, FileStack, BadgeCheck, Flag, MessageSquareText,
  Trash2, ScrollText, LogOut, Loader2, KeyRound, UserRound, Search, X, ChevronRight,
  CheckCircle2, XCircle, RotateCcw, Eye, Ban, UserX, RefreshCw, Circle, AlertTriangle,
  Stethoscope, GraduationCap, User, Film, FileText, BookOpen, Dot,
  Banknote, Send, Receipt, ArrowLeft, ExternalLink,
  Wallet, TrendingUp, Download, SlidersHorizontal, Landmark, PiggyBank, CalendarDays, Star,
} from "lucide-react";
import { Avatar, Logo, Spinner } from "@/components/ui/Primitives";
import { RowsSkeleton, StatGridSkeleton } from "@/components/ui/Skeletons";
import NavArrows from "@/components/ui/NavArrows";
import { dok, ADMIN_TOKENS } from "@/lib/api";
import { cn, compact, timeAgo } from "@/lib/utils";

/**
 * Operator-only admin console at /admin — fully separate from the product app.
 * No link points here; operators reach it by URL. Login uses the server's env
 * ADMIN_USERNAME / ADMIN_PASSWORD, verified against the backend, which returns a
 * short-lived admin JWT (held in sessionStorage by ADMIN_TOKENS). The session
 * lasts for the browser tab.
 */

/* =========================================================================
   Root: auth gate
   ========================================================================= */
export default function Admin() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (ADMIN_TOKENS.access) {
        try {
          const { admin } = await dok.admin.me();
          if (alive) setAdmin(admin);
        } catch { ADMIN_TOKENS.clear(); }
      }
      if (alive) setReady(true);
    })();
    const onExpire = () => setAdmin(null);
    window.addEventListener("dl:admin-expired", onExpire);
    return () => { alive = false; window.removeEventListener("dl:admin-expired", onExpire); };
  }, []);

  const signOut = async () => { await dok.admin.logout(); setAdmin(null); };

  if (!ready) return <div className="grid min-h-screen place-items-center bg-ink-50"><Spinner className="h-8 w-8" /></div>;
  if (!admin) return <AdminGate onIn={setAdmin} />;
  return <AdminConsole admin={admin} onSignOut={signOut} />;
}

/* =========================================================================
   Login gate
   ========================================================================= */
function AdminGate({ onIn }: { onIn: (a: any) => void }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.username.trim().length >= 1 && form.password.length >= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      const { admin } = await dok.admin.login(form.username.trim(), form.password);
      onIn(admin);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Access denied. Check your credentials.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 py-10">
      <NavArrows variant="floating" className="" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo withText={false} size={28} light />
          <span className="font-display text-lg font-extrabold text-white">Orovion <span className="text-brand-300">Admin</span></span>
        </div>
        <form onSubmit={submit} className="anim-pop rounded-3xl bg-surface p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow"><ShieldCheck size={22} /></span>
            <div>
              <h1 className="font-display text-lg font-extrabold text-ink-900">Restricted area</h1>
              <p className="text-xs text-ink-500">Sign in with your admin credentials.</p>
            </div>
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-user">User ID</label>
          <div className="relative mb-3">
            <UserRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-user" value={form.username} onChange={set("username")} placeholder="admin username" autoComplete="username" className="input pl-9" />
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-pass">Password</label>
          <div className="relative">
            <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-pass" value={form.password} onChange={set("password")} type="password" placeholder="password" autoComplete="current-password" className="input pl-9" />
          </div>

          {err && <p role="alert" className="anim-pop mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{err}</p>}

          <button type="submit" disabled={!valid || busy} className="btn-primary mt-4 w-full py-3 text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Enter console
          </button>
        </form>
        <button onClick={() => nav("/")} className="mx-auto mt-5 block text-xs text-white/50 transition hover:text-white/80">← Back to orovion.app</button>
      </div>
    </div>
  );
}

/* =========================================================================
   Console shell
   ========================================================================= */
const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users2 },
  { key: "content", label: "Content", icon: FileStack },
  { key: "verifications", label: "Verifications", icon: BadgeCheck },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "settlements", label: "Settlements", icon: Banknote },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "feedback", label: "Feedback", icon: MessageSquareText },
  { key: "ratings", label: "Consultation ratings", icon: Star },
  { key: "deletions", label: "Deletions", icon: Trash2 },
  { key: "audit", label: "Audit log", icon: ScrollText },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
];

function AdminConsole({ admin, onSignOut }: { admin: any; onSignOut: () => void }) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="glass sticky top-0 z-40 border-b border-ink-900/[.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo withText={false} size={28} />
          <span className="font-display font-extrabold text-ink-900">Admin console</span>
          <span className="chip bg-brand-50 text-brand-700"><ShieldCheck size={13} /> {admin?.role === "SUPER_ADMIN" ? "Super admin" : admin?.role}</span>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold leading-tight text-ink-900">{admin?.username}</p>
          </div>
          <button onClick={onSignOut} title="Sign out" className="press ml-2 flex items-center gap-1.5 rounded-full border border-ink-900/[.1] bg-surface px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:border-danger-500/40 hover:text-danger-500">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <nav className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setTab(n.key)}
                className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  tab === n.key ? "bg-brand-600 text-white shadow-glow" : "text-ink-600 hover:bg-surface")}>
                <n.icon size={17} /> {n.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab pills */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setTab(n.key)}
                className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition",
                  tab === n.key ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>
                <n.icon size={14} /> {n.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <Overview />}
          {tab === "users" && <UsersSection />}
          {tab === "content" && <ContentSection />}
          {tab === "verifications" && <VerificationsSection />}
          {tab === "transactions" && <TransactionsSection />}
          {tab === "payments" && <PaymentsSection onNav={setTab} />}
          {tab === "settlements" && <SettlementsSection />}
          {tab === "reports" && <ReportsSection />}
          {tab === "feedback" && <FeedbackSection />}
          {tab === "ratings" && <RatingsSection />}
          {tab === "deletions" && <DeletionsSection />}
          {tab === "audit" && <AuditSection />}
          {/* Isolated analytics module — rendered inside the secret admin console
              (not a /admin/* route, which middleware 404s). */}
          {tab === "analytics" && <AnalyticsDashboard />}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Shared bits
   ========================================================================= */
function Stat({ label, value, tone = "ink" }: { label: string; value: any; tone?: string }) {
  const tones: any = {
    ink: "text-ink-900", brand: "text-brand-600", emerald: "text-emerald-600",
    amber: "text-amber-600", rose: "text-rose-600", sky: "text-sky-600",
  };
  return (
    <div className="card p-4">
      <p className={cn("text-2xl font-extrabold", tones[tone] || tones.ink)}>{compact(value ?? 0)}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-500">{label}</p>
    </div>
  );
}

function SectionHead({ title, subtitle, right }: any) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Empty({ icon: Icon = CheckCircle2, title = "Nothing here", sub = "" }) {
  return (
    <div className="card py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon size={26} /></span>
      <p className="mt-3 font-semibold text-ink-900">{title}</p>
      {sub && <p className="text-sm text-ink-500">{sub}</p>}
    </div>
  );
}

const STATUS_CHIP: any = {
  ACTIVE: "bg-emerald-50 text-emerald-600", DEACTIVATED: "bg-ink-900/[.06] text-ink-600",
  SUSPENDED: "bg-rose-50 text-rose-600", PENDING_DELETION: "bg-amber-50 text-amber-600",
};
const ROLE_ICON: any = { doctor: Stethoscope, student: GraduationCap, general_user: User };

/* =========================================================================
   Overview
   ========================================================================= */
function Overview() {
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try { const d = await dok.admin.overview(refresh); setO(d.overview); } catch { setO(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !o) return <StatGridSkeleton count={6} />;
  if (!o) return <Empty icon={AlertTriangle} title="Couldn't load overview" sub="Try refreshing." />;

  const u = o.users, c = o.content;
  return (
    <div className="space-y-6">
      <SectionHead title="Overview" subtitle={`Live snapshot · presence: ${o.presenceSource}`}
        right={<button onClick={() => load(true)} className="btn-outline px-3 py-2 text-xs"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total users" value={u.total} tone="brand" />
        <Stat label="Online now" value={u.onlineNow} tone="emerald" />
        <Stat label="Offline" value={u.offline} />
        <Stat label="Active (7d)" value={u.active7d} tone="sky" />
        <Stat label="Verified pros" value={u.verified} tone="emerald" />
        <Stat label="New (7d)" value={u.new7d} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="By role">
          <Row label="Doctors" value={u.byRole.doctor} icon={Stethoscope} />
          <Row label="Students" value={u.byRole.student} icon={GraduationCap} />
          <Row label="General users" value={u.byRole.general_user} icon={User} />
        </Panel>
        <Panel title="Account status">
          <Row label="Active" value={u.byStatus.active} tone="emerald" />
          <Row label="Suspended (blocked)" value={u.byStatus.suspended} tone="rose" />
          <Row label="Deactivated" value={u.byStatus.deactivated} />
          <Row label="Pending deletion" value={u.byStatus.pending_deletion} tone="amber" />
        </Panel>
        <Panel title="Deletions">
          <Row label="Scheduled" value={o.deletions.scheduled} tone="amber" />
          <Row label="Permanently deleted (all-time)" value={o.deletions.permanentAllTime} tone="rose" />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Content">
          <Row label="Posts" value={c.posts.post} icon={FileText} />
          <Row label="Research" value={c.posts.research} icon={BookOpen} />
          <Row label="Thesis" value={c.posts.thesis} icon={BookOpen} />
          <Row label="Case studies (posts)" value={c.posts.case_study} icon={BookOpen} />
          <Row label="Pulses" value={c.reels} icon={Film} />
          <Row label="Clinical cases" value={c.clinicalCases} icon={FileStack} />
        </Panel>
        <Panel title="Consultations">
          <Row label="Total" value={o.consultations.total} tone="brand" />
          <Row label="Pending" value={o.consultations.pending} tone="amber" />
          <Row label="Approved" value={o.consultations.approved} tone="emerald" />
          <Row label="Declined / refunded" value={o.consultations.declined + o.consultations.refunded} />
        </Panel>
        <Panel title="Feedback & moderation">
          <Row label="Feedback total" value={o.feedback.total} tone="brand" />
          <Row label="Reports pending" value={o.reports.pending} tone="rose" />
          <Row label="Doctor KYC pending" value={o.verifications.doctor.submitted + o.verifications.doctor.inReview} tone="amber" />
          <Row label="Student KYC pending" value={o.verifications.student.submitted} tone="amber" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</p>
      <div className="divide-y divide-ink-900/[.05]">{children}</div>
    </div>
  );
}
function Row({ label, value, tone = "ink", icon: Icon }: any) {
  const tones: any = { ink: "text-ink-900", brand: "text-brand-600", emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600" };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-sm text-ink-600">{Icon && <Icon size={15} className="text-ink-400" />}{label}</span>
      <span className={cn("text-sm font-extrabold", tones[tone])}>{compact(value ?? 0)}</span>
    </div>
  );
}

/* =========================================================================
   Payments — dedicated financial workspace (collections, revenue, refunds)
   ========================================================================= */
const PAY_CHIP: any = {
  CAPTURED: "bg-emerald-50 text-emerald-600", CREATED: "bg-amber-50 text-amber-600",
  PROCESSING: "bg-amber-50 text-amber-600", FAILED: "bg-rose-50 text-rose-600",
  REFUNDED: "bg-sky-50 text-sky-600", REFUND_PENDING: "bg-amber-50 text-amber-600",
};
const PAY_LABEL: any = {
  CAPTURED: "Success", CREATED: "Pending", PROCESSING: "Pending",
  FAILED: "Failed", REFUNDED: "Refunded", REFUND_PENDING: "Refund pending",
};
const fmtMethod = (m: any) => {
  if (!m) return "—";
  const map: any = { upi: "UPI", card: "Card", netbanking: "Netbanking", wallet: "Wallet", emi: "EMI", paylater: "Pay Later", bank_transfer: "Bank Transfer" };
  return map[String(m).toLowerCase()] || String(m).toUpperCase();
};
const KPI_TONE: any = {
  brand: "bg-brand-50 text-brand-600", emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600",
};
const PRESETS: any[] = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["7d", "Last 7 Days"],
  ["30d", "Last 30 Days"], ["month", "This Month"], ["lastmonth", "Last Month"], ["custom", "Custom Range"],
];
const _sod = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const _eod = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
function presetRange(key: string): { from: string; to: string } {
  const now = new Date(); const iso = (d: Date) => d.toISOString();
  switch (key) {
    case "today": return { from: iso(_sod(now)), to: iso(_eod(now)) };
    case "yesterday": { const y = new Date(now.getTime() - 86400000); return { from: iso(_sod(y)), to: iso(_eod(y)) }; }
    case "7d": return { from: iso(_sod(new Date(now.getTime() - 6 * 86400000))), to: iso(_eod(now)) };
    case "month": return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(_eod(now)) };
    case "lastmonth": return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)) };
    default: return { from: iso(_sod(new Date(now.getTime() - 29 * 86400000))), to: iso(_eod(now)) };
  }
}
const fmtDay = (iso: any) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); } catch { return ""; } };

// Like Row but renders the value verbatim (no compact()) — for currency/% strings.
function PRow({ label, value, tone = "ink" }: any) {
  const tones: any = { ink: "text-ink-900", emerald: "text-emerald-600", rose: "text-rose-600", amber: "text-amber-600", brand: "text-brand-600" };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-ink-600">{label}</span>
      <span className={cn("text-sm font-extrabold", tones[tone] || tones.ink)}>{value}</span>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, subTone, tone = "brand" }: any) {
  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", KPI_TONE[tone])}><Icon size={16} /></span>
        <p className="text-[11px] font-medium leading-tight text-ink-500">{label}</p>
      </div>
      <p className="text-[22px] font-extrabold leading-none text-ink-900">{value}</p>
      {sub && <p className={cn("mt-1.5 text-[11px] font-medium", subTone || "text-ink-400")}>{sub}</p>}
    </div>
  );
}

function RevenueChart({ series }: { series: any[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 700, H = 240, pl = 10, pr = 10, pt = 14, pb = 22;
  const n = series.length;
  const max = Math.max(1, ...series.map((s) => Number(s.grossPaise) || 0));
  const X = (i: number) => (n <= 1 ? W / 2 : pl + (i / (n - 1)) * (W - pl - pr));
  const Y = (v: number) => pt + (1 - (Number(v) || 0) / max) * (H - pt - pb);
  const pts = series.map((s, i) => [X(i), Y(s.grossPaise)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = n ? `${line} L${X(n - 1).toFixed(1)},${H - pb} L${X(0).toFixed(1)},${H - pb} Z` : "";
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(n / 6));
  return (
    <div className="relative w-full" style={{ aspectRatio: "700 / 240" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        {grid.map((g, i) => <line key={i} x1={pl} x2={W - pr} y1={Y(max * g)} y2={Y(max * g)} className="stroke-ink-900/[.06]" strokeWidth={1} />)}
        {area && <path d={area} className="fill-brand-500/10" />}
        {line && <path d={line} className="stroke-brand-500" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 4 : 2.6} className="fill-brand-500" />)}
        {pts.map((_, i) => <rect key={"h" + i} x={X(i) - (W / Math.max(n, 1)) / 2} y={0} width={W / Math.max(n, 1)} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
      </svg>
      <div className="pointer-events-none absolute inset-x-2 bottom-0 flex justify-between text-[10px] text-ink-400">
        {series.filter((_, i) => i % step === 0).map((s, i) => <span key={i}>{fmtDay(s.period)}</span>)}
      </div>
      {hover != null && series[hover] && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-center text-[11px] text-white shadow-lg"
          style={{ left: `${(X(hover) / W) * 100}%`, top: `${(Y(series[hover].grossPaise) / H) * 100}%` }}>
          <div className="font-semibold">{fmtDay(series[hover].period)}</div>
          <div>{rupee(series[hover].grossPaise)}</div>
        </div>
      )}
    </div>
  );
}

function Donut({ segs }: { segs: { pct: number; cls: string }[] }) {
  const R = 42, C = 2 * Math.PI * R; let off = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={60} cy={60} r={R} fill="none" className="stroke-ink-900/[.06]" strokeWidth={13} />
      {segs.map((s, i) => {
        const len = Math.max(0, (s.pct / 100) * C);
        const el = <circle key={i} cx={60} cy={60} r={R} fill="none" className={s.cls} strokeWidth={13} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />;
        off += len; return el;
      })}
    </svg>
  );
}

function PaymentsSection({ onNav }: { onNav: (k: string) => void }) {
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [showDates, setShowDates] = useState(false);
  const [groupBy, setGroupBy] = useState("day");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "", minRs: "", maxRs: "", search: "" });

  const [sum, setSum] = useState<any>(null);
  const [rev, setRev] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const range = useCallback(() => (preset === "custom" && custom.from && custom.to
    ? { from: new Date(custom.from).toISOString(), to: _eod(new Date(custom.to)).toISOString() }
    : presetRange(preset)), [preset, custom]);

  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    const r = range();
    const payParams: any = { ...r, limit: showAll ? 50 : 8 };
    if (filters.status) payParams.status = filters.status;
    if (filters.search) payParams.search = filters.search;
    if (filters.minRs) payParams.minPaise = Math.round(Number(filters.minRs) * 100);
    if (filters.maxRs) payParams.maxPaise = Math.round(Number(filters.maxRs) * 100);
    try {
      const [s, v, p] = await Promise.all([
        dok.admin.paymentsSummary(r),
        dok.admin.paymentsRevenue({ ...r, groupBy }),
        dok.admin.payments(payParams),
      ]);
      setSum(s); setRev(v.series || []); setPays(p.payments || []);
    } catch { setErr(true); }
    setLoading(false);
  }, [range, groupBy, showAll, filters]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailBusy(true); setDetail({ loading: true });
    try { const d = await dok.admin.paymentDetail(id); setDetail(d.payment); }
    catch { setDetail(null); }
    setDetailBusy(false);
  };
  const openInvoice = async (id: string) => {
    try { const r = await dok.admin.paymentInvoice(id); if (r?.url) window.open(r.url, "_blank", "noopener"); } catch { /* ignore */ }
  };

  const exportCsv = () => {
    const head = ["Time", "Payment ID", "Patient", "Doctor", "Amount", "Platform Fee", "Doctor Earning", "Status", "Consultation ID"];
    const rows = [head, ...pays.map((p) => [
      fmtDateTime(p.capturedAt || p.createdAt), p.razorpayPaymentId || p.id, p.patientName || "",
      p.doctorName || "", (p.totalPaise / 100).toFixed(2), (p.platformFeePaise / 100).toFixed(2),
      (p.doctorEarningPaise / 100).toFixed(2), p.status, p.requestId || "",
    ])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `payments_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const k = sum?.kpis, br = sum?.breakdown, an = sum?.analytics, rf = sum?.refunds, st = sum?.settlements, fin = sum?.financial;
  const presetLabel = PRESETS.find((p) => p[0] === preset)?.[1] || "Last 30 Days";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Payments</h1>
          <p className="text-sm text-ink-500">Track platform collections, revenue and transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowDates((v) => !v)} className="btn-outline px-3 py-2 text-xs">
              <CalendarDays size={14} /> {presetLabel}
            </button>
            {showDates && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-ink-900/[.08] bg-surface p-1 shadow-xl">
                {PRESETS.map(([key, label]) => (
                  <button key={key} onClick={() => { setPreset(key); if (key !== "custom") setShowDates(false); }}
                    className={cn("block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition",
                      preset === key ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-900/[.04]")}>
                    {label}
                  </button>
                ))}
                {preset === "custom" && (
                  <div className="space-y-2 border-t border-ink-900/[.06] p-2">
                    <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="input h-8 w-full text-xs" />
                    <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="input h-8 w-full text-xs" />
                    <button onClick={() => setShowDates(false)} className="btn-primary w-full py-1.5 text-xs">Apply</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={exportCsv} className="btn-outline px-3 py-2 text-xs"><Download size={14} /> Export</button>
          <button onClick={() => setShowFilters((v) => !v)} className={cn("px-3 py-2 text-xs", showFilters ? "btn-primary" : "btn-outline")}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs font-bold text-ink-600">Status
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="input mt-1 block h-9 text-xs">
              <option value="">All</option><option value="CAPTURED">Success</option><option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option><option value="CREATED">Pending</option>
            </select>
          </label>
          <label className="text-xs font-bold text-ink-600">Min ₹
            <input value={filters.minRs} onChange={(e) => setFilters((f) => ({ ...f, minRs: e.target.value }))} inputMode="numeric" className="input mt-1 block h-9 w-24 text-xs" /></label>
          <label className="text-xs font-bold text-ink-600">Max ₹
            <input value={filters.maxRs} onChange={(e) => setFilters((f) => ({ ...f, maxRs: e.target.value }))} inputMode="numeric" className="input mt-1 block h-9 w-24 text-xs" /></label>
          <label className="text-xs font-bold text-ink-600">Search
            <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="patient / doctor / payment id" className="input mt-1 block h-9 w-56 text-xs" /></label>
          <button onClick={() => setFilters({ status: "", minRs: "", maxRs: "", search: "" })} className="btn-outline px-3 py-2 text-xs">Reset</button>
        </div>
      )}

      {loading && !sum ? <StatGridSkeleton count={6} />
        : err ? <Empty icon={AlertTriangle} title="Couldn't load payments" sub="Try refreshing." />
          : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard icon={Wallet} tone="brand" label="Total Money Collected" value={rupee(k?.grossPaise)}
                  sub={k?.grossDeltaPct != null ? `${k.grossDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(k.grossDeltaPct)}% vs previous period` : "vs previous period"}
                  subTone={k?.grossDeltaPct >= 0 ? "text-emerald-600" : "text-rose-600"} />
                <KpiCard icon={TrendingUp} tone="sky" label="Today's Collection" value={rupee(k?.todayPaise)} sub="captured today" />
                <KpiCard icon={CalendarDays} tone="sky" label="This Month Collection" value={rupee(k?.monthPaise)} sub="month to date" />
                <KpiCard icon={PiggyBank} tone="emerald" label="Platform Revenue" value={rupee(k?.platformRevenuePaise)} sub={`${k?.platformRevenuePct ?? 0}% of gross collection`} />
                <KpiCard icon={Users2} tone="amber" label="Doctor Liability" value={rupee(k?.doctorLiabilityPaise)} sub="owed to doctors" />
                <KpiCard icon={Landmark} tone="brand" label="Total Settled" value={rupee(k?.totalSettledPaise)} sub="paid to doctors" />
              </div>

              {/* Revenue + breakdown + analytics + refunds */}
              <div className="grid gap-4 xl:grid-cols-5">
                <div className="card p-5 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-lg font-extrabold text-ink-900">Revenue Overview</h3>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input h-8 text-xs">
                      <option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option>
                    </select>
                  </div>
                  {rev.length === 0 ? <div className="grid h-48 place-items-center text-sm text-ink-400">No revenue in this range</div> : <RevenueChart series={rev} />}
                </div>

                <Panel title="Collection Breakdown">
                  <div className="flex items-center gap-4 pt-2">
                    <Donut segs={[
                      { pct: br?.successful.pct || 0, cls: "stroke-emerald-500" },
                      { pct: br?.refunded.pct || 0, cls: "stroke-sky-500" },
                      { pct: br?.failed.pct || 0, cls: "stroke-rose-500" },
                    ]} />
                    <div className="flex-1 space-y-3 text-sm">
                      {[["Successful", "bg-emerald-500", br?.successful], ["Refunded", "bg-sky-500", br?.refunded], ["Failed", "bg-rose-500", br?.failed]].map(([lbl, dot, d]: any) => (
                        <div key={lbl}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-ink-700"><span className={cn("h-2.5 w-2.5 rounded-full", dot)} /> {lbl}</span>
                            <span className="font-bold text-ink-900">{d?.pct ?? 0}%</span>
                          </div>
                          <p className="pl-4 text-xs text-ink-400">{rupee(d?.amountPaise)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Payment Analytics">
                  <PRow label="Total Payments" value={an?.total ?? 0} />
                  <PRow label="Successful" value={an?.successCount ?? 0} tone="emerald" />
                  <PRow label="Failed" value={an?.failedCount ?? 0} tone="rose" />
                  <PRow label="Refunded" value={an?.refundedCount ?? 0} />
                  <PRow label="Success Rate" value={`${an?.successRatePct ?? 0}%`} tone="emerald" />
                </Panel>

                <Panel title="Refund Summary">
                  <PRow label="Total Refunded" value={rupee(rf?.totalPaise)} />
                  <PRow label="Refunds (This Month)" value={rupee(rf?.monthPaise)} />
                  <PRow label="Refunds (Today)" value={rupee(rf?.todayPaise)} />
                  <PRow label="Refund Rate" value={`${rf?.refundRatePct ?? 0}%`} tone="amber" />
                </Panel>
              </div>

              {/* Recent payments + top doctors + settlement summary */}
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="card overflow-hidden p-0 xl:col-span-2">
                  <div className="flex items-center justify-between px-5 py-4">
                    <h3 className="font-display text-lg font-extrabold text-ink-900">Recent Payments</h3>
                    <button onClick={() => setShowAll((v) => !v)} className="text-xs font-bold text-brand-600 hover:text-brand-700">{showAll ? "Show less" : "View All"}</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y border-ink-900/[.06] text-left text-xs text-ink-500">
                          <th className="px-5 py-2.5 font-semibold">Time</th>
                          <th className="px-3 py-2.5 font-semibold">Payment ID</th>
                          <th className="px-3 py-2.5 font-semibold">Patient</th>
                          <th className="px-3 py-2.5 font-semibold">Doctor</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Fee</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Earning</th>
                          <th className="px-3 py-2.5 font-semibold">Status</th>
                          <th className="px-3 py-2.5 font-semibold">Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pays.length === 0 ? (
                          <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-ink-400">No payments in this range</td></tr>
                        ) : pays.map((p) => (
                          <tr key={p.id} onClick={() => openDetail(p.id)} className="cursor-pointer border-b border-ink-900/[.04] transition last:border-0 hover:bg-ink-900/[.02]">
                            <td className="px-5 py-3 text-xs text-ink-500">{fmtDateTime(p.capturedAt || p.createdAt)}</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-ink-500">{p.razorpayPaymentId || p.id.slice(0, 14)}</td>
                            <td className="px-3 py-3 font-medium text-ink-900">{p.patientName || "—"}</td>
                            <td className="px-3 py-3 text-ink-700">{p.doctorName ? `Dr. ${p.doctorName}` : "—"}</td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums text-ink-900">{rupee(p.totalPaise)}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-ink-500">{rupee(p.platformFeePaise)}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-emerald-600">{rupee(p.doctorEarningPaise)}</td>
                            <td className="px-3 py-3"><span className={cn("chip", PAY_CHIP[p.status] || PAY_CHIP.CREATED)}>{PAY_LABEL[p.status] || p.status}</span></td>
                            <td className="px-3 py-3 text-xs text-ink-600">{fmtMethod(p.method)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-display text-base font-extrabold text-ink-900">Top Doctors <span className="text-xs font-medium text-ink-400">(this period)</span></h3>
                    </div>
                    <div className="divide-y divide-ink-900/[.05]">
                      {(sum?.topDoctors || []).length === 0 ? <p className="py-4 text-sm text-ink-400">No earnings yet</p>
                        : sum.topDoctors.map((d: any) => (
                          <div key={d.doctorId} className="flex items-center justify-between py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-900">Dr. {d.fullName}</p>
                              <p className="truncate text-xs text-ink-400">{d.specialization || "—"}</p>
                            </div>
                            <span className="font-bold tabular-nums text-ink-900">{rupee(d.earningsPaise)}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-display text-base font-extrabold text-ink-900">Settlement Summary</h3>
                      <button onClick={() => onNav("settlements")} className="text-xs font-bold text-brand-600 hover:text-brand-700">View All</button>
                    </div>
                    <PRow label="Pending Settlements" value={rupee(st?.pendingPaise)} tone="amber" />
                    <PRow label="Paid Settlements" value={rupee(st?.paidPaise)} tone="emerald" />
                    <PRow label="Failed Settlements" value={rupee(st?.failedPaise)} tone="rose" />
                    <PRow label="This Month Settlements" value={st?.monthCount ?? 0} />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-ink-600">Last Settlement</span>
                      <span className="text-right text-sm">
                        <span className="block font-semibold text-ink-900">{st?.last?.paidAt ? fmtDay(st.last.paidAt) : "—"}</span>
                        {st?.last && <span className="block text-xs text-ink-400">{rupee(st.last.netPaise)}</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial summary */}
              <Panel title="Financial Summary">
                <div className="grid gap-4 pt-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[["Gross Collection", fin?.grossCollectionPaise, "ink"], ["Platform Fee", fin?.platformFeePaise, "brand"],
                    ["Refunds", fin?.refundsPaise, "rose"], ["Net Platform Revenue", fin?.netRevenuePaise, "emerald"],
                    ["Outstanding Liability", fin?.outstandingLiabilityPaise, "amber"]].map(([lbl, val, tone]: any) => (
                    <div key={lbl}>
                      <p className="text-xs text-ink-500">{lbl}</p>
                      <p className={cn("mt-0.5 text-lg font-extrabold",
                        tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : tone === "brand" ? "text-brand-600" : "text-ink-900")}>
                        {rupee(val)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowAll(true)} className="btn-outline px-3 py-2 text-xs"><Wallet size={14} /> View All Payments</button>
                <button onClick={() => onNav("settlements")} className="btn-outline px-3 py-2 text-xs"><Banknote size={14} /> View Settlements</button>
                <button onClick={() => onNav("transactions")} className="btn-outline px-3 py-2 text-xs"><Receipt size={14} /> View Transactions</button>
                <button onClick={exportCsv} className="btn-outline px-3 py-2 text-xs"><Download size={14} /> Export Report</button>
                <button onClick={() => onNav("settlements")} className="btn-primary px-3 py-2 text-xs"><Send size={14} /> Generate Settlement</button>
              </div>
            </>
          )}

      {/* Payment detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/40" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-ink-900">Payment details</h3>
              <button onClick={() => setDetail(null)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/[.05]"><X size={18} /></button>
            </div>
            {detail.loading || detailBusy ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
              : !detail.id ? <Empty icon={AlertTriangle} title="Couldn't load payment" />
                : (
                  <div className="space-y-1">
                    <span className={cn("chip mb-3 inline-block", PAY_CHIP[detail.status] || PAY_CHIP.CREATED)}>{PAY_LABEL[detail.status] || detail.status}</span>
                    {[["Payment ID", detail.id], ["Razorpay Order ID", detail.razorpayOrderId || "—"], ["Razorpay Payment ID", detail.razorpayPaymentId || "—"],
                      ["Patient", detail.patient?.name || "—"], ["Doctor", detail.doctor?.name ? `Dr. ${detail.doctor.name}` : "—"],
                      ["Consultation", detail.consultationReason || "—"], ["Consultation ID", detail.consultationId || "—"],
                      ["Gross Amount", rupee(detail.grossPaise)], ["Platform Fee", rupee(detail.platformFeePaise)], ["Doctor Earnings", rupee(detail.doctorEarningPaise)],
                      ["Payment Method", fmtMethod(detail.method)],
                      ["Payment Status", detail.status], ["Created At", fmtDateTime(detail.createdAt)], ["Paid At", detail.capturedAt ? fmtDateTime(detail.capturedAt) : "—"],
                      ["Refund Status", detail.refundStatus], ["Refund Amount", rupee(detail.refundAmountPaise)]].map(([lbl, val]: any) => (
                      <div key={lbl} className="flex items-start justify-between gap-4 border-b border-ink-900/[.05] py-2 text-sm">
                        <span className="text-ink-500">{lbl}</span>
                        <span className="max-w-[60%] break-words text-right font-medium text-ink-900">{val}</span>
                      </div>
                    ))}
                    {detail.status === "CAPTURED" && (
                      <button onClick={() => openInvoice(detail.id)} className="btn-outline mt-4 w-full py-2.5 text-sm"><FileText size={14} /> View invoice <ExternalLink size={12} /></button>
                    )}
                    <p className="mt-3 text-[11px] text-ink-400">Payout is via the monthly settlement (see Settlements). Card/UPI/OTP details are never stored or shown.</p>
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Transactions — per-user consultation payment history + invoices
   ========================================================================= */
const TXN_CHIP: any = {
  CAPTURED: "bg-emerald-50 text-emerald-600",
  CREATED: "bg-ink-900/[.06] text-ink-500",
  FAILED: "bg-rose-50 text-rose-600",
  REFUND_PENDING: "bg-amber-50 text-amber-600",
  REFUNDED: "bg-sky-50 text-sky-600",
};
const fmtDateTime = (iso: any) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(iso); }
};

// Small avatar: initials on a tinted circle (no external image dependency).
function UserAv({ user }: any) {
  const initials = String(user?.fullName || "?").trim().split(/\s+/)
    .map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
      {initials}
    </span>
  );
}

function TransactionsSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any>(null); // { user, summary, transactions } | { loading:true }
  const [invoiceBusy, setInvoiceBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (search = "") => {
    setLoading(true);
    try { const d = await dok.admin.txnUsers(search ? { search } : {}); setUsers(d.users || []); }
    catch { setUsers([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openUser = async (id: string) => {
    setMsg(""); setDetail({ loading: true });
    try { setDetail(await dok.admin.userTransactions(id)); }
    catch { setDetail(null); setMsg("Couldn't load this user's transactions."); }
  };

  const openInvoice = async (requestId: string) => {
    if (!requestId) return;
    setInvoiceBusy(requestId); setMsg("");
    try {
      const r = await dok.admin.txnInvoice(requestId);
      if (r?.url) window.open(r.url, "_blank", "noopener");
      else setMsg("Invoice not available.");
    } catch (e: any) { setMsg(e?.response?.data?.message || "Invoice not available."); }
    setInvoiceBusy("");
  };

  // ── User detail (full history) ──
  if (detail) {
    const u = detail.user, txns = detail.transactions || [], sum = detail.summary || {};
    return (
      <div className="space-y-6">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition hover:text-ink-900">
          <ArrowLeft size={16} /> All users
        </button>

        {detail.loading ? <StatGridSkeleton count={4} /> : (
          <>
            <div className="card flex items-center gap-4 p-5">
              <UserAv user={u} />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold text-ink-900">{u?.fullName || "—"}</p>
                <p className="text-sm text-ink-500">{u?.email || u?.phoneNumber || u?.id}</p>
              </div>
              <span className="chip ml-auto bg-brand-50 capitalize text-brand-700">{String(u?.role || "").replace("_", " ")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Transactions" value={sum.total ?? 0} tone="brand" />
              <Stat label="Captured" value={sum.captured ?? 0} tone="emerald" />
              <Stat label="Total paid" value={rupee(sum.paidPaise)} tone="sky" />
              <Stat label="Total earned" value={rupee(sum.earnedPaise)} tone="emerald" />
            </div>

            {msg && <p className="rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{msg}</p>}

            {txns.length === 0 ? <Empty icon={Receipt} title="No transactions" /> : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-900/[.06] text-left text-xs text-ink-500">
                        <th className="px-4 py-3 font-semibold">Direction</th>
                        <th className="px-4 py-3 font-semibold">Payer → Doctor</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Date &amp; time</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Txn ID</th>
                        <th className="px-4 py-3 text-right font-semibold">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t: any) => (
                        <tr key={t.id} className="border-b border-ink-900/[.04] align-middle last:border-0">
                          <td className="px-4 py-3">
                            <span className={cn("chip", t.direction === "paid" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                              {t.direction === "paid" ? "Paid" : "Earned"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-600">
                            <span className="font-semibold text-ink-900">{t.payerName || "—"}</span>
                            {" → "}
                            <span className="font-semibold text-ink-900">Dr. {t.doctorName || "—"}</span>
                            {t.reason && <p className="mt-0.5 max-w-[220px] truncate text-ink-400">{t.reason}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">
                            {rupee(t.totalPaise)}
                            <p className="text-[10px] font-normal text-ink-400">
                              fee {rupee(t.consultationFeePaise)} + {rupee((Number(t.platformFeePaise) || 0) + (Number(t.gstPaise) || 0))}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-600">{fmtDateTime(t.capturedAt || t.createdAt)}</td>
                          <td className="px-4 py-3"><span className={cn("chip", TXN_CHIP[t.status] || TXN_CHIP.CREATED)}>{t.status}</span></td>
                          <td className="px-4 py-3 font-mono text-[11px] text-ink-500">{t.razorpayPaymentId || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {t.status === "CAPTURED" ? (
                              <button disabled={invoiceBusy === t.requestId} onClick={() => openInvoice(t.requestId)} className="btn-outline px-2.5 py-1.5 text-xs">
                                {invoiceBusy === t.requestId ? <Loader2 size={13} className="animate-spin" /> : <><FileText size={13} /> Invoice <ExternalLink size={11} /></>}
                              </button>
                            ) : <span className="text-xs text-ink-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── User cards grid ──
  return (
    <div className="space-y-6">
      <SectionHead title="Transactions" subtitle="Every consultation payment, grouped by user — click a card for the full history"
        right={<button onClick={() => load(q)} className="btn-outline px-3 py-2 text-xs"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>} />

      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(q); }}
          placeholder="Search by name or email…" className="input pl-9" />
      </div>

      {loading ? <RowsSkeleton count={6} />
        : users.length === 0 ? <Empty icon={Receipt} title="No transactions yet" sub="Consultation payments will appear here." />
          : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <button key={u.id} onClick={() => openUser(u.id)} className="card press flex items-center gap-3 p-4 text-left transition hover:border-brand-300">
                  <UserAv user={u} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{u.fullName || "—"}</p>
                    <p className="truncate text-xs text-ink-400">{u.email || u.id}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="chip bg-ink-900/[.05] text-ink-600">{u.txnCount} txns</span>
                      {Number(u.paidPaise) > 0 && <span className="chip bg-sky-50 text-sky-600">paid {rupee(u.paidPaise)}</span>}
                      {Number(u.earnedPaise) > 0 && <span className="chip bg-emerald-50 text-emerald-600">earned {rupee(u.earnedPaise)}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-ink-300" />
                </button>
              ))}
            </div>
          )}
    </div>
  );
}

/* =========================================================================
   Settlements — doctor payouts (platform-held earnings, monthly bank transfer)
   ========================================================================= */
const SETTLEMENT_CHIP: any = {
  GENERATED:  "bg-sky-50 text-sky-600",
  PROCESSING: "bg-amber-50 text-amber-600",
  PAID:       "bg-emerald-50 text-emerald-600",
  FAILED:     "bg-rose-50 text-rose-600",
  CANCELLED:  "bg-ink-900/[.06] text-ink-500",
  PENDING:    "bg-ink-900/[.06] text-ink-500",
};
const rupee = (paise: any) => "₹" + Math.round((Number(paise) || 0) / 100).toLocaleString("en-IN");
const firstOfMonth = (offset = 0) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
};
const SETTLE_STATUSES = ["", "GENERATED", "PROCESSING", "PAID", "FAILED", "CANCELLED"];

function SettlementsSection() {
  const [sum, setSum] = useState<any>(null);
  const [liab, setLiab] = useState<any>(null);
  const [rev, setRev] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");        // settlement id currently acting
  const [payFor, setPayFor] = useState("");    // id showing the UTR input
  const [utr, setUtr] = useState("");
  const [gen, setGen] = useState({ periodStart: firstOfMonth(-1), periodEnd: firstOfMonth(0), doctorId: "" });
  const [genBusy, setGenBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, r, ls] = await Promise.all([
        dok.admin.settlementSummary().catch(() => null),
        dok.admin.settlementLiability().catch(() => null),
        dok.admin.settlementRevenue().catch(() => null),
        dok.admin.settlements(status ? { status } : {}).catch(() => ({ items: [] })),
      ]);
      setSum(s?.settlements ?? null);
      setLiab(s?.liability ?? l?.liability ?? null);
      setRev(r?.revenue ?? null);
      setList(ls?.items ?? []);
    } catch { setList([]); }
    setLoading(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<any>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ tone: "emerald", text: ok }); await load(); }
    catch (e: any) { setMsg({ tone: "rose", text: e?.response?.data?.message || "Action failed" }); }
    setBusy(""); setPayFor(""); setUtr("");
  };

  const generate = async () => {
    setGenBusy(true); setMsg(null);
    try {
      const out = await dok.admin.generateSettlements({
        periodStart: gen.periodStart, periodEnd: gen.periodEnd,
        doctorId: gen.doctorId.trim() || undefined,
      });
      setMsg({ tone: "emerald", text: `Generated ${out.generated} settlement(s) — ${out.payable} payable.` });
      await load();
    } catch (e: any) { setMsg({ tone: "rose", text: e?.response?.data?.message || "Generation failed" }); }
    setGenBusy(false);
  };

  return (
    <div className="space-y-6">
      <SectionHead title="Settlements" subtitle="Platform-held doctor earnings, settled monthly by bank transfer"
        right={<button onClick={load} className="btn-outline px-3 py-2 text-xs"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Owed to doctors" value={rupee(liab?.pendingPaise)} tone="amber" />
        <Stat label="Outstanding (unpaid)" value={rupee(sum?.outstandingPaise)} tone="sky" />
        <Stat label="Paid all-time" value={rupee(sum?.paidPaise)} tone="emerald" />
        <Stat label="Platform revenue" value={rupee(rev?.platformFeePaise)} tone="brand" />
      </div>

      {msg && (
        <p className={cn("anim-pop rounded-xl px-3 py-2 text-xs font-semibold",
          msg.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-danger-50 text-danger-700")}>{msg.text}</p>
      )}

      <Panel title="Generate settlements for a period">
        <div className="flex flex-wrap items-end gap-3 pt-2">
          <label className="text-xs font-bold text-ink-600">Period start
            <input type="date" value={gen.periodStart} onChange={(e) => setGen((g) => ({ ...g, periodStart: e.target.value }))} className="input mt-1 block" /></label>
          <label className="text-xs font-bold text-ink-600">Period end
            <input type="date" value={gen.periodEnd} onChange={(e) => setGen((g) => ({ ...g, periodEnd: e.target.value }))} className="input mt-1 block" /></label>
          <label className="text-xs font-bold text-ink-600">Doctor ID (optional)
            <input value={gen.doctorId} onChange={(e) => setGen((g) => ({ ...g, doctorId: e.target.value }))} placeholder="all doctors" className="input mt-1 block" /></label>
          <button onClick={generate} disabled={genBusy || !gen.periodStart || !gen.periodEnd} className="btn-primary px-4 py-2.5 text-xs">
            {genBusy ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Generate
          </button>
        </div>
        <p className="pt-2 text-xs text-ink-500">Idempotent per doctor + period — safe to re-run. Aggregates each doctor’s net earnings for the window.</p>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {SETTLE_STATUSES.map((st) => (
          <button key={st || "all"} onClick={() => setStatus(st)}
            className={cn("chip transition", status === st ? "bg-brand-600 text-white" : "bg-surface text-ink-600 hover:bg-ink-900/[.04]")}>
            {st || "All"}
          </button>
        ))}
      </div>

      {loading && list.length === 0 ? <RowsSkeleton count={6} />
        : list.length === 0 ? <Empty icon={Banknote} title="No settlements" sub="Generate a period above to create payouts." />
          : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/[.06] text-left text-xs text-ink-500">
                      <th className="px-4 py-3 font-semibold">Doctor</th>
                      <th className="px-4 py-3 font-semibold">Period</th>
                      <th className="px-4 py-3 text-right font-semibold">Gross</th>
                      <th className="px-4 py-3 text-right font-semibold">Fee</th>
                      <th className="px-4 py-3 text-right font-semibold">Net</th>
                      <th className="px-4 py-3 text-center font-semibold">Consults</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id} className="border-b border-ink-900/[.04] align-middle last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink-900">{s.doctorName || "—"}</p>
                          <p className="text-xs text-ink-400">{s.doctorEmail || s.doctorId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-600">{s.periodStart} → {s.periodEnd}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{rupee(s.grossPaise)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-500">{rupee(s.platformFeePaise)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">{rupee(s.netPaise)}</td>
                        <td className="px-4 py-3 text-center">{s.consultationCount}</td>
                        <td className="px-4 py-3">
                          <span className={cn("chip", SETTLEMENT_CHIP[s.status] || SETTLEMENT_CHIP.PENDING)}>{s.status}</span>
                          {s.bankReference && <p className="mt-1 text-[10px] text-ink-400">UTR {s.bankReference}</p>}
                          {s.failureReason && <p className="mt-1 text-[10px] text-rose-500">{s.failureReason}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.status === "GENERATED" && (
                              <button disabled={busy === s.id} onClick={() => act(s.id, () => dok.admin.approveSettlement(s.id), "Approved")} className="btn-outline px-2.5 py-1.5 text-xs"><CheckCircle2 size={13} /> Approve</button>
                            )}
                            {["GENERATED", "PROCESSING", "FAILED"].includes(s.status) && payFor !== s.id && (
                              <button disabled={busy === s.id} onClick={() => { setPayFor(s.id); setUtr(""); }} className="btn-primary px-2.5 py-1.5 text-xs"><Send size={13} /> Mark paid</button>
                            )}
                            {payFor === s.id && (
                              <div className="flex items-center gap-1">
                                <input autoFocus value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Bank UTR / ref" className="input h-8 w-32 text-xs" />
                                <button disabled={busy === s.id || !utr.trim()} onClick={() => act(s.id, () => dok.admin.markSettlementPaid(s.id, utr.trim()), "Marked paid")} className="btn-primary px-2.5 py-1.5 text-xs">
                                  {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : "Confirm"}
                                </button>
                                <button onClick={() => setPayFor("")} className="btn-outline px-2 py-1.5 text-xs"><X size={13} /></button>
                              </div>
                            )}
                            {s.status === "FAILED" && (
                              <button disabled={busy === s.id} onClick={() => act(s.id, () => dok.admin.retrySettlement(s.id), "Retrying")} className="btn-outline px-2.5 py-1.5 text-xs"><RotateCcw size={13} /> Retry</button>
                            )}
                            {["GENERATED", "PROCESSING", "FAILED"].includes(s.status) && (
                              <button disabled={busy === s.id} title="Cancel" onClick={() => act(s.id, () => dok.admin.cancelSettlement(s.id), "Cancelled")} className="btn-outline px-2 py-1.5 text-xs text-rose-500"><XCircle size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
    </div>
  );
}

/* =========================================================================
   Users
   ========================================================================= */
const ROLE_FILTERS = ["", "doctor", "student", "general_user"];
const STATUS_FILTERS = ["", "active", "suspended", "deactivated", "pending_deletion"];

function UsersSection() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (q.trim()) params.q = q.trim();
      if (role) params.role = role;
      if (status) params.status = status;
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.users(params);
      setRows((prev) => (reset ? d.users : [...prev, ...d.users]));
      setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [q, role, status, cursor]);

  // reload whenever filters change (debounced on q)
  useEffect(() => { const t = setTimeout(() => load(true), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, role, status]);

  return (
    <div>
      <SectionHead title="Users" subtitle="Search, block, deactivate, or permanently delete accounts." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, username, phone…" className="input pl-9" />
        </div>
        <Select value={role} onChange={setRole} options={ROLE_FILTERS} labels={{ "": "All roles", doctor: "Doctors", student: "Students", general_user: "General" }} />
        <Select value={status} onChange={setStatus} options={STATUS_FILTERS} labels={{ "": "All status", active: "Active", suspended: "Blocked", deactivated: "Deactivated", pending_deletion: "Pending delete" }} />
      </div>

      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? (
          <RowsSkeleton count={4} />
        ) : rows.length === 0 ? (
          <Empty icon={Users2} title="No users found" sub="Try a different search or filter." />
        ) : rows.map((u) => (
          <button key={u.id} onClick={() => setSel(u)} className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-ink-900/[.02]">
            <div className="relative">
              <Avatar user={u} size={42} />
              {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" title="Online" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{u.fullName || "—"} {u.isVerified && <BadgeCheck size={13} className="inline text-brand-500" />}</p>
              <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber || u.uniqueUsername || u.id}</p>
            </div>
            <span className="hidden text-xs capitalize text-ink-500 sm:block">{u.role?.replace("_", " ")}</span>
            <span className={cn("chip text-[10px]", STATUS_CHIP[u.accountStatus] || "bg-ink-900/[.06] text-ink-600")}>{u.accountStatus?.replace("_", " ").toLowerCase()}</span>
            <ChevronRight size={18} className="text-ink-300" />
          </button>
        ))}
      </div>

      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}

      {sel && <UserDrawer userRow={sel} onClose={() => setSel(null)} onChanged={() => { setSel(null); load(true); }} />}
    </div>
  );
}

function Select({ value, onChange, options, labels }: any) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto appearance-none py-2 text-sm">
      {options.map((o: string) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
    </select>
  );
}

function UserDrawer({ userRow, onClose, onChanged }: any) {
  const [detail, setDetail] = useState<any>(null);
  const [mode, setMode] = useState<null | "suspend" | "delete">(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { dok.admin.user(userRow.id).then(setDetail).catch(() => setDetail({ user: userRow, stats: null })); }, [userRow.id]);

  const act = async (fn: () => Promise<any>) => { setBusy(true); try { await fn(); onChanged(); } catch (e: any) { alert(e?.response?.data?.message || "Action failed."); setBusy(false); } };

  const u = detail?.user || userRow;
  const s = detail?.stats;

  return (
    <Drawer onClose={onClose} title="User details">
      <div className="flex items-center gap-3">
        <div className="relative"><Avatar user={u} size={56} />{u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500" />}</div>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink-900">{u.fullName || "—"} {u.isVerified && <BadgeCheck size={14} className="inline text-brand-500" />}</p>
          <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber} · @{u.uniqueUsername || "—"}</p>
          <span className={cn("chip mt-1.5 text-[10px]", STATUS_CHIP[u.accountStatus] || "bg-ink-900/[.06] text-ink-600")}>{u.accountStatus?.replace("_", " ").toLowerCase()}</span>
        </div>
      </div>

      {u.suspendedUntil && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Blocked until {new Date(u.suspendedUntil).toLocaleString()}{u.suspensionReason ? ` · ${u.suspensionReason}` : ""}</div>}
      {u.accountStatus === "SUSPENDED" && !u.suspendedUntil && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Permanently blocked{u.suspensionReason ? ` · ${u.suspensionReason}` : ""}</div>}

      {s && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Posts", s.content?.posts], ["Pulses", s.content?.reels], ["Cases", s.content?.cases],
            ["As patient", s.consultations?.asPatient], ["As doctor", s.consultations?.asDoctor], ["Reports", s.pendingReportsAgainst]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-ink-900/[.03] p-2">
              <p className="text-lg font-extrabold text-ink-900">{compact((v as number) ?? 0)}</p>
              <p className="text-[10px] text-ink-500">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1 text-xs text-ink-500">
        <p>Role: <span className="capitalize text-ink-700">{u.role?.replace("_", " ")}</span></p>
        <p>Joined: {timeAgo(u.createdAt)}</p>
        {u.lastActiveAt && <p>Last active: {timeAgo(u.lastActiveAt)}</p>}
        <p className="break-all">ID: {u.id}</p>
      </div>

      {/* Action forms */}
      {mode === "suspend" && (
        <div className="mt-4 space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
          <p className="text-sm font-bold text-rose-700">Block user</p>
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Duration in hours (blank = permanent)" inputMode="numeric" className="input text-sm" />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (shown to the user)…" className="input resize-none text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
            <button disabled={busy} onClick={() => act(() => dok.admin.suspendUser(u.id, { reason: reason || null, durationHours: hours ? Number(hours) : undefined }))} className="btn flex-1 bg-rose-600 py-2 text-sm text-white hover:bg-rose-700">{busy ? "…" : hours ? "Block temporarily" : "Block permanently"}</button>
          </div>
        </div>
      )}
      {mode === "delete" && (
        <div className="mt-4 space-y-2 rounded-xl border border-rose-300 bg-rose-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-rose-700"><AlertTriangle size={15} /> Permanently delete</p>
          <p className="text-xs text-rose-600">This erases the account and all their content across every service. It cannot be undone. Type <b>DELETE</b> to confirm.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (recorded in the audit log)…" className="input resize-none text-sm" />
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="input text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
            <button disabled={busy || confirmText !== "DELETE"} onClick={() => act(() => dok.admin.deleteUser(u.id, { reason: reason || null }))} className="btn flex-1 bg-rose-700 py-2 text-sm text-white hover:bg-rose-800 disabled:opacity-40">{busy ? "Deleting…" : "Delete forever"}</button>
          </div>
        </div>
      )}

      {!mode && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {u.accountStatus === "SUSPENDED"
            ? <button disabled={busy} onClick={() => act(() => dok.admin.unsuspendUser(u.id))} className="btn-primary col-span-2 py-2.5 text-sm"><RotateCcw size={16} /> Unblock user</button>
            : <button onClick={() => { setReason(""); setHours(""); setMode("suspend"); }} className="btn col-span-2 bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><Ban size={16} /> Block user</button>}
          {u.accountStatus !== "DEACTIVATED" && u.accountStatus !== "SUSPENDED" &&
            <button disabled={busy} onClick={() => act(() => dok.admin.deactivateUser(u.id, {}))} className="btn-outline col-span-2 py-2.5 text-sm"><UserX size={16} /> Deactivate (reversible)</button>}
          <button onClick={() => { setReason(""); setConfirmText(""); setMode("delete"); }} className="btn col-span-2 border border-rose-300 bg-surface py-2.5 text-sm text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Permanently delete</button>
        </div>
      )}
    </Drawer>
  );
}

/* =========================================================================
   Content
   ========================================================================= */
const CONTENT_TABS = [
  { key: "post", label: "Posts", icon: FileText },
  { key: "research", label: "Research", icon: BookOpen },
  { key: "thesis", label: "Thesis", icon: BookOpen },
  { key: "case_study", label: "Case studies", icon: BookOpen },
  { key: "reel", label: "Pulses", icon: Film },
  { key: "clinical_case", label: "Clinical cases", icon: FileStack },
];

function ContentSection() {
  const [type, setType] = useState("post");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { type, limit: 20 };
      if (q.trim()) params.q = q.trim();
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.content(params);
      setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
      setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setItems([]); }
    setLoading(false);
  }, [type, q, cursor]);
  useEffect(() => { const t = setTimeout(() => load(true), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [type, q]);

  const del = async (it: any) => {
    if (!confirm(`Delete this ${type.replace("_", " ")}? It will be removed from the app.`)) return;
    try { await dok.admin.deleteContent(type, it.id, {}); setItems((prev) => prev.filter((x) => x.id !== it.id)); } catch (e: any) { alert(e?.response?.data?.message || "Failed."); }
  };

  return (
    <div>
      <SectionHead title="Content" subtitle="Remove any post, pulse, thesis, case study, or clinical case." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {CONTENT_TABS.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition", type === t.key ? "bg-brand-600 text-white shadow-glow" : "bg-surface text-ink-600 hover:bg-brand-50")}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…" className="input pl-9" />
      </div>

      <div className="card divide-y divide-ink-900/[.05]">
        {loading && items.length === 0 ? <RowsSkeleton count={4} />
          : items.length === 0 ? <Empty icon={FileStack} title="No content" sub="Nothing matches here." />
          : items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3.5">
              <Avatar user={it.author} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{it.title || <span className="italic text-ink-400">(no text)</span>}</p>
                <p className="truncate text-xs text-ink-500">
                  {it.author?.fullName} · {compact(it.likesCount || 0)} likes · {compact(it.commentsCount || 0)} comments · {timeAgo(it.createdAt)}
                  {it.isDeleted && <span className="ml-1 text-rose-500">· deleted</span>}
                </p>
              </div>
              {!it.isDeleted && <button onClick={() => del(it)} className="press rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100" title="Delete"><Trash2 size={16} /></button>}
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Verifications (doctor + student)
   ========================================================================= */
const KYC_TABS = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];
const KYC_CHIP: any = { SUBMITTED: "bg-amber-50 text-amber-600", IN_REVIEW: "bg-sky-50 text-sky-600", APPROVED: "bg-emerald-50 text-emerald-600", REJECTED: "bg-rose-50 text-rose-600" };

function VerificationsSection() {
  const [kind, setKind] = useState<"doctor" | "student">("doctor");
  return (
    <div>
      <SectionHead title="Verifications" subtitle="Review health-professional and student KYC submissions." />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setKind("doctor")} className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", kind === "doctor" ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}><Stethoscope size={15} /> Doctors</button>
        <button onClick={() => setKind("student")} className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", kind === "student" ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}><GraduationCap size={15} /> Students</button>
      </div>
      {kind === "doctor" ? <DoctorVerifications /> : <StudentVerifications />}
    </div>
  );
}

function DoctorVerifications() {
  const [tab, setTab] = useState("SUBMITTED");
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    dok.admin.vStats().then(setStats).catch(() => {});
    try { const d = await dok.admin.vList(tab); setRows(d.verifications || []); } catch { setRows([]); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, fn: () => Promise<any>) => {
    setRows((r) => r.filter((x) => x.userId !== userId)); setSel(null); setRejecting(false); setReason("");
    try { await fn(); load(); } catch { load(); }
  };

  return (
    <>
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Submitted" value={stats.submitted} tone="amber" />
          <Stat label="In review" value={stats.inReview} tone="sky" />
          <Stat label="Approved" value={stats.approved} tone="emerald" />
          <Stat label="Rejected" value={stats.rejected} tone="rose" />
        </div>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {KYC_TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize", tab === t ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>{t.replace("_", " ").toLowerCase()}</button>)}
      </div>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty title="Queue is clear" sub={`No ${tab.replace("_", " ").toLowerCase()} submissions.`} />
          : rows.map((v) => (
            <button key={v.userId} onClick={() => setSel(v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
              <Avatar user={v.user} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{v.user?.fullName}</p>
                <p className="truncate text-xs text-ink-500">{(v.specializations || []).join(", ") || v.professionType || "—"} · {v.countryOfPractice || ""}</p>
              </div>
              <span className={cn("chip text-[10px]", KYC_CHIP[v.kycStatus])}>{v.kycStatus?.replace("_", " ").toLowerCase()}</span>
              <ChevronRight size={18} className="text-ink-300" />
            </button>
          ))}
      </div>

      {sel && (
        <Drawer onClose={() => { setSel(null); setRejecting(false); }} title="Review verification">
          <div className="flex items-center gap-3">
            <Avatar user={sel.user} size={52} />
            <div><p className="font-bold text-ink-900">{sel.user?.fullName}</p><p className="text-xs text-ink-500">{sel.user?.email} · {sel.user?.phoneNumber}</p></div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Detail label="Registration #" value={sel.registrationNumber} />
            <Detail label="Profession" value={sel.professionType} />
            <Detail label="Country" value={sel.countryOfPractice} />
            <Detail label="Specializations" value={(sel.specializations || []).join(", ")} />
            <Detail label="Submitted" value={sel.submittedAt ? timeAgo(sel.submittedAt) : "—"} />
          </div>
          {sel.kycRejectionReason && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Last rejection: {sel.kycRejectionReason}</div>}
          {rejecting && <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection (shown to the doctor)…" className="input mt-3 resize-none text-sm" />}
          <div className="mt-5">
            {!rejecting ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => act(sel.userId, () => dok.admin.vInReview(sel.userId))} className="btn-outline col-span-2 py-2.5 text-sm"><Eye size={16} /> Mark in review</button>
                <button onClick={() => act(sel.userId, () => dok.admin.vApprove(sel.userId))} className="btn-primary py-2.5 text-sm"><CheckCircle2 size={16} /> Approve</button>
                <button onClick={() => setRejecting(true)} className="btn bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><XCircle size={16} /> Reject</button>
                <button onClick={() => act(sel.userId, () => dok.admin.vReset(sel.userId))} className="btn-outline col-span-2 py-2.5 text-sm"><RotateCcw size={16} /> Reset</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                <button disabled={!reason.trim()} onClick={() => act(sel.userId, () => dok.admin.vReject(sel.userId, reason))} className="btn flex-1 bg-rose-600 py-2.5 text-sm text-white hover:bg-rose-700">Confirm rejection</button>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function StudentVerifications() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { const d = await dok.admin.svList(); setRows(d.profiles || []); } catch { setRows([]); } setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, fn: () => Promise<any>) => { setRows((r) => r.filter((x) => x.userId !== userId)); setSel(null); setRejecting(false); setReason(""); try { await fn(); } catch { load(); } };

  return (
    <>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty title="Queue is clear" sub="No student submissions." />
          : rows.map((v) => (
            <button key={v.userId} onClick={() => setSel(v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
              <Avatar user={v.user} size={42} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink-900">{v.user?.fullName}</p><p className="truncate text-xs text-ink-500">{v.user?.email}</p></div>
              <ChevronRight size={18} className="text-ink-300" />
            </button>
          ))}
      </div>
      {sel && (
        <Drawer onClose={() => { setSel(null); setRejecting(false); }} title="Student verification">
          <div className="flex items-center gap-3"><Avatar user={sel.user} size={52} /><div><p className="font-bold text-ink-900">{sel.user?.fullName}</p><p className="text-xs text-ink-500">{sel.user?.email}</p></div></div>
          {rejecting && <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection…" className="input mt-4 resize-none text-sm" />}
          <div className="mt-5">
            {!rejecting ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => act(sel.userId, () => dok.admin.svApprove(sel.userId))} className="btn-primary py-2.5 text-sm"><CheckCircle2 size={16} /> Approve</button>
                <button onClick={() => setRejecting(true)} className="btn bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><XCircle size={16} /> Reject</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                <button disabled={!reason.trim()} onClick={() => act(sel.userId, () => dok.admin.svReject(sel.userId, reason))} className="btn flex-1 bg-rose-600 py-2.5 text-sm text-white hover:bg-rose-700">Confirm</button>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function Detail({ label, value }: any) {
  return <div className="flex items-center justify-between border-b border-ink-900/[.05] pb-1.5"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-900">{value || "—"}</span></div>;
}

/* =========================================================================
   Reports
   ========================================================================= */
function ReportsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const d = await dok.admin.reports("pending"); setRows(d.reports || []); } catch { setRows([]); } setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const dismiss = async (id: string) => { setRows((r) => r.filter((x) => x.id !== id)); try { await dok.admin.dismissReport(id); } catch { load(); } };
  const remove = async (r: any) => { if (!confirm("Delete this reported post?")) return; setRows((x) => x.filter((y) => y.id !== r.id)); try { await dok.admin.deletePost(r.post.id); } catch { load(); } };

  return (
    <div>
      <SectionHead title="Reported content" subtitle="Pending user reports on posts." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty title="No open reports" sub="The queue is clear." />
          : rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="chip bg-rose-50 text-rose-600">{r.category}</span>
                <span className="text-ink-400">reported by @{r.reporter?.uniqueUsername || "—"} · {timeAgo(r.createdAt)}</span>
              </div>
              {r.reason && <p className="mt-1.5 text-xs text-ink-500">"{r.reason}"</p>}
              <div className="mt-2 rounded-xl bg-ink-900/[.03] p-3">
                <p className="text-xs text-ink-400">Post by {r.author?.fullName} · {compact(r.post?.likesCount || 0)} likes</p>
                <p className="mt-0.5 line-clamp-3 text-sm text-ink-800">{r.post?.content || <span className="italic text-ink-400">(media only)</span>}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => dismiss(r.id)} className="btn-outline flex-1 py-2 text-sm">Dismiss</button>
                <button onClick={() => remove(r)} className="btn flex-1 bg-rose-600 py-2 text-sm text-white hover:bg-rose-700"><Trash2 size={15} /> Delete post</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Feedback
   ========================================================================= */
const FB_CATS = ["", "SUGGESTION", "IDEA", "BUG", "FEATURE_REQUEST", "EXPERIENCE"];
function FeedbackSection() {
  const [cat, setCat] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (cat) params.category = cat;
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.feedback(params);
      setRows((p) => (reset ? d.feedback : [...p, ...d.feedback])); setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [cat, cursor]);
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [cat]);

  return (
    <div>
      <SectionHead title="Feedback" subtitle="What users submitted through the app." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FB_CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold", cat === c ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>{c ? c.replace("_", " ").toLowerCase() : "all"}</button>)}
      </div>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty icon={MessageSquareText} title="No feedback" />
          : rows.map((f) => (
            <div key={f.id} className="flex gap-3 p-4">
              <Avatar user={f.user} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="chip bg-brand-50 text-brand-700 text-[10px]">{f.category?.replace("_", " ").toLowerCase()}</span><span className="text-xs text-ink-400">{f.user?.fullName} · {timeAgo(f.createdAt)}</span></div>
                <p className="mt-1 text-sm text-ink-800">{f.message}</p>
                {f.imageUrls?.length > 0 && <div className="mt-2 flex gap-1.5">{f.imageUrls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">image {i + 1}</a>)}</div>}
              </div>
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Consultation ratings (patient star feedback after a completed consult)
   ========================================================================= */
const RATING_STARS = ["", "1", "2", "3", "4", "5"];

function RatingsSection() {
  const [stars, setStars] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ avgRating: number; totalRatings: number } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (stars) params.stars = stars;
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.consultationRatings(params);
      setRows((p) => (reset ? d.ratings : [...p, ...d.ratings]));
      setHasMore(d.hasMore); setCursor(d.nextCursor); setSummary(d.summary);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [stars, cursor]);
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [stars]);

  return (
    <div>
      <SectionHead title="Consultation ratings" subtitle="Star feedback patients left after a completed consultation." />
      {summary && (
        <div className="mb-4 flex items-center gap-2">
          <span className="chip bg-brand-50 text-brand-700"><Star size={13} /> {summary.avgRating.toFixed(1)} avg</span>
          <span className="chip bg-surface text-ink-600">{summary.totalRatings} total</span>
        </div>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {RATING_STARS.map((c) => <button key={c} onClick={() => setStars(c)} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold", stars === c ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>{c ? `${c} ★` : "all"}</button>)}
      </div>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty icon={Star} title="No ratings yet" />
          : rows.map((r) => (
            <div key={r.id} className="flex gap-3 p-4">
              <Avatar user={r.requester} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="chip bg-brand-50 text-brand-700 text-[10px]">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                  <span className="text-xs text-ink-400">{r.requester?.fullName} → Dr. {r.doctor?.fullName} · {timeAgo(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-ink-800">{r.comment}</p>}
              </div>
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Deletions queue
   ========================================================================= */
function DeletionsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { dok.admin.deletions({ limit: 50 }).then((d) => setRows(d.users || [])).catch(() => setRows([])).finally(() => setLoading(false)); }, []);
  return (
    <div>
      <SectionHead title="Deletion queue" subtitle="Accounts scheduled for deletion (PENDING_DELETION)." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty icon={Trash2} title="Queue is empty" sub="No accounts pending deletion." />
          : rows.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{u.fullName || "—"}</p>
                <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber} · requested {timeAgo(u.createdAt)}</p>
              </div>
              {u.scheduledDeletionAt && <span className="chip bg-amber-50 text-amber-600 text-[10px]">purges {timeAgo(u.scheduledDeletionAt)}</span>}
            </div>
          ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Audit log
   ========================================================================= */
function AuditSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 30 };
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.audit(params);
      setRows((p) => (reset ? d.entries : [...p, ...d.entries])); setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [cursor]);
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <SectionHead title="Audit log" subtitle="Every action taken from this console." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? <RowsSkeleton count={4} />
          : rows.length === 0 ? <Empty icon={ScrollText} title="No activity yet" />
          : rows.map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-3.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900/[.04] text-ink-500"><Dot size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{e.action}</p>
                <p className="truncate text-xs text-ink-500">
                  {e.adminUsername || "—"} · {e.targetType || ""} {e.targetId ? `#${String(e.targetId).slice(0, 8)}` : ""} · {timeAgo(e.createdAt)}
                  {e.metadata?.reason ? ` · "${e.metadata.reason}"` : ""}
                </p>
              </div>
              {e.ipAddress && <span className="text-[10px] text-ink-400">{e.ipAddress}</span>}
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Drawer shell
   ========================================================================= */
function Drawer({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md animate-[scale-in_.3s_cubic-bezier(.21,.65,.36,1)_both] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-900/[.06] p-5">
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-900/5"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
