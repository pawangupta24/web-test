// Offline write queue — the web equivalent of the Flutter SyncManager.
//
// A mutation attempted while offline (or that fails with a transient error) is
// durably stored in IndexedDB and replayed FIFO when the device comes back
// online, with exponential backoff, a retry cap, and dedupe. The optimistic UI
// proceeds immediately; the write lands later. This is what makes write
// "functionalities work offline" alongside the read cache (offline-cache.ts).
//
// The actual HTTP is done by an injected `replayer` (set once at app startup in
// OfflineSync.tsx to call the axios `api`), so this module imports no framework
// or `api` — keeping the pure logic below unit-testable in plain Node.

import { idbGet, idbSet } from "./idb";

const QUEUE_KEY = "offline:queue:v1";
const MAX_RETRIES = 8;
const MAX_BACKOFF_MS = 5 * 60_000;
const DRAIN_INTERVAL_MS = 30_000;

export interface QueueItem {
  id: string;
  kind: string; // semantic label, e.g. "connect", "like" (for debugging/metrics)
  method: string; // "post" | "put" | "delete" | ...
  url: string; // api path relative to the axios baseURL, e.g. "/network/request/123"
  body?: unknown;
  dedupeKey?: string; // when set, a newer enqueue REPLACES the pending one (latest wins)
  createdAt: number;
  retryCount: number;
  nextAttemptAt: number; // epoch ms — backoff gate
  lastError?: string;
}

export interface QueueReq {
  kind: string;
  method: string;
  url: string;
  body?: unknown;
  dedupeKey?: string;
}

// ── Pure helpers (unit-tested; no I/O) ──────────────────────────────────────
export function backoffMs(retryCount: number): number {
  const base = Math.pow(2, retryCount) * 2000; // 4s, 8s, 16s, …
  return Math.min(base, MAX_BACKOFF_MS);
}

/** A failed attempt is retryable when there's no response (network/offline) or a
 *  5xx server error; a 4xx is permanent (the request can never succeed as-is). */
export function isRetryableStatus(status?: number | null): boolean {
  return status == null || status >= 500;
}

/** Insert (append) an item; if it carries a dedupeKey, drop any pending item with
 *  the same key first so only the latest intent is delivered (e.g. re-tapping). */
export function dedupeInsert(queue: QueueItem[], item: QueueItem): QueueItem[] {
  const base = item.dedupeKey ? queue.filter((q) => q.dedupeKey !== item.dedupeKey) : queue;
  return [...base, item];
}

/** Items whose backoff gate has elapsed. */
export function dueItems(queue: QueueItem[], now: number): QueueItem[] {
  return queue.filter((q) => q.nextAttemptAt <= now);
}

const isRetryableError = (e: any): boolean => isRetryableStatus(e?.response?.status);
const newId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ── HTTP injection ──────────────────────────────────────────────────────────
type Replayer = (method: string, url: string, body?: unknown) => Promise<unknown>;
let replayer: Replayer | null = null;
export function setReplayer(fn: Replayer): void {
  replayer = fn;
}

// ── Storage ─────────────────────────────────────────────────────────────────
async function loadQueue(): Promise<QueueItem[]> {
  return (await idbGet<QueueItem[]>(QUEUE_KEY)) || [];
}
async function saveQueue(q: QueueItem[]): Promise<void> {
  await idbSet(QUEUE_KEY, q);
}

export async function enqueue(req: QueueReq): Promise<void> {
  const now = Date.now();
  const item: QueueItem = {
    id: newId(),
    kind: req.kind,
    method: req.method.toLowerCase(),
    url: req.url,
    body: req.body,
    dedupeKey: req.dedupeKey,
    createdAt: now,
    retryCount: 0,
    nextAttemptAt: now,
  };
  await saveQueue(dedupeInsert(await loadQueue(), item));
}

export async function pendingCount(): Promise<number> {
  return (await loadQueue()).length;
}

/**
 * Perform [req] now, or durably queue it. Returns { queued:true } (resolves, so
 * the optimistic UI proceeds) when offline / no replayer / a transient failure;
 * returns { queued:false, data } on success; THROWS on a permanent (4xx) error
 * so the caller can revert if it wants to.
 */
export async function sendOrQueue(req: QueueReq): Promise<{ queued: boolean; data?: unknown }> {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || !replayer) {
    await enqueue(req);
    return { queued: true };
  }
  try {
    const data = await replayer(req.method, req.url, req.body);
    return { queued: false, data };
  } catch (e) {
    if (isRetryableError(e)) {
      await enqueue(req);
      return { queued: true };
    }
    throw e;
  }
}

let draining = false;

/** Replay every due item once. Reconciles against the live queue so items
 *  enqueued during the drain are never lost. Best-effort; never throws. */
export async function drainQueue(): Promise<void> {
  if (draining || !replayer) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  draining = true;
  try {
    const snapshot = await loadQueue();
    const now = Date.now();
    const doneIds = new Set<string>(); // delivered, dropped (4xx), or gave up
    const updates = new Map<string, QueueItem>(); // backed-off retries

    for (const item of dueItems(snapshot, now)) {
      try {
        await replayer(item.method, item.url, item.body);
        doneIds.add(item.id);
      } catch (e: any) {
        if (!isRetryableError(e)) {
          doneIds.add(item.id); // permanent → drop so it can't wedge the queue
          continue;
        }
        const next = item.retryCount + 1;
        if (next >= MAX_RETRIES) {
          doneIds.add(item.id); // give up
          continue;
        }
        updates.set(item.id, {
          ...item,
          retryCount: next,
          nextAttemptAt: now + backoffMs(next),
          lastError: String(e?.message || e),
        });
      }
    }

    const current = await loadQueue(); // may contain items enqueued mid-drain
    const merged = current
      .filter((it) => !doneIds.has(it.id))
      .map((it) => updates.get(it.id) || it);
    await saveQueue(merged);
  } finally {
    draining = false;
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

/** Start the replay engine: drain now, on every `online` event, and periodically
 *  (so backed-off items retry while the tab stays open). Idempotent. */
export function startOfflineSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => void drainQueue());
  timer = setInterval(() => void drainQueue(), DRAIN_INTERVAL_MS);
  void drainQueue();
}

export function stopOfflineSync(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}
