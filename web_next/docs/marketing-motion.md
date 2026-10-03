# Marketing pages: layout & motion system

Applies to the public site only: `/`, `/contact`, `/team`, `/team/[slug]`,
`/mobile-app`, `/help`, `/privacy`, `/terms`. The logged-in app (`/app/*`) keeps
its own 150–340ms motion rules from `DESIGN.md`/`PRODUCT.md`.

The values below were measured from a reference site in a real browser (WAAPI
timings, per-frame sampling) and rebuilt on Orovion's design tokens.

## Where things live

| Piece | File |
|---|---|
| Motion tokens, classes (`mk-*`, `t-*`, `pill`, `ul-wipe`, `link-u`, …) | `src/app/globals.css` (section "Marketing pages") |
| Breakpoints `tab` 810 / `desk` 1200 / `wide` 1600, easing utilities | `tailwind.config.js` |
| Pure math (parallax, nav swap, thread drawing, scroll text, toggle state, smoothing) — unit-tested | `src/lib/motion.ts` |
| Copy, numbers, people, photos (placeholders) | `src/lib/marketing.ts` → see `docs/marketing-placeholders.md` |
| Contact form options + `mailto:` builder — unit-tested | `src/lib/contact.ts` |
| Components | `src/components/marketing/` (see its README) |

## Tokens

| Token | Value | Used for |
|---|---|---|
| `--ease-load` | `cubic-bezier(.2,0,.2,1)` | page-load entrances (1s) |
| `--ease-reveal` | `cubic-bezier(.44,0,.56,1)` | scroll reveals (0.8s), focus (0.3s), link underline (0.4s), menu close |
| `--ease-spring` | `linear(…)` sampled spring, fallback `cubic-bezier(.3,.525,.05,1)` | hovers 0.4/0.6s, FAQ 0.8s, button states, menu open |

Tailwind: `ease-load`, `ease-reveal`, `ease-spring`.

## Inventory

| Element | Trigger | Motion | Duration / delay | Breakpoints |
|---|---|---|---|---|
| Logo | load | fade + rise 20px | 1s, 0.2s | desktop only |
| Nav links | load | fade + rise 20px | 1s, 0.4 → 0.8s (+0.1 each) | desktop only |
| Theme toggle + CTA | load | fade + rise 20px | 1s, 0.9s | desktop only |
| Page eyebrow | load | fade + **drop** from −20px | 1s, 0.4s | desktop only |
| H1 | load | fade + rise 20px | 1s, 0.4s | desktop only |
| Intro paragraph | load | fade + rise 20px | 1s, 0.6s | desktop only |
| Right column (form / photo) | load | fade only | 1s, 0.6s | desktop only |
| Trust block / floating cards | load | fade + rise 20px | 1s, 0.8 / 1.0s | desktop only |
| Everything with `.mk-reveal` | enters viewport | opacity 0 → 1 | 0.8s | all |
| `.mk-reveal` | leaves viewport | snaps to 0 (replays on re-entry) | instant | all |
| Smooth scroll (Lenis) | wheel | `duration: 2` | — | desktop only |
| Progressive blur strip | static, 220px | 8 backdrop-blur layers 0.16 → 20px | — | desktop only |
| Sticky columns | scroll | `position: sticky; top: 160px` | — | tablet + desktop |
| Footer scene parallax | scroll | `translateY` 0 → 320px (tablet 160) | linear | tablet + desktop |
| Nav → white over dark blocks | a `data-nav-dark="true"` block (footer, home hero stage, big quote) spans the 44px line | colors/logo crossfade | 0.5s | desktop only |
| Pill button | hover | label +28px, right dot out, left dot in | 0.6s spring | pointer devices |
| Pill button | submit | right dot → 31px disc with spinner | 0.6s; spin 1s linear | all |
| Nav / sitemap link | hover | 1px underline wipes in from left, out to right | 0.4s spring | pointer devices |
| Inline text link | hover | underline fades in, offset 8px → 5px | 0.4s | all |
| Social icon | hover | opacity → 0.5 | 0.6s spring | pointer devices |
| FAQ card | click | height, answer fade, icon −135° | 0.8s spring | all |
| Form field | focus | underline → solid ink-600 | 0.3s | all |
| Checkbox | check | fill + tick fade | 0.3s | all |
| Mobile menu | open | sheet drops (0.6s spring) → content fades in (+0.2s) → links rise one by one (0.4 → 0.9s, 1s each) | — | tablet + phone |
| Mobile menu | close | content fades (0.6s) → sheet lifts after 0.2s | — | tablet + phone |

## Home page (`/`)

Section order follows the reference home page: hero → trust toggle →
services → philosophy → story → how it works → ready → statement + big quote
→ story → community → numbers → FAQ → contact. Components live in
`src/components/marketing/home/`; copy and photos come from `HOME` in
`src/lib/marketing.ts`.

Scroll-linked values are written straight to the DOM from one rAF-throttled
scroll frame (`useScrollFrame`). React never re-renders per frame; only the
toggle's three states go through React state.

| Element | Trigger | Motion | Duration / easing | Breakpoints |
|---|---|---|---|---|
| Hero stage (backdrop, circles, portrait, grain) | load | fade in | 2s `cubic-bezier(.4,0,.2,1)` | all |
| Hero stage | scroll | pinned (`sticky`) behind the hero and the toggle | — | all |
| Portrait | scroll | opacity 1 → 0 over the hero's height, uncovering the brand backdrop | linear | all |
| Headline | load | word by word: blur 10px → 0, rise 10px, fade | 1.6s `--ease-reveal`, from 0.2s, +0.1s per word | all |
| Headline letters | hover | letter fill — see "Letter fill" below | 0.45s | mouse/trackpad |
| Paragraph / CTA | load | fade + drop from −20px / fade + rise 20px | 1s, 0.4s | desktop only |
| Paragraph + CTA | scroll | lag the page (move at 70% speed) | — | desktop |
| Hero thread | scroll | two strokes draw (`stroke-dashoffset` 1 → 0) from "box top at 50% of the screen" to "box bottom at 50%"; smoothed (τ 150ms) | — | tablet + desktop |
| Hero thread | load / toggle wakes / back to start | fade in / out / in | 2s after 0.4s / 0.8s / 1.2s `cubic-bezier(.6,0,.4,1)` | tablet + desktop |
| Trust toggle | a marker crosses mid-screen | 2px dot → switch "off" → "on": track grows, knob 58 → 88 → 112px | 1.2s spring (track color 0.8s) | all |
| Hero stage | toggle on / off | fades out; the nav returns to its normal colors | 1.2s / 0.8s spring | all |
| Toggle copy | toggle on | "before" fades out; "after" fades in | 0.3s; 0.6s after 0.4s, `--ease-reveal` | all |
| Service card photos | scroll | layer 200px taller than the card, `translateY` −200 → 0 while the card crosses the screen | linear | all |
| Service card | hover | "Read more" + dot fade in | 0.6s spring | pointer devices |
| Philosophy text | scroll | words light up 0.2 → 1 in reading order as the block rises from the screen bottom to 25% from the top; smoothed (τ 90ms) | — | all |
| Story photos | scroll | main photo parallax 120px, inset 80px | linear | all |
| Thread waves (fixed layer) | scroll | fade in as How It Works enters, out as the big quote enters | linear | all |
| How It Works number | scroll | sticky "0" + a rolling digit; the last step whose top passed 60% of the screen sets it | 0.8s `cubic-bezier(.6,0,.4,1)` | tablet + desktop (phones show inline numbers) |
| Big quote | scroll | dome reveal `clip-path: ellipse(rx 100% at 50% 100%)`, rx = 60% + 200%·t² while its top moves from the screen bottom to the top; photo parallax 300px; thread draws | linear | all (thread tablet + desktop) |
| Community photos | hover | scale 1 → 1.06 | 1.2s spring | pointer devices |
| Numbers | enters viewport | count up | 1.6s | all |

Building blocks: `ScrollThread` draws any SVG paths on scroll. It uses
`pathLength={1}`, so dash values are 0–1 whatever the path length; give it
new `d` strings to change a thread's shape. `ParallaxImage` takes
`intensity` in px. `BlurWords` and `ScrollWords` handle the two text effects.
The reference drives its hero thread with GSAP ScrollTrigger (scrub 0.5).
Here the same curve comes from the exponential smoothing in `smoothToward`,
so no GSAP dependency is needed.

## Cursor

Measured from a second reference site and rebuilt on Orovion's tokens.

- **Where it runs:** devices with a mouse or trackpad only (`(hover: hover) and
  (pointer: fine)`). It is off under reduced motion.
- **Scope:** `MarketingShell` mounts it, so `/app` and `/login` keep the
  native cursor.
- **Code:** `src/components/marketing/Cursor.tsx`; the springs and frame math
  are in `src/lib/motion.ts` (unit-tested).

| Part | Behavior | Values |
|---|---|---|
| Dot | pinned to the pointer | 4px, `--tx-brand-600`, 1px ring in the page color (so it reads on brand fills) |
| Water blob | an irregular outline that never stops changing shape; trails the pointer and inverts what it passes over (`mix-blend-mode: difference`); plain white over `data-nav-dark` blocks | ~36px, 1px line; 6 points whose radii follow layered sines (periods 1.6–4.2s, golden-angle phases) ±20%; follow spring 220 / 26 / mass 0.6, so no overshoot and ~90% of a jump in 0.26s |
| Blob in motion | stretches along its direction of travel (area kept), gets more irregular (up to ±34%), jiggles once it stops | stretch up to +35%: `0.35 · (1 − e^(−speed/1500))`; wobble spring 260 / 14 |
| Blob over a link or button | grows | ×1.5; shape spring 380 / 26 (~6% bounce) |
| Snap (text links, buttons) | glides to the element's center and becomes a frame around it; the blob shrinks to ×0.4 and fades | 5px outside every edge, radius = element radius + 5 (at most a pill); shape spring |
| Snap target resizes (FAQ card opening) | the frame follows, even with a still pointer | ResizeObserver |
| Label (cards) | brand pill 20px right of and below the pointer | scale 0.4 → 1 + fade; shape spring |
| Text fields | the custom cursor steps aside; the native I-beam shows | — |
| Pointer leaves the window | fades out, back in on the next move | 0.3s |

Which mode an element gets:

- **Snap by default:** `.pill`, `.ul-wipe`, `.link-u`, `.soc`, `.chip` and
  `.mk-snap`. Use `.mk-snap` for components that only take a `className`,
  such as `ThemeToggle`.
- **`data-cursor="snap"`:** frames that element, e.g. a whole FAQ card or team
  row. A snap-styled control inside it keeps its own frame.
- **`data-cursor="<Text>"`:** shows that label. Current labels: service
  cards "Explore", community posts "Read", team cards "View".
- **`data-cursor="native"`:** hides the custom cursor over that area.
- **Any other link or button:** the ring grows.

## Letter fill

After the "b" reference wordmark. While the pointer is over a letter of a
heading or other big text, color rises inside that letter from the bottom
(0.45s, `cubic-bezier(.22,1,.36,1)`). It drains when the pointer leaves.
Mouse and trackpad only: touch screens keep plain text.

- **Where:** every `Display` heading, plus the hero headline, the
  trust-toggle text, the big quote and its statement heading, How It Works
  (title and step titles), the Philosophy text, the service card titles and
  the footer heading. Numbers that count up are left out.
- **How:** `FillText` (in `Type.tsx`) splits text into plain inline letter
  spans, so words keep their kerning, and gives screen readers the sentence
  once. Each letter paints two text-clipped backgrounds: the fill over its
  own color (`currentColor`).
- **Colors:**

  | Text | Fill |
  |---|---|
  | ink text | `--brand-500` (`--brand-400` in dark mode) |
  | teal accent words (`<Accent>`, `.mk-accent`) | `--ink-900` |
  | on always-dark blocks (`data-nav-dark`, `.mk-on-dark`) | `--brand-400`; accent words fill white |

- **New big text:** wrap it in `<FillText>`. It only splits text-level
  content; a heading containing a link is left as is.

## Using it on a new section

```tsx
import { Accent, Display, Eyebrow, enter } from "@/components/marketing/Type";

const e = enter(0.4);                     // load entrance, desktop only
<Display as="h1" className={e.className} style={e.style}>Title <Accent>accent.</Accent></Display>

<p className="mk-reveal t-body text-ink-600">Fades in on scroll.</p>
<div className="mk-split">…left…/…right…</div>   // 6/1/5 desktop, 3/1/4 tablet, stacked phone
<section className="mk-section">…</section>      // 160 / 120 / 80px vertical rhythm
```

## Accessibility

- `prefers-reduced-motion: reduce` → no Lenis, no load entrances, no parallax,
  reveals shown immediately (plus the global reduced-motion rule).
- Reveals only hide content when JS runs (the `.js` class is set pre-paint).
- FAQ items are real buttons with `aria-expanded`/`aria-controls`; the mobile
  menu is `inert` when closed, locks scroll, closes on Esc and restores focus.
- Form fields have visually hidden labels; focus is visible on every control.
- Cursor: decorative only. Its layers are `aria-hidden` and never take
  pointer events. Keyboard focus rings are unchanged, and it is off for touch
  input and reduced motion.
- Home: under reduced motion, threads are drawn in full, every word is visible,
  and there is no parallax or copy lag; the toggle still switches instantly.
  `ScrollWords` keeps a screen-reader copy of the full sentence (the lit-up
  word spans are `aria-hidden`). The toggle is a real link to `#verified-on`,
  and threads and waves are `aria-hidden`.
