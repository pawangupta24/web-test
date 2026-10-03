# src/app/(public)

Public share-link pages. The route group adds nothing to the URL; it lets these
pages share `layout.tsx` (brand + sign in), `not-found.tsx` (the "This isn't
available" card, HTTP 404) and `error.tsx`.

| Route | Shows |
|---|---|
| `[username]/` → `/<username>` | profile card. Uppercase or `@` → 308 to the lowercase handle; a changed username → 307 to the current one |
| `p/[id]/` → `/p/<id>` | public post (case studies, research, theses are never public) |
| `pulse/[id]/` → `/pulse/<id>` | pulse poster, "Still processing" while transcoding |
| `profile/[ref]/` → `/profile/<id or slug>` | no page: 307 to `/<username>` |

Data comes from `src/lib/publicContent.ts` (api-service `/api/public/*`), cards
from `src/components/public/`. Every page is `noindex`; its metadata is the
link-preview card.

Failure modes, on purpose:

- **Not public / missing** → `notFound()`: private, removed and never-existed
  look the same.
- **Backend down** → the page *throws*. Next keeps serving the last good copy,
  and only a first visit during the outage sees `error.tsx`. Rendering an error
  card instead would get cached as the page.

`[username]` is a dynamic **root** segment. Static routes and files in `public/`
win over it, so every root name must be reserved in api-service
(`Api_service/src/modules/profile/username.helper.js`).
