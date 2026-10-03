// Shapes returned by /api/admin/analytics/* (see backend modules/analytics).
// Kept in the feature module so analytics types never leak into shared code.

export interface DateRange {
  from?: string; // ISO
  to?: string; // ISO
}

export interface TimePoint {
  day: string;
  events: number;
  users?: number;
  count?: number;
}

export interface Overview {
  range: { from: string; to: string };
  dau: number;
  wau: number;
  mau: number;
  sessions: number;
  events: number;
  avgSessionSeconds: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  series: TimePoint[];
}

export interface FeatureRow {
  feature: string;
  uniqueUsers: number;
  totalUses: number;
  adoption: number; // %
}

export interface FeatureUsage {
  range: { from: string; to: string };
  mau: number;
  features: FeatureRow[];
}

export interface EventAnalytics {
  event: string;
  range: { from: string; to: string };
  total: number;
  uniqueUsers: number;
  eventsPerUser: number;
  series: { day: string; count: number }[];
}

export interface Retention {
  methodology: string;
  cohortSize: number;
  day1: number;
  day7: number;
  day14: number;
  day30: number;
}

export interface FunnelStep {
  event: string;
  users: number;
  conversionFromStart: number;
  conversionFromPrev: number;
}

export interface Funnel {
  funnel: string;
  steps: FunnelStep[];
}

export interface RecentEvent {
  eventId: string;
  event: string;
  userId: string | null;
  sessionId: string | null;
  timestamp: string;
  platform: string | null;
  appVersion: string | null;
  properties: Record<string, unknown>;
}

export interface RecentEvents {
  limit: number;
  offset: number;
  events: RecentEvent[];
}

export interface EventName {
  event_name: string;
  total: number;
}
