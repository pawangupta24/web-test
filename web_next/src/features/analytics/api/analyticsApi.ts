// Analytics admin API. Reuses the shared axios instance from @/lib/api (which
// already attaches the admin JWT to /admin/* calls and handles admin refresh),
// so there is NO duplicate client or auth here — only the analytics endpoint map.
import { api } from "@/lib/api";
import type {
  DateRange,
  EventAnalytics,
  EventName,
  FeatureUsage,
  Funnel,
  Overview,
  RecentEvents,
  Retention,
} from "../types/analytics.types";

// Backend wraps payloads as { ok, data }. Strip to the payload (mirrors the
// shared `unwrap`, which isn't exported).
const strip = <T>(p: Promise<{ data: unknown }>): Promise<T> =>
  p.then((r: any) => (r.data?.data ?? r.data) as T);

const rangeParams = (r?: DateRange) => ({
  ...(r?.from ? { from: r.from } : {}),
  ...(r?.to ? { to: r.to } : {}),
});

export const analyticsApi = {
  overview: (r?: DateRange) =>
    strip<Overview>(api.get("/admin/analytics/overview", { params: rangeParams(r) })),

  featureUsage: (r?: DateRange) =>
    strip<FeatureUsage>(api.get("/admin/analytics/feature-usage", { params: rangeParams(r) })),

  eventAnalytics: (event: string, r?: DateRange) =>
    strip<EventAnalytics>(
      api.get("/admin/analytics/events", { params: { event, ...rangeParams(r) } }),
    ),

  eventNames: () =>
    strip<{ events: EventName[] }>(api.get("/admin/analytics/event-names")),

  retention: () => strip<Retention>(api.get("/admin/analytics/retention")),

  funnel: (name = "activation") =>
    strip<Funnel>(api.get("/admin/analytics/funnel", { params: { name } })),

  recentEvents: (params: { event?: string; platform?: string; limit?: number; offset?: number }) =>
    strip<RecentEvents>(api.get("/admin/analytics/recent", { params })),
};
