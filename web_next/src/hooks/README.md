# src/hooks

Reusable `"use client"` React hooks. Keep the *logic* framework-free in
`src/lib/` (so it can be unit-tested without a DOM) and let the hook own only the
React/DOM half — listeners, refs, effects. `usePullToRefresh` is the worked
example of that split.

## `usePullToRefresh.ts`

`usePullToRefresh(onRefresh, { threshold = 70, disabled = false })` →
`{ pull, refreshing }`, which drive `components/ui/PullToRefreshIndicator`.
`useAutoRefresh(onRefresh, { minMs, nearTopPx })` re-runs the same callback when
the user returns to the tab.

Used by the **post section** (`screens/Feed`) and the **Pulse section**
(`screens/Reels`).

**Two input paths.** Touch is a single drag settled by `touchend`. Wheel/trackpad
exists because **touch events never fire on desktop web** — without it the
gesture was dead on every non-touch device, which is why the refresh gesture
appeared to do nothing in a desktop browser. Wheel has no `wheelend`, so it
settles on an idle timer instead.

**Why a wheel pull doesn't fire by itself.** `startsNewGesture` (in
`src/lib/pullToRefresh.ts`) only arms a pull that *begins* with the surface
already at the top. A fling from further down arrives as one unbroken ~16ms
stream, so the momentum tail that hits the top is never "new" and is ignored; a
deliberate flick made after a pause is armed and counts. Any downward delta
abandons the pull immediately.

**Callers must handle two things:**

- `onRefresh` is **awaited** — the spinner holds until it settles, so return a
  promise that always resolves (Feed resolves its `pendingRefresh` in a
  `.finally()`, on success *and* failure, so the spinner can never hang).
- `atTop()` is measured on the **window**. A screen that scrolls an inner
  element instead (Reels' snap column) must pass `disabled` itself — Reels arms
  the gesture only on slide 0 at `scrollTop === 0`, otherwise the hook's
  `preventDefault` would fight the vertical swipe between reels.

## `useRingtone.ts`

Plays / stops the incoming-call ringtone for the consult call UI.
