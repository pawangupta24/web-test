# src/lib

Framework-free logic. Repo rule: anything worth unit-testing lives here rather
than inside a component, so it can be tested without React or a DOM.

## API + auth

- `api.ts` — the axios instance (`withCredentials`) and the `dok.*` endpoint map.
  The access token is held **in memory only**; the refresh token is an httpOnly
  cookie. A 401 triggers a single silent refresh-and-retry, and a hard failure
  fires `dl:auth-expired` for `AuthContext` to act on.

### Refreshing is single-flight, and the CSRF value comes from the cookie

Two rules in `api.ts` that exist because breaking either logs users out of a
healthy session:

- **`refreshOnce()` is the only way to refresh.** The server *rotates* the refresh
  token on every use and retires the old session row, so two concurrent refreshes
  mean the second is answered `401 Session not found`. Four callers can trigger one
  — `AuthContext`'s session restore, `socket.ts`, `callClient.ts` and the 401
  interceptor — so they share one in-flight promise, and `navigator.locks` serialises
  across **tabs** as well (a browser restart that reopens several tabs is the real
  case). Never call `/auth/refresh-token` directly. The request carries an explicit
  `timeout`, because the lock is held for its whole duration: without one, a single
  half-open connection stalls session restore in every other tab.
- **Only a 401/403 from the refresh itself ends the session.** The 401 interceptor
  fires `dl:auth-expired` (which makes `AuthContext` log out and drop the offline
  cache) *only* on that verdict. A 500 — including a rolled-back session rotation,
  where the old refresh token is still valid — a 429, or an offline blip rejects the
  original call and leaves the session intact. `AuthContext` applies the same rule;
  they must stay in step, or the stricter one there is bypassed.
- **`TOKENS.csrf` reads the `csrfToken` cookie first**, falling back to
  `localStorage.dl_csrf`. The server compares our header against that cookie, so
  taking the value from the cookie makes the double-submit match by construction.
  The cookie is domain-scoped and rotates with the refresh cookie; localStorage is
  scoped to one exact origin and can be cleared on its own, which produced 403s for
  anyone whose storage was wiped, who landed on the apex instead of `www`, or whose
  other tab had rotated the pair. Security is unchanged: CSRF protection comes from a
  cross-origin attacker being unable to **read** the cookie.

Every `localStorage` access here is wrapped in try/catch — it *throws* in some
privacy modes, and this code runs inside the request interceptor, so an exception
would break every request rather than just the refresh.
- `backend.ts` — picks the deployment (AWS via same-origin `proxy` rewrite, or
  Render directly) and caches the choice.
- `firebaseAuth.ts`, `qrLogin.ts`, `socketReauth.ts`, `socket.ts` — auth and
  realtime transport helpers.

`utils.ts` — `newClientId()` mints the per-message idempotency key sent as
`clientId` on a chat send or upload. `api.ts` retries once after a 401 refresh
and fails over between backends on a 5xx, so without a key one send can arrive
twice and be stored twice. One key per message; reuse it on a resend.

## Public share links

- `shareLinks.ts` — the **only** place the web builds a share URL
  (`profileUrl` → `/<username>` or `/profile/<id>`, `postUrl` → `/p/<id>`,
  `pulseUrl` → `/pulse/<id>`, all on `SITE_URL`), plus handle parsing
  (`parseHandle`: lowercase, strip `@`, flag non-canonical for a redirect) and
  opening the app (`appSchemeUrl` — id-based `orovion://` links every app build
  routes — `androidIntentUrl`, `platformFromUserAgent`, `storeUrl`).
- `shareDetect.ts` — the reverse direction: `detectShare(message)` decides
  whether a chat message is a share, and of what, so `ShareCard` renders a card
  instead of a bare link. It must recognise **every** path a share link can carry
  — `/p/<id>` (canonical post), `/pulse/<id>`, the legacy `/reel/<id>` (still in
  sent messages and in the `orovion://reel/<id>` scheme every app build emits),
  and the legacy `/post|case|research|thesis/<id>`. Missing one is silent: the
  share just shows as plain text, which is exactly how `/pulse/` and `/p/` links
  were broken before. A typed `shared_*` message whose content is a URL yields the
  id from the URL. Add a new share path here AND in `shareLinks.ts` together.
- `publicPreview.ts` — the `/api/public/*` response types and the text the
  preview pages derive from them (`displayName`, `profileDescription`,
  `postHeadline`, …), which ends up in link-preview cards.
- `publicContent.ts` — **server only**: fetches `/api/public/*` for the
  `(public)` pages with a 2.5 s timeout, sending `PUBLIC_SSR_KEY`. Never throws;
  returns `ok | notFound | error`. In `proxy` mode it calls
  `BACKEND_PROXY_TARGET`, since a server fetch can't be same-origin.

## Offline

- `offline.ts` — `swStrategyFor`, the pure mirror of `public/sw.js` routing.
  `/api`, `/auth`, `/socket.io`, `/health` and every non-GET **bypass** the
  service worker, so no shared cache can ever hold user-specific data.
- `offline-cache.ts` + `idb.ts` — the app-layer half: per-user IndexedDB payload
  cache, namespaced by user id so accounts can never read each other's data.
  Screens use it for an instant first paint while the network is in flight; the
  live response always wins.

## Feed freshness

- `feedFreshness.ts` — `shouldForceFresh(key, userIntent)` decides when a feed
  load must carry `?refresh=1` and so bypass the api-gateway's stale-while-
  revalidate cache.

  Intent-scoped rather than blanket force-fresh: a reload or an explicit refresh
  gesture must show current data, while flipping between filter chips can still
  ride the cached hero page. The last-fresh timestamps live in **module scope on
  purpose** — a hard browser reload discards the module, so the first load after
  F5 is always fresh. That is the whole mechanism behind "reload actually
  reloads". `FRESH_WINDOW_MS` (20s) matches `HOME_FEED_FRESH_MS` on the gateway so
  client and server age out together.

## Pull-to-refresh

- `pullToRefresh.ts` — the gesture maths (`damp`, `accumulate`, `shouldRefresh`,
  `startsNewGesture`) behind `src/hooks/usePullToRefresh.ts`, which owns the DOM
  half (listeners, `preventDefault`, awaiting `onRefresh`).

  Two devices feed one model. Touch has a real `touchend` to settle on; the
  trackpad/wheel path — added because **touch events never fire on desktop web,
  so the gesture was dead on every non-touch device** — has no `wheelend`, so it
  settles on an idle timer (`WHEEL_SETTLE_MS`). The important rule is
  `startsNewGesture`: a pull only counts when the gesture *begins* with the
  surface already at the top. A fling from further down the page arrives as one
  unbroken ~16ms stream, so its momentum tail slamming into the top can never
  self-trigger a refresh; a deliberate second flick, made after a pause, can.

## Analytics

- `clarity.ts` — the pure half of the Microsoft Clarity integration
  (`isTrackablePath`, `clarityInitSnippet`, `isValidProjectId`); the DOM side is
  `src/components/analytics/ClarityAnalytics.tsx`.

  The route list is an **allowlist**, not a denylist, and that is load-bearing:
  session replay captures the DOM, `/app/*` renders private clinician DMs, cases,
  prescriptions and consult notes, and the operator console lives at a
  server-only `ADMIN_PANEL_SLUG` this client code cannot know. Fail-closed means
  a route added in future is untracked until someone adds it deliberately.
  `isValidProjectId` exists because the id is interpolated into an **inline
  script tag** — a malformed env value must never become executable code.

## Feed diagnostics

- `diagnostics.ts` — `describeRequestError`, `logFeedError`, `logFeedEmpty`.

  Both feeds degrade quietly by design: a failed request falls back to cache or
  to an empty list, so the user never sees a stack trace. The cost was that "no
  posts yet", "the request 404'd", "you're offline" and "the server returned an
  empty page" all looked identical — on screen *and* in the console, because
  every path used a bare `catch {}`. These helpers make the difference visible in
  DevTools without changing what the user sees.

  Filter DevTools by `[feed]` (post feed) or `[pulse]` (Pulse). `console.error` =
  a request failed; `console.warn` = it succeeded but produced nothing to render.
  `describeRequestError` flattens an axios error to status / method / url /
  server message / `noResponse`, because logging the raw error buries exactly
  those fields; `noResponse: true` with `navigatorOffline: true` is the offline
  signature, while a real status means the server answered and refused.

## Other

`utils.ts`, `theme.ts`, `appearance.ts`, `schema.ts`, `seo.ts`, `faq.ts`,
`team.ts`, `notify.ts`, `router.tsx`, `relationships.ts`, `followBus.ts`,
`profileForms.ts`, `chatDeletedConversations.ts`, `callClient.ts`,
`webrtcService.ts`, `offline-queue.ts`, `consultations/`.

Tests live in `src/lib/__tests__/` and run under vitest (`npm test`).

## `feedSession.ts` — per-tab feed session id

The client half of media's feed-dedup contract. media keys its "already served"
set on a session id; when the client sends none it mints one and returns it, and
this module stores it in `sessionStorage` (per-tab, so two tabs get independent
served-sets) and echoes it on the next request.

**Keep the session; do not rotate it on refresh.** The server excludes everything
already served in the session, so keeping the id is what makes a refresh or a
reload return posts not yet seen. This module originally rotated on every refresh
gesture, and that made refresh visibly do nothing: the ranking is deterministic,
so an empty served-set re-serves the identical top posts in the same order. When
the whole pool has been served, the server resets the set itself and serves a
fresh page, so a kept session cannot strand the feed empty.

`rotateFeedSession(scope)` is called on **logout only** (`AuthContext`).

(The original blank-feed bug was a different thing: one literal `'default'` key
shared by every request, tab and guest, with no rescue. Per-client minted ids plus
the server's empty-pool rescue removed that.)

`home` and `explore` are separate scopes; sharing one would let each feed hide the
other's content.

Every access is guarded for SSR (no `window`) and Safari private mode (storage
throws) and degrades to `null` — the server then simply mints a new id.

## `offline-cache.ts` — `shouldWriteFeedCache`

Guards the instant offline paint: an empty feed response must never overwrite a
non-empty cached page, or a transient empty result turns into a persistently blank
feed. Empty-over-empty is fine.

## `utils.ts` — `pulsePoster`

Returns a reel's poster **only when a real image exists**, otherwise `undefined`.

It used to synthesise one by swapping the video's extension to `.jpg`. That worked
on Cloudinary, which renders a JPEG frame on demand; it does not work on S3 +
CloudFront, which serve only objects that were actually uploaded. The derived URL
pointed at a file nobody ever wrote — confirmed in production as a `404` on the
`.jpg` next to a `200` on the `.mp4` at the identical key. CloudFront reports that
as `403 AccessDenied` (the reader has no `s3:ListBucket` to distinguish missing
from forbidden), and Firefox logs it as `NS_ERROR_DOM_NETWORK_ERR`, once per reel
on screen.

**Callers must handle `undefined` by rendering a placeholder, never an `<img>`
with no `src`.** Undefined is the common case: reels created through
`POST /api/reels` have no thumbnail at all, because api's S3 upload returns no
`thumbnail_url` and media stores the resulting null verbatim. Giving them real
posters requires generating one at upload or routing reels through the video
pipeline — neither is done yet.
