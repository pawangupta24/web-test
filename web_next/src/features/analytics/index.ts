// Public surface of the admin analytics feature. Delete this folder + the
// /admin/analytics route to remove the dashboard entirely.
export { default as AnalyticsDashboard } from "./AnalyticsDashboard";
export { analyticsApi } from "./api/analyticsApi";
export * from "./types/analytics.types";
