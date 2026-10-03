# src/components/analytics

Third-party analytics tags. Not to be confused with `src/features/analytics/`,
which is Orovion's **own** admin analytics dashboard backed by
`/admin/analytics/*`.

## `ClarityAnalytics.tsx` — Microsoft Clarity

Heatmaps and session recordings. Mounted once in `src/app/layout.tsx`; the pure
half (route allowlist, snippet, id validation) is `src/lib/clarity.ts` and is
unit-tested in `src/lib/__tests__/clarity.test.ts`.

Renders nothing unless `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set, so local dev and
any deployment without the var are untracked. The value is inlined at **build**
time — setting it in Vercel requires a redeploy before data appears.

### Scope is deliberately narrow

| | Routes |
|---|---|
| **Recorded** | `/` `/login` `/help` `/privacy` `/terms` `/mobile-app` `/team` `/team/*` |
| **Never** | `/app/*`, `/onboarding`, `/admin`, and the secret `ADMIN_PANEL_SLUG` route |

Session replay captures the DOM, and `/app/*` renders private clinician DMs,
case studies, prescriptions and consult notes. The list in `src/lib/clarity.ts`
is an **allowlist**, so it is fail-closed: a route added in future is untracked
until someone deliberately adds it. That also covers the operator console, whose
slug is server-only and therefore unknowable to client code — a denylist could
not have named it.

### Two things that are easy to get wrong

**Mounting is not a guard.** Clarity's tag hooks the History API and keeps
recording across client-side navigation; unmounting the `<Script>` does not
unload it. A visitor landing on `/` and then opening `/app/messages` would still
be recorded. The real guard is the explicit `clarity("stop")` on navigation away
from a public route (and `clarity("start")` on the way back). Don't "simplify"
that away.

**Calls before load are safe.** The inline snippet installs a queueing stub, so a
`stop` fired during a fast navigation is replayed in order once the tag boots.

### Masking

`/login` is recorded, and it handles email, phone, OTP and the QR-login
challenge — so `src/screens/Login.tsx` carries `data-clarity-mask="true"` on its
root. Masking lives in our code rather than Clarity's dashboard masking mode,
which anyone with dashboard access could flip. Masking hides content only; clicks
and scroll still register, so heatmaps are unaffected.

Any future sensitive UI on a **recorded** route needs the same attribute.

### Consent

The tag boots cookie-less: `clarity("consentv2", { ad_Storage: "denied",
analytics_Storage: "denied" })` runs immediately, so no `_clck`/`_clsk` cookies
are set and no cookie banner is required today. If a banner is added later, grant
those from it.
