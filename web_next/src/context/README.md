# src/context

React providers mounted once near the root. State that components share lives
here; the logic they call lives in `src/lib/` so it can be unit-tested without
React (see that folder's README).

| File | Owns |
|---|---|
| `AuthContext.tsx` | the signed-in user, session restore on boot, and logout |
| `AppearanceContext.tsx` | chat bubble + wallpaper choices |
| `ThemeContext.tsx` | light/dark |
| `CallContext.tsx` | the active call and its UI |

## `AuthContext` — only the refresh call may log a user out

The access token is held in memory only, so on every boot `loadSession()` calls
`dok.auth.refresh()` (cookie-based) and then `/profile/me`. The classification
rules are the load-bearing part:

- **401/403 from the refresh call → hard logout.** That is the one verdict that
  means the session is really gone.
- **Anything else from refresh → keep the session** and show the cached user
  (offline, DNS, 5xx, 429). A transient infrastructure failure must never log
  anyone out.
- **Any failure of `/profile/me` → keep the session.** The refresh already
  succeeded, so the session is valid and only that one call failed.

The 401 interceptor in `src/lib/api.ts` follows the **same** rule, and it has to:
a 401 on any authenticated call makes it refresh, and it fires `dl:auth-expired`
— handled here as a logout — if that refresh fails. It therefore only fires on a
401/403 from the refresh itself; a 500, a 429 or an offline blip rejects the
original call and leaves the session alone. The two rules must stay in step, or
the stricter one here is simply bypassed.

This used to be a single `try/catch` around both calls, so a 401/403 from
*anywhere* — a per-route permission check, a WAF, an edge rule — ran the logout
branch. That branch is destructive: it clears the tokens, the `dl_has_session`
hint and the **whole offline cache**, so a misclassification cost the user their
local data as well as their session. Keep `clearOfflineCache()` reachable only
from `hardLogout()`.

`loadSession` also runs on the `online` event. It is safe to call concurrently
because refreshing goes through `refreshOnce()` in `src/lib/api.ts`, which
single-flights within the tab and takes a `navigator.locks` lock across tabs —
necessary because the server rotates the refresh token on every use, so two
simultaneous refreshes would log the user out of a healthy session.

`dl:auth-expired` (fired by the api layer when an in-flight refresh ultimately
fails) is handled here as a logout too.
