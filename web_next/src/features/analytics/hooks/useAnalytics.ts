"use client";

import { useCallback, useEffect, useState } from "react";
import { analyticsApi } from "../api/analyticsApi";
import type { DateRange } from "../types/analytics.types";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Small generic loader (the app has no react-query; plain state matches it).
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.response?.data?.error || e?.message || "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run, tick]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}

export const useOverview = (range: DateRange) =>
  useAsync(() => analyticsApi.overview(range), [range.from, range.to]);

export const useFeatureUsage = (range: DateRange) =>
  useAsync(() => analyticsApi.featureUsage(range), [range.from, range.to]);

export const useEventNames = () => useAsync(() => analyticsApi.eventNames(), []);

export const useEventAnalytics = (event: string, range: DateRange) =>
  useAsync(
    () => analyticsApi.eventAnalytics(event, range),
    [event, range.from, range.to],
  );

export const useRetention = () => useAsync(() => analyticsApi.retention(), []);

export const useFunnel = (name: string) => useAsync(() => analyticsApi.funnel(name), [name]);

export const useRecentEvents = (params: {
  event?: string;
  platform?: string;
  limit: number;
  offset: number;
}) =>
  useAsync(
    () => analyticsApi.recentEvents(params),
    [params.event, params.platform, params.limit, params.offset],
  );
