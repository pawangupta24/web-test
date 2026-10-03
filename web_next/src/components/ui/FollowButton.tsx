"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { UserPlus, UserCheck, Clock, MessageSquare, Loader2, Link2 } from "lucide-react";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { deriveState, reconcileFollowState, type RelationshipState } from "@/lib/relationships";
import { onFollowChange } from "@/lib/followBus";
import { useFollowAction } from "@/lib/useFollowAction";

/**
 * The centralized network state machine.
 * Renders identically in feed-card headers, like-details rows, and profiles.
 *
 *   State A (not following):  Follow → Following
 *   State B (following):      Connect → Connecting → Message (connected)
 *                             pending_incoming → Accept
 *
 * Private accounts were removed, so there is no Requested state: a follow is
 * always immediate. Transitions are optimistic, debounced, and roll back to the
 * exact prior state on failure — all of that lives in useFollowAction, shared
 * with the other two Follow surfaces (UserCard, the profile header).
 *
 * `user`: { _id|id, isFollowing, connectionStatus?, connectionRequestId?, isSelf?, fullName? }
 * `variant`: "solid" (pill buttons, like-list rows) | "ghost" (inline text, card headers)
 */

type FollowButtonProps = {
  user: any;
  demo?: boolean;
  /** "solid" (pill buttons, like-list rows) | "ghost" (inline text, card headers) */
  variant?: "solid" | "ghost";
  className?: string;
  onStateChange?: (next: RelationshipState) => void;
  /** Collapse the connection sub-states to a plain Follow/Following toggle. */
  simple?: boolean;
};

export default function FollowButton({ user, demo, variant = "solid", className, onStateChange, simple = false }: FollowButtonProps) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user?.id || user?._id;
  // `simple` (posts & reels): a plain Follow/Following toggle — collapse the
  // connection sub-states (connect/connecting/accept/message) down to "following".
  const [state, setState] = useState(() => {
    const s = deriveState(user);
    return simple && s !== "follow" && s !== "self" ? "following" : s;
  });
  const morphTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const src = useRef(Math.random().toString(36).slice(2)); // ignore our own broadcast echo
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => () => clearTimeout(morphTimer.current ?? undefined), []);

  const commit = (next) => {
    setState(next);
    onStateChange?.(next);
  };

  // Debounce, optimistic commit, exact rollback and the follow broadcast all live
  // in the shared hook so all three Follow surfaces behave identically.
  const action = useFollowAction({
    userId: id,
    commit,
    current: state,
    source: src.current,
    demo,
    onError: (m) => toast?.error(m),
  });
  const busy = action.busy;

  // Resync when the same user is followed/unfollowed on another surface.
  useEffect(() => {
    return onFollowChange((d) => {
      if (d.source === src.current || String(d.id) !== String(id)) return;
      const next = reconcileFollowState(stateRef.current, d, simple);
      if (next !== stateRef.current) { clearTimeout(morphTimer.current ?? undefined); commit(next); }
    });
  }, [id, simple]); // eslint-disable-line react-hooks/exhaustive-deps

  const follow = async () => {
    if (simple) {
      await action.follow(true);       // plain toggle: rest on Following
    } else {
      // Full mode: land on a transient "Following ✓", then morph into Connect.
      // The hook commits "connect" as its resting state, so show the tick first
      // and let the timer hand over to it.
      commit("following");
      clearTimeout(morphTimer.current ?? undefined);
      morphTimer.current = setTimeout(() => commit("connect"), 1400);
      await action.follow(false);
    }
  };

  const unfollow = async () => {
    clearTimeout(morphTimer.current ?? undefined);
    await action.unfollow();
  };

  const connect = () => action.connect();
  const accept  = () => action.accept(user?.connectionRequestId);

  const message = async () => {
    if (demo) { nav("/app/messages"); return; }
    try {
      const d = await dok.chat.start({ recipientId: id });
      const cid = d?.conversation?.id || d?.conversation?._id || d?.conversationId;
      nav(cid ? `/app/messages?c=${cid}` : "/app/messages");
    } catch {
      toast?.error("Couldn't open the conversation");
    }
  };

  if (state === "self" || !id) return null;

  // Typed explicitly: without it TypeScript infers a union of the individual
  // entry shapes, and `title` / `spin` (present on only some) stop existing on
  // the narrowed type the moment an entry is added or removed.
  const CONFIG: Record<string, {
    label: string; icon: any; onClick?: () => void | Promise<void>;
    title?: string; spin?: boolean; solid: string; ghost: string;
  }> = {
    follow:     { label: "Follow",      icon: UserPlus,      onClick: follow,
                  solid: "bg-brand-600 text-white hover:bg-brand-700 shadow-glow",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    following:  { label: "Following",   icon: UserCheck,     onClick: simple ? unfollow : undefined, title: simple ? "Tap to unfollow" : undefined,
                  solid: simple ? "bg-brand-50 text-brand-700 hover:bg-danger-50 hover:text-danger-500" : "bg-brand-50 text-brand-700",
                  ghost: simple ? "text-brand-700 hover:text-danger-500" : "text-brand-700" },
    connect:    { label: "Connect",     icon: Link2,         onClick: connect,
                  solid: "border border-brand-300 bg-surface text-brand-700 hover:bg-brand-50",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    // Clock, not a spinner: this state is waiting on the OTHER person to accept,
    // which may take days. A perpetually spinning Loader2 reads as a stuck UI.
    connecting: { label: "Connecting",  icon: Clock,         onClick: undefined,
                  solid: "border border-ink-900/[.10] bg-ink-900/[.03] text-ink-400",
                  ghost: "text-ink-400" },
    accept:     { label: "Accept",      icon: UserCheck,     onClick: accept,
                  solid: "bg-brand-600 text-white hover:bg-brand-700 shadow-glow",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    message:    { label: "Message",     icon: MessageSquare, onClick: message,
                  solid: "bg-brand-50 text-brand-700 hover:bg-brand-100",
                  ghost: "text-brand-600 hover:bg-brand-50" },
  };

  // A server that has not been redeployed can still send a legacy "requested";
  // fall back to Follow rather than crashing on an undefined config entry.
  const c = CONFIG[state] || CONFIG.follow;
  const Icon = c.icon;
  const interactive = Boolean(c.onClick) && !busy;

  return (
    <button
      key={state} // re-mount on state change → anim-pop entrance
      onClick={interactive ? c.onClick : undefined}
      disabled={!interactive}
      title={c.title}
      aria-label={`${c.label}${user?.fullName ? ` ${user.fullName}` : ""}`}
      className={cn(
        "press anim-pop inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-bold transition-all",
        variant === "solid" ? "px-4 py-1.5 text-xs" : "px-2 py-0.5 text-xs",
        c[variant],
        !interactive && "cursor-default",
        className
      )}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} className={cn(c.spin && "animate-spin")} />}
      {c.label}
    </button>
  );
}
