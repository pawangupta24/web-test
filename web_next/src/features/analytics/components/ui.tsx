"use client";

import type { ReactNode } from "react";

export function Card({ title, action, children, className = "" }: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-ink-900/[.08] bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-semibold text-ink-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-ink-900/[.08] bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

/** Loading / error / empty in one place so every panel behaves the same. */
export function StateBlock({ loading, error, empty, children }: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading) return <div className="py-10 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="py-10 text-center text-sm text-danger-700">{error}</div>;
  if (empty) return <div className="py-10 text-center text-sm text-ink-500">No data yet.</div>;
  return <>{children}</>;
}

/** Horizontal bar list — reused for feature adoption, retention, funnels. */
export function BarList({ items }: {
  items: { label: string; value: number; caption?: string; pct?: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.pct ?? i.value));
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const width = Math.max(2, ((it.pct ?? it.value) / max) * 100);
        return (
          <div key={it.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-900">{it.label}</span>
              <span className="tabular-nums text-ink-500">{it.caption ?? it.value.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-900/[.06]">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RangeTabs({ value, onChange }: {
  value: string;
  onChange: (preset: string, from?: string, to?: string) => void;
}) {
  const presets: { key: string; label: string; days: number }[] = [
    { key: "1d", label: "Today", days: 1 },
    { key: "7d", label: "7 days", days: 7 },
    { key: "30d", label: "30 days", days: 30 },
    { key: "90d", label: "90 days", days: 90 },
  ];
  return (
    <div className="inline-flex rounded-xl border border-ink-900/[.08] bg-surface p-0.5">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => {
            const to = new Date();
            const from = new Date(to.getTime() - p.days * 864e5);
            onChange(p.key, from.toISOString(), to.toISOString());
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            value === p.key ? "bg-brand-600 text-white" : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
