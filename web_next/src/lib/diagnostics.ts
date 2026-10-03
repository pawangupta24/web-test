/**
 * Feed diagnostics — why a feed is empty.
 *
 * The post feed and the Pulse feed both degrade quietly on purpose: a failed
 * request falls back to cache, or to an empty list, so the user never sees a
 * stack trace. The cost is that "no posts yet", "the request 404'd", "you are
 * offline" and "the server returned an empty page" all look identical on screen
 * AND in the console, because every one of those paths used a bare `catch {}`.
 *
 * These helpers make the difference visible in DevTools without changing what
 * the user sees. `describeRequestError` is pure so it can be unit-tested
 * (`src/lib/__tests__/diagnostics.test.ts`); the log* wrappers are the thin
 * console layer, following the existing `[scope] message` convention used by
 * `webrtcService.ts` and `ServiceWorkerRegister.tsx`.
 */

export type RequestFailure = {
  /** HTTP status, or null when the request never got a response (offline/DNS/CORS). */
  status: number | null;
  method: string | null;
  url: string | null;
  /** The backend's `message` from the apiResponse envelope, when there was one. */
  serverMessage: string | null;
  message: string;
  /** No response at all — the usual signature of offline or a blocked origin. */
  noResponse: boolean;
  /** The browser's own view, useful when noResponse is true. */
  navigatorOffline: boolean;
};

/**
 * Flatten an axios error into the handful of fields worth reading. Logging the
 * raw error object buries status and URL inside a huge object graph; this keeps
 * the log one readable line.
 */
export function describeRequestError(err: any): RequestFailure {
  const response = err?.response;
  const config = err?.config;
  return {
    status: typeof response?.status === "number" ? response.status : null,
    method: config?.method ? String(config.method).toUpperCase() : null,
    url: config?.url ?? null,
    serverMessage: response?.data?.message ?? null,
    message: err?.message || String(err ?? "Unknown error"),
    noResponse: Boolean(err) && !response,
    navigatorOffline: typeof navigator !== "undefined" && navigator.onLine === false,
  };
}

/** A feed request failed. Always an error — something the user asked for did not happen. */
export function logFeedError(scope: string, operation: string, err: unknown): void {
  console.error(`[${scope}] ${operation} failed`, describeRequestError(err));
}

/**
 * A feed request SUCCEEDED but there is nothing to render. Not an error — but it
 * is the state users report as "it's broken", so say it out loud and include
 * whatever distinguishes "server sent an empty page" from "we fell back to an
 * empty cache".
 */
export function logFeedEmpty(scope: string, operation: string, detail: Record<string, unknown> = {}): void {
  console.warn(`[${scope}] ${operation} produced nothing to show`, detail);
}
