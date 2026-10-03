# Orovion — Web (Next.js)

Next.js 14 **App Router** port of the Orovion web client (migrated from the Vite SPA, which still lives in `../Orovion Frontend`). Same UI, API layer, Firebase auth, and socket.io — re-homed onto Next file-based routing in **TypeScript**.

## Quick start

```bash
npm install
cp .env.example .env.local     # set backend URL + Firebase keys
npm run dev                    # http://localhost:5173
```

`npm run build` → production build · `npm run start` → serve the build.

## How the migration maps

| Vite / React Router | Next.js |
|---|---|
| `src/main.jsx`, `index.html` | `src/app/layout.tsx` (fonts, metadata, `<Providers>`) |
| `src/App.jsx` routes | `src/app/**/page.tsx` (file-based) |
| `src/pages/*` screens | `src/screens/*` (imported by the route files; **not** `pages/`, which Next treats as the old Pages Router) |
| `<Protected>` / `<RequireProfile>` | guards inside `src/components/layout/AppLayout.tsx` |
| `react-router-dom` | `@/lib/router.tsx` — a thin shim over `next/navigation` (`useNavigate`, `Link`, `NavLink`, `useParams`, `useSearchParams`, `useLocation`, `Navigate`) so screens import it unchanged |
| `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| Vite dev proxy | `next.config.mjs` rewrites (only when `NEXT_PUBLIC_API_BASE` is blank) |

- `/` , `/login`, `/onboarding` render statically; everything under `/app/*` is `force-dynamic` (auth-gated, client-driven).
- All interactive code is marked `"use client"`.

## Admin console (secret path)

A standalone operator console (`src/screens/Admin.tsx`) is completely separate from the
product app — no link points to it, and it's `robots: noindex`. To keep it from being
guessed, it is **not** served at `/admin`:

- `src/middleware.ts` serves the console only at **`/<ADMIN_PANEL_SLUG>`** (a server-only env
  var — set it to a long random value per deployment; the real path never ships to the
  client). The literal `/admin` path is made to **404**.
- Local example: `http://localhost:5173/<your-slug>`. The default fallback slug is only for
  local dev — **override `ADMIN_PANEL_SLUG` in production.**

It has its own identity, **not** a Orovion user account:

- **Login** with the backend's `ADMIN_USERNAME` / `ADMIN_PASSWORD` (env). The backend returns
  an admin JWT pair that the client holds in `sessionStorage` via `ADMIN_TOKENS` (in
  `src/lib/api.ts`) — separate from the product user session, attached as `Authorization:
  Bearer` on `/admin/*` calls only, and auto-refreshed on 401.
- **Sections:** Overview (dashboard metrics + live online count), Users (search, block
  temporary/permanent, deactivate, permanent delete), Content (super-delete any
  post/reel/thesis/case), Verifications (doctor + student KYC), Reports, Feedback, Deletions,
  and the Audit log.
- All calls go through `dok.admin.*` in `src/lib/api.ts`. The previous `x-admin-key` shared
  secret has been removed.

## SEO & search indexing

Full playbook: **[docs/SEO.md](docs/SEO.md)** — including Google Search Console
setup and an honest account of what code can and cannot do for ranking.

- `src/lib/seo.ts` is the single source of truth — origin, default title and
  description, and a `pageMetadata()` helper that emits canonical + OpenGraph +
  Twitter tags in one call. Route files should use it rather than hand-rolling
  tags.
- `src/lib/schema.ts` builds the JSON-LD entity graph (Organization, WebSite,
  Person, FAQPage, SoftwareApplication, Breadcrumb); `src/components/seo/JsonLd.tsx`
  renders it. The Organization and WebSite blocks ship on every page.
- `/robots.txt` and `/sitemap.xml` are **generated** (`src/app/robots.ts`,
  `src/app/sitemap.ts`) — never checked-in static files, so they cannot go stale.
- `/opengraph-image` is a 1200×630 social card generated at build from
  `src/app/opengraph-image.tsx` (no binary asset to maintain). It runs on the
  **edge** runtime: `@vercel/og`'s Node build crashes during `next build` on
  Windows.
- `src/lib/faq.ts` holds the help-centre Q&A as plain data, consumed by *both*
  the accordion and the FAQPage markup — if those two ever disagree, Google
  drops the rich result.
- Indexable: `/`, `/team`, `/team/<slug>`, `/help`, `/mobile-app`, `/privacy`,
  `/terms`. Excluded via robots.txt **and** a `noindex` meta: `/app/*`,
  `/login`, `/onboarding`, `/admin`, `/api/*`.
- **Set `NEXT_PUBLIC_SITE_URL`** (defaults to `https://www.orovion.com`; `www` is
  canonical and the apex 308s to it — share links and app-link verification need
  the canonical host, see [docs/SEO.md](docs/SEO.md)). It is
  inlined at build time — set it before `npm run build`, and set it explicitly
  on preview deployments so they don't emit production canonicals.
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is optional (HTML-tag verification).

## Public share links

Shared links are `https://www.orovion.com/<username>`, `/p/<postId>` and
`/pulse/<reelId>` — built only by `src/lib/shareLinks.ts` (the app and
api-service emit the same shapes). The pages live in `src/app/(public)/`: a
signed-out visitor sees a read-only preview with **Open in the app**, **Get the
app** and **Sign up**, and link-preview cards (WhatsApp, Telegram, LinkedIn)
come from their metadata. Everything shown comes from api-service
`/api/public/*`, which decides what is public. Signed-in visitors are moved to
the full view under `/app`.

Older shapes keep working via `next.config.mjs` redirects: `/u/<name>`,
`/post|case|research|thesis/<id>` → `/p/<id>`, `/reel/<id>` → `/pulse/<id>`;
`/profile/<id or slug>` resolves to the username.

**Opening links in the app** needs two files that must answer 200 as
`application/json` with **no redirect**, on the canonical host:

- `public/.well-known/assetlinks.json` (Android) — every SHA-256 fingerprint the
  app is signed with: the release keystore's (the APK is also downloadable
  directly) **and** the Play App Signing key's from Play Console → App integrity.
  One malformed fingerprint can invalidate the whole file.
- `public/.well-known/apple-app-site-association` (iOS, no extension) — replace
  `__APPLE_TEAM_ID__` with the Apple Team ID.

Both fail silently (links just open in the browser), so after any deploy that
touches them, the domain or `next.config.mjs`, run
`node scripts/verify-deeplinks.mjs [origin] [p/<id>]`.

Env: `PUBLIC_SSR_KEY` (server-only, same value as api-service's — lets these
pages' server-side fetches skip the api's per-IP rate limit),
`NEXT_PUBLIC_PLAY_STORE_URL` / `NEXT_PUBLIC_APP_STORE_URL` (optional; "Get the
app" uses `/mobile-app` until set).

**Deploy order:** api-service with `/api/public` first. Until it is live every
preview page shows "This isn't available". **Every new root route** (anything
at `/<name>`) must also be added to api-service's reserved usernames
(`Api_service/src/modules/profile/username.helper.js`), or it could shadow — or
be shadowed by — a profile.

## Analytics — Microsoft Clarity

Heatmaps and session recordings, off by default. Set
`NEXT_PUBLIC_CLARITY_PROJECT_ID` (clarity.microsoft.com → Settings → Overview)
and **redeploy** — like every `NEXT_PUBLIC_*` value it is inlined at build time,
so setting it in Vercel alone changes nothing until the next build. Leave it
blank and the tag is never injected.

Scope is restricted on purpose, because session replay captures the DOM and
`/app/*` renders private clinician DMs, case studies, prescriptions and consult
notes:

- **Recorded:** `/` `/login` `/help` `/privacy` `/terms` `/mobile-app` `/team` `/team/*`
- **Never:** `/app/*`, `/onboarding`, `/admin` and the secret `ADMIN_PANEL_SLUG` route

The route list in `src/lib/clarity.ts` is an allowlist, so it is fail-closed — a
route added later stays untracked until it is added there. The tag also boots
cookie-less (`consentv2` with both storage types denied), so it sets no
`_clck`/`_clsk` cookies and needs no consent banner today.

Full reasoning, including why unmounting the script is *not* a sufficient guard:
`src/components/analytics/README.md`.

## Notes / TODO to tighten later

- `next.config.mjs` currently sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, and `tsconfig.json` is lenient — this kept the large JS→TS port building. Remove these and add real types incrementally.
- Backend CORS already allows any `localhost` port in dev, so the direct `NEXT_PUBLIC_API_BASE=http://localhost:5000` works. For deploys, set it to the public backend URL and add the web origin to the backend `FRONTEND_URL` + Firebase Authorized domains.
