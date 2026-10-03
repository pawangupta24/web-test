# src/lib/__tests__

Vitest unit tests for the framework-free logic in `src/lib/` (`npm test`).
Node environment, no DOM; `@` resolves to `src/`.

Session:

- `api.session.test.ts` — where the CSRF value is read from (the `csrfToken` cookie
  first, `localStorage.dl_csrf` as a fallback) and that `refreshOnce()` coalesces
  concurrent refreshes. Both guard real logout bugs: the server rotates the refresh
  token on every use, so racing refreshes kill a healthy session, and a localStorage-
  only CSRF read 403s whenever storage and cookie disagree. The `node` environment
  has no `document`/`localStorage`, which is also the condition the guards in
  `api.ts` must survive — the tests stub both globals per case.

Share links:

- `shareDetect.test.ts` — which chat messages render as share cards. Guards three
  real bugs: `/pulse/<id>` links (and the canonical `/p/<id>` post link) were not
  recognised and showed as plain text, and a typed share carrying a URL was looked
  up by the whole URL. Also pins that `/pulses/…` is not mistaken for `/pulse/…`.

- `shareLinks.test.ts` — URL shapes, handle parsing and canonical redirects,
  Android intent / scheme links, platform detection.
- `publicPreview.test.ts` — the titles and descriptions that end up in
  link-preview cards.
- `publicContent.test.ts` — the server fetch maps 200 / 404 / 5xx / timeout to
  `ok` / `notFound` / `error` and never throws, and sends `PUBLIC_SSR_KEY`.
  React's `cache()` is mocked: it only exists in the server build Next bundles.

`qrLogin.test.ts` has two stale expectations: `qrDeepLink` now appends
`&platform=web`, and the test predates that.
