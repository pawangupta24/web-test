# SEO — how it works, and how to run it

Everything on-page is code and already shipped. Everything off-page is
operational work that no amount of code can substitute for. This document
covers both, and is honest about which is which.

---

## 1. What is implemented

| Concern | File | Serves |
|---|---|---|
| Origin, titles, descriptions, canonical/OG/Twitter builder | `src/lib/seo.ts` | — |
| JSON-LD builders (Organization, WebSite, Person, FAQPage, SoftwareApplication, Breadcrumb) | `src/lib/schema.ts` | — |
| Help-centre Q&A as data (shared by the UI *and* the FAQ markup) | `src/lib/faq.ts` | — |
| `<script type="application/ld+json">` renderer | `src/components/seo/JsonLd.tsx` | — |
| Crawl rules | `src/app/robots.ts` | `/robots.txt` |
| URL index | `src/app/sitemap.ts` | `/sitemap.xml` |
| Social card, generated at build | `src/app/opengraph-image.tsx` | `/opengraph-image` |
| Site-wide tags + entity graph | `src/app/layout.tsx` | every page |
| Real 404 (not a soft 404) | `src/app/not-found.tsx` | any unknown path |
| One page per founder | `src/app/team/[slug]/page.tsx` | `/team/<slug>` |

**Indexable:** `/`, `/team`, `/team/<slug>` ×3, `/help`, `/mobile-app`,
`/privacy`, `/terms`.
**Excluded** (robots.txt *and* a `noindex` meta): `/app/*`, `/login`,
`/onboarding`, `/admin`, `/api/*`.

The admin console's real path is **deliberately absent from robots.txt** — that
file is public, so listing `ADMIN_PANEL_SLUG` there would publish the secret.
`/admin` (which already 404s) is listed instead.

`/_next/` is **not** blocked, on purpose: Google must fetch CSS and JS to render
the page, and blocking those assets hurts ranking.

---

## 2. Required configuration

```bash
# The public origin this app is served from. NOT api.orovion.com — that is the
# backend. Inlined at BUILD time, so set it before `npm run build`.
NEXT_PUBLIC_SITE_URL=https://www.orovion.com

# Optional: only if you verify Search Console with the HTML-tag method.
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<token from Search Console>
```

`NEXT_PUBLIC_SITE_URL` defaults to `https://www.orovion.com`. The canonical host
is **www**, because share links (`https://www.orovion.com/<username>`, `/p/<id>`,
`/pulse/<id>`) must match the host Android App Links and iOS Universal Links
verify, and that verification fails if the host answers with a redirect. So in
Vercel `www.orovion.com` is the primary domain and the apex `orovion.com`
308-redirects to it — the existing setup, unchanged.

**If you ever make the apex canonical instead:** flip the two domains in Vercel
(apex primary, `www` → 308 → apex), set `NEXT_PUBLIC_SITE_URL=https://orovion.com`,
rebuild, change `PUBLIC_WEB_URL` on the EC2, change `AppConfig.appDomain` and the
App Links `android:host` in the app, ship a new app build, and add the apex as a
Search Console property. The redirects carry ranking over either way.

**Set it explicitly on preview deployments** — otherwise a preview emits
canonical tags pointing at production, which asks Google to drop the preview's
own URLs (usually harmless, occasionally not).

---

## 3. Google Search Console — setup

1. <https://search.google.com/search-console> → **Add property**.
2. Choose **Domain** (covers every subdomain + both protocols) and verify with
   the DNS TXT record. Prefer this over the URL-prefix method.
   *If you cannot edit DNS*, use **URL prefix** → **HTML tag**, and put the
   token in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, then rebuild and redeploy.
3. **Sitemaps** → submit `sitemap.xml`.
4. **URL Inspection** → paste `https://www.orovion.com/` → **Request indexing**.
   Repeat for `/team` and `/mobile-app`. This is the fastest path to a first
   crawl; the rest follow from internal links.
5. Wait. First indexing is typically 2–14 days for a new domain. There is no
   way to buy or force this.

Also worth 10 minutes: **Bing Webmaster Tools** — it can import directly from
Search Console, and it feeds ChatGPT search and DuckDuckGo.

### Verify the deployed output

```bash
curl -s https://www.orovion.com/robots.txt
curl -s https://www.orovion.com/sitemap.xml | head -20
```

- Rich results: <https://search.google.com/test/rich-results>
- Schema graph: <https://validator.schema.org/>
- Social card: paste a URL into <https://www.linkedin.com/post-inspector/>

---

## 4. Ranking for "orovion" — the realistic goal

This is achievable and mostly already done. Google needs to believe the domain
*is* the brand entity. The signals it uses, and where they come from:

| Signal | Status |
|---|---|
| `Organization` JSON-LD with `sameAs` → official profiles | ✅ shipped (`src/lib/schema.ts`) |
| Consistent brand name in `<title>` on every page | ✅ shipped |
| Founders as `Person` entities linked back to the Organization | ✅ shipped |
| Multiple crawlable pages with real content | ✅ 8 pages |
| **The social profiles link back to www.orovion.com** | ⬜ **check each one** |
| **A Wikidata entry** | ⬜ the single biggest Knowledge Panel lever |
| **Press / directory mentions** (Crunchbase, LinkedIn company page, ProductHunt, AngelList) | ⬜ manual |
| **Anyone actually searching for "orovion"** | ⬜ earned |

The three unchecked rows are the whole job now, and none of them are code.

---

## 5. Google autocomplete — the honest answer

**You cannot make Orovion appear under `o`, `or`, or `oro` by writing code.**

Autocomplete is generated from *aggregate real search volume*, personalised by
location and history. There is no markup, meta tag, schema, submission form, or
setting that influences it. `o` and `or` are among the most contested prefixes
on the internet (Outlook, Oracle, Orange…) — a pre-revenue brand will not hold
them, and pursuing it is wasted effort.

What is realistically winnable, in order:

1. **`orovion` → your site is result #1.** Already engineered; needs indexing.
2. **`orovion` shows sitelinks** (sub-links to /team, /help). Google grants
   these automatically once site structure is clear — the sitemap, breadcrumbs
   and internal links here are what it reads.
3. **`orovion` shows a Knowledge Panel.** Needs the Wikidata entry + consistent
   `sameAs` profiles above.
4. **`orovion app`, `orovion login`, `orovion healthcare` autocomplete.** These
   appear once enough real people search them — driven by users, not SEO.

Anyone who tells you they can buy autocomplete placement is describing search
manipulation, which Google actively penalises.

---

## 6. Known gaps / follow-ups

- **Logo is an SVG.** `Organization.logo` points at
  `/brand/wordmark-primary.svg`; Google's logo guidelines don't officially
  support SVG. Adding a 512×512 PNG and repointing it is a 2-line change.
- **No `SearchAction` markup.** That declares a *public* search results URL, and
  Orovion's search is at `/app/search` behind auth. Add it only if a public,
  crawlable search page ever ships — claiming one that 302s to a login is a
  false signal.
- **`/team` duplicates the founder pages.** The list page renders all three full
  stories, and each `/team/<slug>` renders one. Google handles hub+detail fine,
  but the member pages will rank better if `/team` is trimmed to summaries
  (name, role, tagline, "read more") and the full story lives only on the
  member page. Recommended, not urgent.
- **`SoftwareApplication` has no `offers` or `downloadUrl`.** Intentional — the
  store listings aren't live. Add both when they are; never add
  `aggregateRating` without real ratings (that earns a manual action).
- **No blog / content surface.** Ranking for non-brand terms
  ("medical case discussion platform", "network for doctors") needs written
  content that answers those queries. Eight marketing pages will not do it.
- **`next.config.mjs` ignores TS + ESLint errors.** Unrelated to SEO, but it
  means a green build does not mean correct types.
