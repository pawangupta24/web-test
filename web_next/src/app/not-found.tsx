import { SITE_NAME } from "@/lib/seo";

/**
 * Global 404.
 *
 * Next serves this with a real HTTP 404 status, which is the signal crawlers
 * act on — that is what prevents a "soft 404" (a 200 response showing an error),
 * which Google reports as a coverage problem. A `robots` meta tag is not used
 * because Next's Metadata API is not supported in `not-found.tsx`; the status
 * code is both sufficient and stronger.
 *
 * Server component with plain anchors — no client hooks, so it renders even
 * when the failing route is outside the app shell.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-6">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-6xl font-extrabold tracking-tight text-brand-700">404</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          This page doesn&rsquo;t exist
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
          The link may be broken, or the page may have moved. Everything else on {SITE_NAME} is still where you left it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/" className="btn-primary px-5 py-3 text-[15px]">Back to home</a>
          <a href="/help" className="btn-outline px-5 py-3 text-[15px]">Visit the help center</a>
        </div>
      </div>
    </main>
  );
}
