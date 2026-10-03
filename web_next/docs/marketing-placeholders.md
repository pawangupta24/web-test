# Marketing placeholder content — replace before launch

Everything below is illustrative. Nothing here is real data about Orovion's
users, ratings or numbers.

## Copy & numbers (`src/lib/marketing.ts`)

| Constant | What it is |
|---|---|
| `TRUST` | "Trusted by 12,000+ healthcare professionals", "+12k" badge, "Rated 4.9 out of 5" (home "Ready" block, `/contact`) |
| `STATS` | 12,000+ clinicians, 40+ specialties, 180k case discussions, 24/7 consults (home "Numbers" band) |
| `HOME.stories` | two short stories — "Dr. Ananya Mehra" and "Meera" are invented people |
| `HOME.quote` | quote from "Dr. Arjun Malhotra" — invented person |
| `HOME.community.posts` | three sample posts — titles and teasers are invented; they link to the feed, not to real posts |
| `HOME.hero`, `.trust`, `.services`, `.philosophy`, `.how` (`STEPS`), `.ready`, `.statement`, `.numbers` | product copy — adjust to taste |

The home page (`/`) reads everything from `HOME`; section order and motion
are described in `docs/marketing-motion.md` ("Home page").

Only show ratings, counts and quotes you can substantiate.

Real data already in use: contact email/phone/address (`src/lib/contact.ts`),
social links (`SOCIALS`), the team (`src/lib/team.ts`), FAQ answers
(`src/lib/faq.ts`).

## Photos (`/public/marketing`)

Free images from Unsplash (Unsplash License — free for commercial use, no
attribution required). Swap any file by keeping the same name, or change the
path in `src/lib/marketing.ts`.

| File | Used for | Unsplash photo id |
|---|---|---|
| `hero-portrait.jpg` | home hero, tablet + desktop (2400×1600) | 1614608682850-e0d6ed316d47 |
| `hero-portrait-tall.jpg` | home hero on phones (1000×1700, same photo) | 1614608682850-e0d6ed316d47 |
| `service-cases.jpg` | "Clinical Cases" card | 1550831107-1553da8c8464 |
| `service-pulses.jpg` | "Medical Pulses" card | 1576086213369-97a306d36557 |
| `service-research.jpg` | "Research & Thesis" card | 1559757175-5700dde675bc |
| `service-consults.jpg` | "Private Consults" card | 1576091160399-112ba8d25d1d |
| `story-a-main.jpg` | first story, large photo | 1666214280557-f1b5022eb634 |
| `story-a-detail.jpg` | first story, inset photo | 1612531386530-97286d97c2d2 |
| `story-b-main.jpg` | second story, large photo | 1584515933487-779824d29309 |
| `story-b-detail.jpg` | second story, inset photo | 1631815588090-d4bfec5b1ccb |
| `quote-theatre.jpg` | big quote (full-bleed, dome reveal) | 1504813184591-01572f98c85f |
| `journal-heart.jpg` | community post 1 | 1530026405186-ed1f139313f8 |
| `journal-brain.jpg` | community post 2 | 1559757148-5c350d0d3c56 |
| `journal-lab.jpg` | community post 3 | 1581594693702-fbdc51b2763b |
| `avatar-1.jpg` … `avatar-5.jpg` | avatar stacks (`TRUST_AVATARS`) | in order: 1438761681033-6461ffad8d80, 1500648767791-00dcc994a43e, 1494790108377-be9c29b29330, 1507003211169-0a1dd7228f2d, 1580489944761-15a19d654956 |
| `avatar-6.jpg` … `avatar-8.jpg` | **unused** — safe to delete | 1506794778202-cad84cf45f1d, 1544005313-94ddf0286df2, 1472099645785-5658abf4ff4e |

(Each id resolves as `https://images.unsplash.com/photo-<id>`.)

Recommended replacements — real (consented) photos of Orovion clinicians and
users, at least:

- **Hero:** 2400×1600 landscape with the person in the right half. From
  tablet up the photo covers the right ~80% and fades out to the left under
  the headline. Also supply a 1000×1700 portrait crop for phones.
- **Service cards:** 1000×1100. The card shows a moving window of the photo,
  so leave headroom above and below the subject.
- **Stories:** 1400×1600 for the main photo and 900×1100 for the inset.
- **Big quote:** 2400×1500, darkened under the white quote text.
- **Community:** 1000×1000. These are cropped to soft blob shapes, so keep the
  subject centered.
- **Avatars:** 192×192 square.

## Form

`/contact` opens the visitor's email app pre-filled to `hello@orovion.com`
(no public contact API exists). When a backend endpoint is added, replace the
`window.location.href = buildContactMailto(...)` hand-off in
`src/components/marketing/ContactForm.tsx` with a `dok.*` call; the button
already has `loading` / `success` states.

Also ask the API team to add **`contact`** to the reserved-usernames list —
`/contact` now shadows a profile with that username (same as `/help`, `/team`).
