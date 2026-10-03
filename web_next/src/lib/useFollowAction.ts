"use client";
/**
 * useFollowAction — the one place follow / unfollow / connect / accept behaviour
 * lives on the client.
 *
 * WHY THIS EXISTS
 * The Follow button is rendered by three genuinely different layouts (the shared
 * FollowButton chip, the UserCard list row, and the profile header's two-control
 * arrangement). Each one had its own copy of "optimistically commit, call the
 * API, roll back on failure, broadcast to the other mounted buttons" — three
 * chances to get the rollback or the broadcast subtly wrong. The layouts stay
 * separate, because forcing one component into three shapes would be worse; the
 * *logic* does not.
 *
 * WHAT IT GUARANTEES
 *   - Debounce: a rapid double-tap fires ONE request. The PRD asks for this, and
 *     it is only half the protection — the server also refuses to double-count
 *     (see social.graph). Client-side alone would still let two tabs race;
 *     server-side alone would still spam the network from one jittery tap.
 *   - Optimistic commit with exact rollback: the pre-action state is captured and
 *     restored on failure, rather than guessing an inverse.
 *   - In-flight guard: a second action while one is pending is dropped, so a
 *     follow/unfollow pair cannot land out of order.
 *   - One broadcast per real change, tagged with this button's source id so a
 *     button ignores its own echo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { dok } from "@/lib/api";
import { broadcastFollow } from "@/lib/followBus";
import { sendOrQueue } from "@/lib/offline-queue";
import type { RelationshipState } from "@/lib/relationships";

/** Matches the PRD's debounce requirement. */
export const TAP_DEBOUNCE_MS = 500;

type Options = {
  userId: string;
  /** Applies the new state to the caller's own UI. */
  commit: (next: RelationshipState) => void;
  /** The state right now, used as the rollback target. */
  current: RelationshipState;
  /** Identifies this button so it can ignore its own broadcast echo. */
  source?: string;
  onError?: (message: string) => void;
  /** Demo/preview surfaces mutate UI only and never call the API. */
  demo?: boolean;
};

export function useFollowAction({ userId, commit, current, source, onError, demo }: Options) {
  const lastTapRef = useRef(0);
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  /**
   * Returns false when the tap should be ignored — either it landed inside the
   * debounce window, or an action is still in flight.
   */
  const claim = useCallback(() => {
    const now = Date.now();
    if (inFlightRef.current) return false;
    if (now - lastTapRef.current < TAP_DEBOUNCE_MS) return false;
    lastTapRef.current = now;
    inFlightRef.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    inFlightRef.current = false;
    if (mountedRef.current) setBusy(false);
  }, []);

  /**
   * Optimistically move to `next`, run `call`, and restore `rollbackTo` if it
   * fails. `rollbackTo` is captured by the caller BEFORE the optimistic commit,
   * so recovery restores what was actually there rather than an assumed inverse.
   */
  const run = useCallback(async (
    next: RelationshipState,
    call: () => Promise<unknown>,
    { rollbackTo, broadcast, errorMessage }: {
      rollbackTo: RelationshipState;
      broadcast?: boolean | null;
      errorMessage: string;
    },
  ) => {
    if (!userId || !claim()) return;
    setBusy(true);
    commit(next);
    if (broadcast != null) broadcastFollow(userId, broadcast, { source });

    if (demo) { release(); return; }

    try {
      await call();
    } catch (e: any) {
      commit(rollbackTo);
      // Undo the optimistic broadcast so other mounted buttons do not keep a
      // state the server rejected.
      if (broadcast != null) broadcastFollow(userId, !broadcast, { source });
      onError?.(e?.response?.data?.message || errorMessage);
    } finally {
      release();
    }
  }, [userId, claim, release, commit, source, demo, onError]);

  const follow = useCallback((simple = false) => run(
    simple ? "following" : "connect",
    () => dok.follows.follow(userId),
    { rollbackTo: current, broadcast: true, errorMessage: "Couldn't follow — try again" },
  ), [run, userId, current]);

  const unfollow = useCallback(() => run(
    "follow",
    () => dok.follows.unfollow(userId),
    { rollbackTo: current, broadcast: false, errorMessage: "Couldn't unfollow — try again" },
  ), [run, userId, current]);

  /**
   * Connect. The server creates the follow edge first when the viewer is not yet
   * following, so this is valid from any surface — including a Network
   * suggestion for a stranger. Broadcast `true` because the viewer ends up
   * following either way.
   *
   * Queued when offline and replayed on reconnect; the optimistic "connecting"
   * stands, and only a permanent failure reverts it.
   */
  const connect = useCallback(() => run(
    "connecting",
    () => sendOrQueue({
      kind: "connect", method: "post",
      url: `/network/request/${userId}`, dedupeKey: `connect:${userId}`,
    }),
    { rollbackTo: current, broadcast: true, errorMessage: "Couldn't send the connection request" },
  ), [run, userId, current]);

  /** Accepting makes the pair mutually follow server-side. */
  const accept = useCallback((connectionRequestId?: string) => run(
    "message",
    () => dok.network.accept(connectionRequestId || userId),
    { rollbackTo: current, broadcast: true, errorMessage: "Couldn't accept the request" },
  ), [run, userId, current]);

  return { busy, follow, unfollow, connect, accept };
}
