# scripts

- `verify-deeplinks.mjs` — checks what Android and iOS check before opening
  `www.orovion.com` links in the app: both `.well-known` files answer 200 as
  `application/json` with no redirect, `assetlinks.json` names
  `com.orovion.app` with well-formed SHA-256 fingerprints, the AASA file has a
  real Team ID, the apex `orovion.com` redirects to `www`, and (optionally) a live share page
  carries `og:title`. Exits 1 on any failure.

  ```bash
  node scripts/verify-deeplinks.mjs                              # https://www.orovion.com
  node scripts/verify-deeplinks.mjs https://www.orovion.com p/<id>
  ```

  Both platforms fail silently — a broken file just opens links in the browser —
  so run it after any deploy touching the domain, `public/.well-known/` or
  `next.config.mjs`.
