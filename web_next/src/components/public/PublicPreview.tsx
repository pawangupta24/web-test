import { Clock, Heart, MessageCircle, Play, Video } from "lucide-react";
import { Avatar, PostTypeBadge, RoleBadge, Verified } from "@/components/ui/Primitives";
import PublicPreviewActions from "@/components/public/PublicPreviewActions";
import {
  compactCount, displayName,
  type PublicAuthor, type PublicPost, type PublicProfile, type PublicPulse,
} from "@/lib/publicPreview";

/**
 * Server-rendered cards for the public share-link pages in `src/app/(public)/`.
 * What a signed-out visitor sees is decided by api-service; these only lay out
 * the fields it returned.
 */

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
};

function AuthorRow({ author, date }: { author: PublicAuthor; date?: string }) {
  const inner = (
    <>
      <Avatar user={author} size={44} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-semibold text-ink-900">
          <span className="truncate">{displayName(author)}</span>
          {author.isVerified && <Verified />}
        </span>
        <span className="block truncate text-sm text-ink-500">
          {[author.uniqueUsername && `@${author.uniqueUsername}`, date && formatDate(date)].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
  return author.uniqueUsername ? (
    <a href={`/${author.uniqueUsername}`} className="flex items-center gap-3">{inner}</a>
  ) : (
    <div className="flex items-center gap-3">{inner}</div>
  );
}

function Counts({ items }: { items: Array<[React.ReactNode, number, string]> }) {
  return (
    <div className="mt-4 flex items-center gap-5 text-sm text-ink-500">
      {items.map(([icon, n, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5" aria-label={`${n} ${label}`}>
          {icon}
          {compactCount(n)}
        </span>
      ))}
    </div>
  );
}

export function PublicProfileCard({ profile: p }: { profile: PublicProfile }) {
  return (
    <article className="card p-6 text-center">
      <Avatar user={p} size={96} className="mx-auto" />
      <h1 className="mt-4 flex items-center justify-center gap-1.5 font-display text-2xl font-extrabold tracking-tight text-ink-900">
        {displayName(p)}
        {p.isVerified && <Verified size={20} />}
      </h1>
      <p className="mt-1 text-sm text-ink-500">@{p.uniqueUsername}</p>
      {p.role && <div className="mt-3"><RoleBadge role={p.role} /></div>}
      {(p.professionalHeadline || p.specialization) && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{p.professionalHeadline || p.specialization}</p>
      )}
      <div className="mt-5 flex justify-center gap-8 text-sm">
        <span><strong className="block font-display text-lg text-ink-900">{compactCount(p.followersCount)}</strong><span className="text-ink-500">Followers</span></span>
        <span><strong className="block font-display text-lg text-ink-900">{compactCount(p.postsCount)}</strong><span className="text-ink-500">Posts</span></span>
      </div>
      <PublicPreviewActions target={{ type: "profile", id: p.id }} appPath={`/app/profile/${p.id}`} />
    </article>
  );
}

export function PublicPostCard({ post: p }: { post: PublicPost }) {
  return (
    <article className="card p-5">
      <AuthorRow author={p.author} date={p.createdAt} />
      <div className="mt-3"><PostTypeBadge type={p.postType} /></div>
      {p.title && <h1 className="mt-3 font-display text-xl font-extrabold tracking-tight text-ink-900">{p.title}</h1>}
      {p.excerpt && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{p.excerpt}</p>}
      {p.imageUrl ? (
        <img src={p.imageUrl} alt="" className="mt-4 max-h-[480px] w-full rounded-xl object-cover" />
      ) : p.hasVideo ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink-900/[.04] px-3 py-2 text-sm text-ink-600">
          <Video size={16} /> Includes a video — open it in the app to watch.
        </p>
      ) : null}
      <Counts items={[[<Heart key="h" size={16} />, p.likesCount, "likes"], [<MessageCircle key="c" size={16} />, p.commentsCount, "comments"]]} />
      <PublicPreviewActions target={{ type: "post", id: p.id }} appPath={`/app/post/${p.id}`} />
    </article>
  );
}

export function PublicPulseCard({ pulse: p }: { pulse: PublicPulse }) {
  return (
    <article className="card p-5">
      <AuthorRow author={p.author} date={p.createdAt} />
      <div className="relative mx-auto mt-4 aspect-[9/16] max-h-[520px] overflow-hidden rounded-xl bg-ink-950">
        {p.posterUrl && <img src={p.posterUrl} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 grid place-items-center">
          {p.ready ? (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
              <Play size={26} className="ml-0.5 fill-white" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
              <Clock size={16} /> Still processing
            </span>
          )}
        </span>
      </div>
      {p.caption && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{p.caption}</p>}
      <Counts items={[[<Heart key="h" size={16} />, p.likesCount, "likes"], [<Play key="v" size={16} />, p.viewsCount, "views"]]} />
      <PublicPreviewActions target={{ type: "reel", id: p.id }} />
    </article>
  );
}

/** Rendered with HTTP 404 for anything private, removed, or never there. */
export function PublicUnavailable() {
  return (
    <article className="card p-8 text-center">
      <h1 className="font-display text-xl font-extrabold tracking-tight text-ink-900">This isn&rsquo;t available</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
        It may be private, removed, or visible only to people signed in to Orovion.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/login" className="btn-primary px-5 py-3 text-[15px]">Sign in to view</a>
        <a href="/" className="btn-outline px-5 py-3 text-[15px]">Explore Orovion</a>
      </div>
    </article>
  );
}
