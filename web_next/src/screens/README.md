# src/screens

Full-page components. The thin files under `src/app/**/page.tsx` do nothing but
render one of these, so routing stays declarative and the screens stay testable.
Profile share links (`Profile.tsx` for your own, `UserProfile.tsx` for others)
come from `profileUrl()` in `src/lib/shareLinks.ts`: `https://www.orovion.com/<username>`.
`src/app/app/layout.tsx` is `force-dynamic`, and `AppLayout` renders
`<AppLoading />` until `AuthContext` finishes bootstrapping — so no screen mounts
before the access token has been re-minted from the refresh cookie.

## `Feed.tsx` — the home feed ("post section")

Offline-first, then live:

1. On a fresh mount the per-user IndexedDB cache paints the last-known first page
   instantly, guarded by a `settled` flag so a live response is never overwritten
   by stale cache.
2. The live request always fires and always wins; on failure the cache is the
   fallback so the feed is never empty.
3. The first page is re-cached on every successful load.

**Cache bypass.** The api-gateway caches page 1 for up to 45s, so a load has to
opt out to be genuinely fresh. `buildQuery(filter, cursor, fresh)` appends
`refresh=1` when `shouldForceFresh` says so — on a fresh mount (reload) or a
`refreshKey` bump (refresh button, pull-to-refresh, return-to-tab), but **not**
on a filter-chip switch and **never** on cursor pages. See
`src/lib/feedFreshness.ts`. Without this the refresh gestures were silently
no-ops: the flag existed server-side but nothing ever sent it.

Pagination is cursor-based via an `IntersectionObserver` sentinel; `reqSeq`
discards superseded payloads when chips are tapped quickly.

Refresh is **gesture-only** — there is deliberately no refresh button. Two
triggers funnel through `refresh()` (scroll to top → bump `refreshKey`):
pull-to-refresh and `useAutoRefresh` on tab return. The gesture works on **trackpad/wheel as well as touch** — see
`src/hooks/README.md`; before that it was touch-only and so did nothing at all in
a desktop browser. `refresh()` returns a promise resolved in the load effect's
`.finally()`, on success *and* failure, because the hook awaits it to hold the
spinner.

## `Pulses.tsx` — Pulse

A vertical, **one-reel-at-a-time** discovery feed (not a tile grid). Slides are a
native CSS scroll-snap column (`snap-y snap-mandatory`) where each slide fills the
content viewport, so exactly one reel is on screen; trackpad, touch and the arrow
keys all step one reel without a custom gesture lock. An `IntersectionObserver`
(threshold .6) picks the active slide, and **only the active slide mounts a
player** — every other slide stays a poster, so a long feed never accumulates
`<video>`/hls.js instances or fires phantom view pings.

Each slide renders `PulseCard`, shared with `PulseViewer` (the overlay opened from
the profile reels grid) so the two surfaces cannot drift apart. Engagement
overrides (`liked`/`likesCount`/`saved`/`commentsCount`) are held **here**, keyed
by reel id, so state survives scrolling away and back.

**Pagination — `cursor` is mandatory.** media-service materialises a ranked
session once and every later page is an OFFSET slice of it, but it only honours a
continuation when **both** `sessionId` *and* a non-zero `cursor` arrive
(`feedSession.service.js`). Sending `sessionId` alone makes the server discard the
session and re-serve page 1 — which the client's id-dedupe then drops, freezing
the feed on its first page forever. So continuation pages send
`sessionId` + `cursor`, and the real end-of-feed signal is `nextCursor === null`,
**not** `exhausted` (that is just `!hasMore`, already true on page 1 of a small
catalogue; it is surfaced only as a "replaying top Pulses" note).

**Reload:** gesture-first — there is no refresh button in the header.
Pull-to-refresh (touch *and* trackpad/wheel — see `src/hooks/README.md`) and
`useAutoRefresh` on tab return both call `reload()`, which clears `sessionId` +
`cursor` and starts a fresh session at slide 0. The one remaining button is the
end-of-feed CTA, which exists because the pull gesture is armed only on slide 0
and would otherwise be unreachable from the tail. Because this screen scrolls an inner element rather than the
window, it must pass `disabled` to the hook itself: the gesture is armed only on
slide 0 at `scrollTop === 0`, otherwise the hook's `preventDefault` would fight
the vertical swipe between reels. Auto-refresh is skipped unless the user is
still on slide 0, so returning to the tab never yanks them out of a deep
position. Needs no `refresh=1`: this path has no gateway cache.

## Debugging an empty feed

Both feeds fail soft, so an empty screen never tells you why. `src/lib/diagnostics.ts`
puts the reason in the console instead. Filter DevTools by `[feed]` or `[pulse]`:

- `console.error` → the request failed (status, method, url, server message; or
  `noResponse: true` when nothing came back, the offline signature).
- `console.warn` → the request *succeeded* and still produced nothing. For Pulse
  this carries `sessionId` / `nextCursor` / `exhausted`, which is what separates a
  genuinely empty catalogue from a broken continuation.

If neither line appears when a feed looks stuck, the request never fired — look at
the effect's guards rather than the network.

## `Login.tsx`

Carries `data-clarity-mask="true"` on its root. `/login` is one of the few routes
Microsoft Clarity records (`src/lib/clarity.ts`) and this screen handles email,
phone, OTP and the QR-login challenge, so masking is enforced in our code rather
than via Clarity's dashboard masking mode — which anyone with dashboard access
could flip. Masking hides content only; clicks and scroll still register, so
heatmaps are unaffected. Any new sensitive UI on a recorded route needs the same
attribute.

## Others

`Create.tsx`, `PostDetail.tsx`, `Profile.tsx`, `UserProfile.tsx`, `Explore.tsx`,
`Search.tsx`, `Messages.tsx`, `Notifications.tsx`, `Network.tsx`,
`Connections.tsx`, `Saved.tsx`, `Insights.tsx`, `Settings.tsx`, `EditProfile.tsx`,
`Onboarding.tsx`, `Login.tsx`, `Landing.tsx`, `Admin.tsx`, `HashtagWorkspace.tsx`,
`MobileAppPage.tsx`, `TeamPage.tsx`, `TeamMemberPage.tsx`, `CallDebug.tsx`,
plus `consults/` and `legal/`.

## Feed session handling (`Feed.tsx`, `Explore.tsx`)

Both screens send a feed `sessionId` (see `src/lib/feedSession.ts`) and store the
one the server returns, and **neither rotates it on refresh or reload**. The
server excludes what it already served in that session, so keeping it is what
makes a refresh surface new posts; rotating (as these screens once did) re-served
the identical top posts, because the ranking is deterministic. A refresh still
sets `refresh=1` to bypass the gateway's page cache — that is independent of the
session.

`Explore.tsx` uses the `explore` scope, never `home` — all three feed routes
share one media pipeline, so a shared session would let the two feeds hide each
other's content.

When a feed load fails and cached posts are shown instead, `Feed.tsx` says so with
a toast ("Couldn't refresh — showing saved posts"). It used to fall back silently,
which made a backend outage indistinguishable from "refresh does nothing".

`Feed.tsx` also refuses to overwrite a populated offline cache with an empty
response (`shouldWriteFeedCache`).

## Pulse posters

`pulsePoster()` (`src/lib/utils.ts`) returns `undefined` whenever a reel has no
genuine thumbnail, which is the normal case for reels uploaded via
`POST /api/reels`. Every call site therefore guards the image:

```jsx
{pulsePoster(r) && <img src={pulsePoster(r)} … />}
```

The surrounding tile is already `bg-ink-950` with a play-icon overlay, so the
guard degrades to a dark placeholder rather than a broken image. Do not
reintroduce a derived `.jpg` URL — S3 has no on-the-fly frame generation, so it
only produces failed requests.

## Chat thread ordering (`Messages.tsx`)

**chat-service returns a page of messages newest-first.** `GET /api/chat/:id/messages`
sorts by `_id` descending, pages backwards in time (`_id: { $lt: cursor }`), and
returns `nextCursor` = the oldest item on the page. api-service's proxy
(`getMessagesDecorated`) decorates each message but preserves that order.

The thread renders top-to-bottom (`msgs.map`), and every path that inserts into
`msgs` assumes the opposite — **oldest-first**:

| Path | Insert |
|---|---|
| socket `new_message` / `message_sent` (`appendToThread`) | `[...prev, m]` |
| optimistic send | `[...(m \|\| []), temp]` |
| `loadMore` (older page) | `[...older, ...prev]` |
| auto-scroll | scrolls to `endRef`, i.e. the bottom, to reach the newest |

So **every fetched page is flipped through `toAscending()`** before it reaches
state. This is not cosmetic: without it the entire thread rendered upside down,
and because the view auto-scrolls to the bottom (which was then the *oldest* end)
a just-sent message appeared to vanish on reopening the conversation — it had
moved to the top, far above the viewport.

`hasMore` and `nextCursor` are read from the raw response, never derived from the
local array, so reversing locally cannot affect pagination.

> The same endpoint has a second mode, `?sinceSeq=<n>`, which returns messages
> **ascending** with `nextSinceSeq`. This screen never sends it. Anyone adding
> delta sync must not pass that response through `toAscending()`.
