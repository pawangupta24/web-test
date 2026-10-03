"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { compact, roleLabel } from "@/lib/utils";
import { reconcileFollowState, type RelationshipState } from "@/lib/relationships";
import { onFollowChange } from "@/lib/followBus";
import { useFollowAction } from "@/lib/useFollowAction";

// Single morphing action button used on suggestion cards (vs. the two distinct
// buttons on a full profile). Tap the avatar/name to open the profile; tap the
// button to follow/unfollow.
//
// Private accounts were removed, so there is no request/withdraw path: a follow
// is immediate, and Connect is valid even for someone the viewer does not follow
// yet (the server creates that edge first). Debounce, optimistic commit, rollback
// and the cross-surface broadcast come from useFollowAction, shared with
// FollowButton and the profile header.
export default function UserCard({ user, action = "follow", demo, onAction }) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user._id || user.id;

  const initState: RelationshipState =
    action === "connect"
      ? (user.connectionStatus === "pending_outgoing" ? "connecting" : "connect")
      : (user.isFollowing ? "following" : "follow");

  const [state, setState] = useState<RelationshipState>(initState);
  const src = useRef(Math.random().toString(36).slice(2)); // ignore our own broadcast echo
  const stateRef = useRef(state);
  stateRef.current = state;

  // Re-sync if the suggestion list reloads with fresh relationship flags.
  useEffect(() => { setState(initState); /* eslint-disable-next-line */ }, [id, user.isFollowing, user.connectionStatus]);

  // Resync when the same user is followed/unfollowed on another surface (connect cards opt out).
  useEffect(() => {
    if (action === "connect") return undefined;
    return onFollowChange((d) => {
      if (d.source === src.current || String(d.id) !== String(id)) return;
      const next = reconcileFollowState(stateRef.current, d, true);
      if (next !== stateRef.current) setState(next);
    });
  }, [id, action]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProfile = () => { if (id) nav(`/app/profile/${id}`); };

  const action_ = useFollowAction({
    userId: id,
    commit: setState,
    current: state,
    source: src.current,
    demo,
    onError: (m) => toast?.error(m),
  });
  const busy = action_.busy;

  const handle = async () => {
    if (!id || busy) return;
    onAction?.(user, state);

    if (action === "connect") { await action_.connect(); return; }

    // Follow surfaces are a plain two-state toggle.
    if (state === "follow") await action_.follow(true);
    else if (state === "following") await action_.unfollow();
  };

  const labels = {
    follow: "Follow",
    following: "Following",
    connect: "Connect",
    connecting: "Connecting",
  };
  const isActive = state === "following" || state === "connecting";

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={openProfile} className="press shrink-0" aria-label={`View ${user.fullName}'s profile`}>
        <Avatar user={user} size={44} />
      </button>
      <button type="button" onClick={openProfile} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold hover:underline">{user.fullName}</span>
          {user.isVerified && <Verified size={13} />}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {user.professionalHeadline || roleLabel(user.role)}
          {user.followersCount ? ` · ${compact(user.followersCount)} followers` : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`${isActive ? "btn-outline" : "btn-ghost"} px-4 py-1.5 text-xs disabled:opacity-60`}
      >
        {labels[state]}
      </button>
    </div>
  );
}
