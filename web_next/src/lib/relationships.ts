/**
 * Pure network-relationship state machine, shared by every Follow/Connect
 * surface. Kept framework-free so it can be unit-tested in isolation.
 *
 * States: self | follow | following | connect | connecting | accept | message
 *
 *   not following                → follow
 *   following + none             → connect      (Following stays available as a
 *                                                secondary control, so unfollow
 *                                                is never taken away)
 *   following + pending_outgoing → connecting
 *   following + pending_incoming → accept
 *   following + connected        → message
 *
 * PRIVATE ACCOUNTS ARE GONE. There is no "requested" state any more: every
 * profile is public and a follow is immediate and unilateral. `requested` was
 * removed rather than left unreachable, so a stale `isRequested` from a server
 * that has not been redeployed cannot strand a button on a dead label.
 */

export type RelationshipState =
  | "self" | "follow" | "following" | "connect" | "connecting" | "accept" | "message";

export function deriveState(u): RelationshipState {
  if (!u || u.isSelf) return "self";
  // `isRequested` is deliberately ignored — see the note above.
  if (!u.isFollowing) return "follow";
  switch (u.connectionStatus) {
    case "connected": return "message";
    case "pending_outgoing": return "connecting";
    case "pending_incoming": return "accept";
    default: return "connect";
  }
}

/**
 * Reconcile a follow broadcast (see lib/followBus) into a button's local state so
 * follow/unfollow on one surface mirrors on every other mounted button.
 *
 * `simple` collapses the connection sub-states to a plain "following" (post/reel
 * cards, suggestion cards). In full mode an existing connection sub-state
 * (connecting/accept/message) is preserved once following — only follow↔unfollow
 * flips it; a fresh follow settles at the resting "connect".
 */
export function reconcileFollowState(
  current: RelationshipState,
  { following }: { following?: boolean } = {},
  simple = false,
): RelationshipState {
  if (current === "self") return "self";
  if (!following) return "follow";
  if (simple) return "following";
  return current === "follow" ? "connect" : current;
}

/**
 * Connecting implies following, and the server enforces that by creating the
 * follow edge itself when a Connect arrives from a non-follower. The client
 * mirrors it optimistically so the Following control appears in the same frame
 * rather than popping in after the request resolves.
 */
export function stateAfterConnect(_current: RelationshipState): RelationshipState {
  return "connecting";
}

/**
 * Accepting a connection makes the pair mutually follow (server-side), so an
 * accepted request lands on "message" with the viewer now following the target.
 */
export function stateAfterAccept(_current: RelationshipState): RelationshipState {
  return "message";
}
