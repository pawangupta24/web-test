"use client";
import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import RightRail from "@/components/layout/RightRail";
import { PostFeedSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { getFeedSessionId, setFeedSessionId } from "@/lib/feedSession";

export default function Explore() {
  const { demo } = useAuth();
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    // Explore shares media's personalized pipeline (all three feed routes hit the
    // same gateway handler), so it needs its own session or it inherits the same
    // served-set starvation that emptied the home feed. Its own scope, never
    // home's: two feeds sharing a served-set would hide each other's content.
    //
    // The session is kept across visits and reloads (never rotated here): the
    // server excludes what it already served in it, so each visit shows posts not
    // yet seen. Rotating reset that set and re-served the identical posts.
    const sess = getFeedSessionId("explore");
    dok.feed
      .explore(sess ? `?sessionId=${encodeURIComponent(sess)}` : "")
      .then((d) => { setFeedSessionId("explore", d.sessionId); setPosts(d.feed || d.posts || []); })
      .catch(() => setPosts([]));
  }, []);
  return (
    <div className="flex gap-6">
      <div className="mx-auto w-full max-w-xl pb-24">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Explore</h1>
          <p className="text-sm text-ink-500">Trending posts & pulses from across Orovion.</p>
        </header>
        {posts === null ? (
          <PostFeedSkeleton />
        ) : (
          <div className="space-y-5">{posts.map((p) => <PostCard key={p._id || p.id} post={p} demo={demo} />)}</div>
        )}
      </div>
      <RightRail />
    </div>
  );
}
