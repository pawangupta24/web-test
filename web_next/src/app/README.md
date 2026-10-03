# src/app

Next.js **App Router** tree. Route files are deliberately thin: each
`**/page.tsx` renders a component from `src/screens/`, so page logic is testable
and lives outside the router. See the root `CLAUDE.md`.

## Rendering modes

| Area | Mode |
|---|---|
| `/`, `/login`, `/onboarding`, `/help`, `/privacy`, `/terms`, `/team`, `/mobile-app` | static |
| `/app/*` | auth-gated + `force-dynamic` (set once in `app/layout.tsx`, which wraps children in `AppLayout`) |
| `/admin` | reachable only via the secret `ADMIN_PANEL_SLUG`; the literal `/admin` path 404s (see `src/middleware.ts`) |
| `/<username>`, `/p/<id>`, `/pulse/<id>`, `/profile/<ref>` | public share-link previews in the `(public)` route group — server-rendered on demand, `noindex` (see `(public)/README.md`) |

**Every new root route must be added to api-service's reserved usernames**
(`Api_service/src/modules/profile/username.helper.js`). `(public)/[username]` is
a dynamic root segment: static routes win over it, so an unreserved name could
leave a user whose profile link opens the wrong page.

## `layout.tsx` — the root document

Holds site-wide `metadata` (OG, Twitter, robots, optional Google verification),
`viewport` themeColor, the font preconnects, and the site-wide JSON-LD entity
graph.

Two inline scripts run before paint, on purpose:

- **`noFlashTheme`** — applies the stored `dl_theme` and the cached
  `dl_appearance_css` override stylesheet before first paint, so a dark-mode
  reload never flashes white. Keep it in sync with `src/lib/theme.ts` and
  `src/lib/appearance.ts`.
- **`<ClarityAnalytics />`** — Microsoft Clarity, mounted after `<Providers>`.
  It is a no-op unless `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set, and it records
  **public routes only** — never `/app/*`, `/onboarding` or the admin console.
  Details and the reasoning in `src/components/analytics/README.md`; the route
  allowlist is `src/lib/clarity.ts`.

`providers.tsx` is the client boundary: theme → appearance → toast → auth → call
providers, plus the service-worker and offline-sync mounts.
