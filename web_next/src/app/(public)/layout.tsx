import { Logo } from "@/components/ui/Primitives";

/**
 * Chrome for the public share-link pages (/<username>, /p/<id>, /pulse/<id>,
 * /profile/<ref>). The route group adds nothing to the URL; it only lets these
 * pages share this layout, the 404 card and the error boundary.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-900/[.06] bg-surface">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <a href="/" aria-label="Orovion home" className="flex items-center">
            <Logo size={26} />
          </a>
          <a href="/login" className="btn-outline px-4 py-2 text-sm">Sign in</a>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">{children}</main>
    </div>
  );
}
