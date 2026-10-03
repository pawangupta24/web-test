"use client";

/**
 * The backend couldn't answer. Pages throw rather than render this state, so a
 * transient outage is never cached as the page: Next keeps serving the last good
 * copy, and only a first-ever visit during the outage lands here.
 */
export default function PublicError() {
  return (
    <article className="card p-8 text-center">
      <h1 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
        We couldn&rsquo;t load this right now
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-500">Please try again in a few seconds.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className="btn-primary px-5 py-3 text-[15px]">
          Try again
        </button>
        <a href="/" className="btn-outline px-5 py-3 text-[15px]">Go to Orovion</a>
      </div>
    </article>
  );
}
