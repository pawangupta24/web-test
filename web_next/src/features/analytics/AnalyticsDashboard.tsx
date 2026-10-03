"use client";

import { useMemo, useState } from "react";
import { ADMIN_TOKENS } from "@/lib/api";
import {
  useEventAnalytics,
  useEventNames,
  useFeatureUsage,
  useFunnel,
  useOverview,
  useRecentEvents,
  useRetention,
} from "./hooks/useAnalytics";
import type { DateRange } from "./types/analytics.types";
import { BarList, Card, formatDuration, RangeTabs, StateBlock, StatCard } from "./components/ui";
import { LineChart } from "./components/LineChart";

export default function AnalyticsDashboard() {
  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - 30 * 864e5).toISOString(), to: to.toISOString() };
  });

  // Admin session lives in sessionStorage (set by the /admin console login).
  const hasAdmin = typeof window !== "undefined" && !!ADMIN_TOKENS.access;
  if (!hasAdmin) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Admin sign-in required</h2>
        <p className="mt-2 text-sm text-ink-500">
          Analytics is admin-only. Please sign in from the admin console first.
        </p>
        <a href="/admin" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Go to admin
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-500">Product usage &amp; feature adoption</p>
        </div>
        <RangeTabs
          value={preset}
          onChange={(p, from, to) => {
            setPreset(p);
            setRange({ from, to });
          }}
        />
      </header>

      <OverviewSection range={range} />
      <FeatureUsageSection range={range} />
      <EventExplorerSection range={range} />
      <div className="grid gap-6 md:grid-cols-2">
        <RetentionSection />
        <FunnelSection />
      </div>
      <RecentEventsSection />
    </div>
  );
}

function OverviewSection({ range }: { range: DateRange }) {
  const { data, loading, error } = useOverview(range);
  return (
    <div className="space-y-4">
      <StateBlock loading={loading} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="DAU" value={data.dau.toLocaleString()} sub="last 24h" />
              <StatCard label="WAU" value={data.wau.toLocaleString()} sub="last 7d" />
              <StatCard label="MAU" value={data.mau.toLocaleString()} sub="last 30d" />
              <StatCard label="Sessions" value={data.sessions.toLocaleString()} />
              <StatCard label="Avg session" value={formatDuration(data.avgSessionSeconds)} />
              <StatCard label="Events" value={data.events.toLocaleString()} />
              <StatCard label="New users" value={data.newUsers.toLocaleString()} />
              <StatCard label="Returning" value={data.returningUsers.toLocaleString()} />
            </div>
            <Card title="Events over time">
              <LineChart points={data.series.map((s) => ({ label: s.day, value: s.events }))} />
            </Card>
          </>
        )}
      </StateBlock>
    </div>
  );
}

function FeatureUsageSection({ range }: { range: DateRange }) {
  const { data, loading, error } = useFeatureUsage(range);
  return (
    <Card title="Feature usage & adoption" action={data ? <span className="text-xs text-ink-500">MAU {data.mau.toLocaleString()}</span> : null}>
      <StateBlock loading={loading} error={error} empty={!data?.features?.length}>
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4 text-right">Unique users</th>
                  <th className="py-2 pr-4 text-right">Total uses</th>
                  <th className="py-2 pl-4 text-right">Adoption</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((f) => (
                  <tr key={f.feature} className="border-t border-ink-900/[.06]">
                    <td className="py-2 pr-4 font-medium text-ink-900">{f.feature}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-ink-700">{f.uniqueUsers.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-ink-700">{f.totalUses.toLocaleString()}</td>
                    <td className="py-2 pl-4 text-right tabular-nums font-semibold text-brand-600">{f.adoption}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StateBlock>
    </Card>
  );
}

function EventExplorerSection({ range }: { range: DateRange }) {
  const { data: names } = useEventNames();
  const [event, setEvent] = useState("theme_changed");
  const { data, loading, error } = useEventAnalytics(event, range);
  return (
    <Card
      title="Event analytics"
      action={
        <select
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          className="rounded-lg border border-ink-900/[.12] bg-surface px-2 py-1 text-xs text-ink-900"
        >
          {(names?.events?.length ? names.events.map((n) => n.event_name) : [event]).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      }
    >
      <StateBlock loading={loading} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={data.total.toLocaleString()} />
              <StatCard label="Unique users" value={data.uniqueUsers.toLocaleString()} />
              <StatCard label="Per user" value={data.eventsPerUser} />
            </div>
            <div className="mt-4">
              <LineChart points={data.series.map((s) => ({ label: s.day, value: s.count }))} />
            </div>
          </>
        )}
      </StateBlock>
    </Card>
  );
}

function RetentionSection() {
  const { data, loading, error } = useRetention();
  return (
    <Card title="Retention">
      <StateBlock loading={loading} error={error} empty={!data?.cohortSize}>
        {data && (
          <>
            <BarList
              items={[
                { label: "Day 1", value: data.day1, pct: data.day1, caption: `${data.day1}%` },
                { label: "Day 7", value: data.day7, pct: data.day7, caption: `${data.day7}%` },
                { label: "Day 14", value: data.day14, pct: data.day14, caption: `${data.day14}%` },
                { label: "Day 30", value: data.day30, pct: data.day30, caption: `${data.day30}%` },
              ]}
            />
            <p className="mt-3 text-xs text-ink-500">Cohort {data.cohortSize.toLocaleString()} · {data.methodology}</p>
          </>
        )}
      </StateBlock>
    </Card>
  );
}

function FunnelSection() {
  const [name] = useState("activation");
  const { data, loading, error } = useFunnel(name);
  return (
    <Card title="Funnel">
      <StateBlock loading={loading} error={error} empty={!data?.steps?.length}>
        {data && (
          <BarList
            items={data.steps.map((s) => ({
              label: s.event,
              value: s.users,
              pct: s.conversionFromStart,
              caption: `${s.users.toLocaleString()} · ${s.conversionFromStart}%`,
            }))}
          />
        )}
      </StateBlock>
    </Card>
  );
}

function RecentEventsSection() {
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const { data, loading, error } = useRecentEvents({ limit, offset });
  const hasNext = useMemo(() => (data?.events?.length ?? 0) === limit, [data]);
  return (
    <Card
      title="Recent events"
      action={
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="rounded-lg border border-ink-900/[.12] px-2 py-1 text-xs text-ink-700 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={!hasNext}
            onClick={() => setOffset((o) => o + limit)}
            className="rounded-lg border border-ink-900/[.12] px-2 py-1 text-xs text-ink-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      }
    >
      <StateBlock loading={loading} error={error} empty={!data?.events?.length}>
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase tracking-wide text-ink-500">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Platform</th>
                  <th className="py-2 pr-3">Ver</th>
                  <th className="py-2">Properties</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.events.map((e) => (
                  <tr key={e.eventId} className="border-t border-ink-900/[.06]">
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-500">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-medium text-ink-900">{e.event}</td>
                    <td className="py-2 pr-3 text-ink-500">{e.userId ?? "—"}</td>
                    <td className="py-2 pr-3 text-ink-700">{e.platform ?? "—"}</td>
                    <td className="py-2 pr-3 text-ink-700">{e.appVersion ?? "—"}</td>
                    <td className="py-2 font-mono text-ink-500">{JSON.stringify(e.properties)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StateBlock>
    </Card>
  );
}
