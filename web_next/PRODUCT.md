# Product

## Register

product

## Users

Doctors, surgeons, nurses, therapists, pharmacists, medical students, and patients. Clinicians use Orovion between consults and on the wards: short sessions, high signal expectations, zero tolerance for ambiguity about who authored what. Patients and students browse to learn from verified professionals.

## Product Purpose

Orovion is a healthcare social platform: a verified professional network plus a clinical content feed (posts, case studies, research papers, theses, reels), real-time chat, and consultations. The feed is the core surface; trust signals (verification, credentials, specialty) are first-class data, not decoration. Success: a clinician can scan the feed, judge source credibility instantly, engage (react, discuss, save, share), and grow their professional graph without friction.

## Brand Personality

Trusted, clinical, calm. Premium through precision and motion quality, not ornamentation. The teal-on-white system reads medical and credible; engagement moments (reactions, follows, sheets) carry the delight.

## Anti-references

- Generic social feeds (Facebook-style chrome, noisy ads, engagement bait).
- Consumer-loud gradients and confetti; this is a professional clinical tool.
- Hospital-bureaucracy UI: dated portals, dense gray forms.

## Design Principles

1. **Attribution before content** — author identity, verification, and specialty render first and identically everywhere.
2. **Optimistic, never dishonest** — interactions respond instantly, roll back visibly with a toast when the server disagrees.
3. **One state machine, every surface** — Follow → Following → Connect → Connecting → Message renders identically in feed headers, like lists, and profiles. There is no Requested state: accounts are public and every follow is immediate. On a profile the networking action owns the primary slot once the viewer follows, with Following retained beside it so unfollow is never more than one tap away.
4. **Motion conveys state** — 150–300ms ease-out transitions for sheets, collapses, and toggles; no decorative choreography. Reduced-motion users get crossfades.
5. **Earned familiarity** — standard affordances (bottom sheets, chips, pills) executed precisely; no invented controls.

## Accessibility & Inclusion

WCAG AA contrast on body text; all interactive elements keyboard-reachable with visible focus; `prefers-reduced-motion` honored on every animation; touch targets ≥40px on mobile sheets.
