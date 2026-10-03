# components/marketing

Building blocks for the public marketing pages. Motion spec and inventory:
`docs/marketing-motion.md`. Placeholder content: `docs/marketing-placeholders.md`.

| Component | Role |
|---|---|
| `MarketingShell` | Page frame: skip link, `MotionRoot`, `BlurGradient`, `SiteNav`, `<main>`, `SiteFooter`. Wrap every public page in it. |
| `MotionRoot` | Lenis smooth scroll (desktop, not under reduced motion) and the shared `.mk-reveal` IntersectionObserver. Renders nothing. |
| `Cursor` | Custom cursor (mouse/trackpad only): dot + trailing ring, a frame that snaps around text links and buttons, label pills over cards. Modes come from `data-cursor` (see Rules). |
| `BlurGradient` | 220px progressive blur under the transparent desktop nav. |
| `SiteNav` / `MobileMenu` | Fixed nav (load stagger, white over the footer) and the full-screen tablet/phone menu. |
| `SiteFooter` / `FooterBackdrop` | Full-viewport footer on the parallax brand scene. |
| `PillButton` | Dot-swap pill (`variant` brand/light, `state` idle/loading/success). Link or button. |
| `Type` | `Eyebrow`, `Display`, `Accent`, and `enter(delay, from)` for load entrances. |
| `Links` | `WipeLink` (underline wipe) and `SocialLinks`. |
| `Trust` | `AvatarStack` and `TrustBlock` (label, faces, rating). |
| `Accordion` / `FaqSection` | FAQ cards and the two-column FAQ band. |
| `ContactForm` | The `/contact` form (mailto hand-off). |
| `ContactSection` | Contact block: intro, sticky trust + `ReachUs`, form. `page` → `/contact` hero (h1, load entrances); otherwise a section (used at the end of `/`). |
| `ReachUs` | Email · phone · address line with the social icons. |
| `useScrollFrame` | rAF-throttled scroll/resize callback. |

### `home/` — the `/` page (order as on the page)

| Component | Role |
|---|---|
| `ThreadWaves` | Fixed background thread layer; fades in/out between two section ids. |
| `HeroSequence` | Hero + trust toggle: pinned stage, portrait fade, scroll-drawn thread, word-by-word headline, the dot → switch → on sequence. |
| `Services` | `#features` — four photo cards with parallax and a hover "Read more". |
| `Philosophy` | Scroll-lit statement (`ScrollWords`). |
| `Story` | Text + two overlapping parallax photos; `flip` mirrors it. |
| `HowItWorks` | `#how-it-works` — big title, steps, sticky odometer number. |
| `Ready` | Join CTA with trust block and `ReachUs`. |
| `BigQuote` | Statement band, then the full-bleed quote with the dome reveal and a thread. |
| `Community` | `#community` — three blob-shaped post cards. |
| `Numbers` | Statement + count-up `STATS`. |
| `ScrollThread` | SVG strokes that draw themselves on scroll (`pathLength=1` + dash offset, smoothed). |
| `ParallaxImage` | Image that drifts inside its frame on scroll (`intensity` px), optional grain. |
| `TextEffects` | `BlurWords` (load, word by word) and `ScrollWords` (scroll-lit words, screen-reader safe). |

Rules:

- Colors come from theme tokens only (`brand-*`, `ink-*`, `surface`), so dark
  mode and Appearance accent changes keep working.
- Literal white is used only over surfaces that are always dark: the footer,
  the home hero stage and the big quote.
- Mark any such block with `data-nav-dark="true"` so the desktop nav turns
  white over it. If a block turns dark or light without a scroll, dispatch
  `NAV_ZONES_EVENT`, as `HeroSequence` does.
- Cursor modes:
  - Links and buttons styled `.pill`, `.ul-wipe`, `.link-u`, `.soc` or `.chip`
    get the snap frame automatically.
  - For anything else that should snap, add `data-cursor="snap"`, or the
    `mk-snap` class if the component only takes a `className`.
  - A card that opens something gets `data-cursor="<Verb>"` for a label
    pill, e.g. `"Read"`.
