"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { setReplayer, startOfflineSync } from "@/lib/offline-queue";

/**
 * Boots the offline write queue: injects the HTTP replayer (the axios `api`, so
 * queued writes reuse auth-refresh and CSRF) and starts the replay
 * engine (drains on reconnect + periodically). Renders nothing. Runs in all
 * environments — it only replays real mutations the user made. See
 * src/lib/offline-queue.ts.
 */
export default function OfflineSync() {
  useEffect(() => {
    // Unwrap the { statusCode, success, message, data } envelope like `unwrap`
    // in api.ts, so queued writes see the same payload shape as a direct dok call.
    setReplayer((method, url, body) =>
      api({ method, url, data: body }).then((r) => (r?.data && "data" in r.data ? r.data.data : r?.data)),
    );
    startOfflineSync();
  }, []);

  return null;
}
