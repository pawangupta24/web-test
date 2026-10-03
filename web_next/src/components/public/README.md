# src/components/public

What a signed-out visitor sees behind a share link. Used only by the pages in
`src/app/(public)/`.

- `PublicPreview.tsx` — **server** components: `PublicProfileCard`,
  `PublicPostCard`, `PublicPulseCard` and `PublicUnavailable` (the 404 card).
  They only lay out what api-service `/api/public/*` returned; the rules for what
  is public live in api-service, not here. A pulse shows its poster, never a
  player.
- `PublicPreviewActions.tsx` — the one client piece: **Open in the app** (phones
  only: an Android intent link with a store fallback, the `orovion://` scheme on
  iOS), **Get the app**, **Sign up**. It never hands off automatically — that
  loops when the app isn't installed. A signed-in visitor is moved to the full
  view under `/app` via the session `AuthProvider` already restores.
