/**
 * Copy and imagery for the public marketing pages (/, /contact, /team,
 * /mobile-app, /help, /privacy, /terms).
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PLACEHOLDER CONTENT. Everything marked `placeholder: true` (numbers, │
 * │ quotes, people, ratings) and every photo in /public/marketing is     │
 * │ illustrative — replace it with real data before launch. Photos are   │
 * │ free Unsplash images; see docs/marketing-placeholders.md.            │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Framework-free (icons are referenced by key, mapped to components in the
 * screens) so this stays importable from unit tests.
 */
import { FAQ_SECTIONS, type FaqItem } from "./faq";

export type NavLinkItem = { label: string; href: string };

/** Primary nav (desktop bar + mobile menu). Section anchors are absolute so they work from every page. */
export const NAV_LINKS: NavLinkItem[] = [
  { label: "Features", href: "/#features" },
  { label: "Team", href: "/team" },
  { label: "Get the app", href: "/mobile-app" },
  { label: "Help", href: "/help" },
  { label: "Contact", href: "/contact" },
];

/** Footer sitemap, two columns. */
export const SITEMAP: NavLinkItem[][] = [
  [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Stories", href: "/#stories" },
    { label: "How consults work", href: "/#how-it-works" },
    { label: "Meet the team", href: "/team" },
  ],
  [
    { label: "Get the app", href: "/mobile-app" },
    { label: "Help center", href: "/help" },
    { label: "Contact us", href: "/contact" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms & conditions", href: "/terms" },
  ],
];

/** Real Orovion social profiles. */
export const SOCIALS = [
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/orovion/" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/orovion.app" },
  { key: "x", label: "X (Twitter)", href: "https://x.com/orovion?s=20" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/people/Orovion/61591959148775/" },
  { key: "reddit", label: "Reddit", href: "https://www.reddit.com/user/orovion/" },
] as const;

/* ── Social proof ─────────────────────────────────────────────────────── */

/** Face photos used in avatar stacks. placeholder: true */
export const TRUST_AVATARS = [
  { src: "/marketing/avatar-1.jpg", alt: "" },
  { src: "/marketing/avatar-2.jpg", alt: "" },
  { src: "/marketing/avatar-3.jpg", alt: "" },
  { src: "/marketing/avatar-4.jpg", alt: "" },
  { src: "/marketing/avatar-5.jpg", alt: "" },
];

export const TRUST = {
  placeholder: true,
  label: "Trusted by 12,000+ healthcare professionals",
  badge: "+12k",
  rating: "4.9",
  ratingLabel: "out of 5 from verified members",
};

export const STATS = [
  { value: 12000, suffix: "+", label: "Verified clinicians", placeholder: true },
  { value: 40, suffix: "+", label: "Medical specialties", placeholder: true },
  { value: 180, suffix: "k", label: "Case discussions", placeholder: true },
  { value: 24, suffix: "/7", label: "Consults across time zones", placeholder: true },
];

/* ── Home page (/) ────────────────────────────────────────────────────
   Section order mirrors the reference home page: hero → trust toggle →
   services → philosophy → story → how it works → ready → text + big quote →
   story → community → numbers → FAQ → contact. Everything marked
   `placeholder: true` is illustrative copy to replace. */

export const STEPS = [
  { title: "Find a verified specialist", text: "Search by name, specialty or condition. Every clinician carries a license-verified badge before they can consult — no guesswork about who you are talking to." },
  { title: "Request a consultation", text: "Pick a slot from the doctor's live availability, share what is going on and attach your reports. Payment confirms the booking." },
  { title: "Meet on secure video", text: "Join the call inside Orovion. Prescriptions and summaries stay in your consultation history — only you and your doctor can open them." },
];

export const HOME = {
  hero: {
    title: "Where Healthcare Comes Together.",
    text: "Orovion brings verified healthcare professionals, medical students and people into one trusted network — to share knowledge, discuss real cases and book private consultations, at your own pace.",
    cta: { label: "Join Orovion", to: "/login" },
    image: { src: "/marketing/hero-portrait.jpg", srcPhone: "/marketing/hero-portrait-tall.jpg", alt: "Doctor with a stethoscope, smiling in soft light" },
    placeholder: true,
  },
  /** The scroll-driven toggle that follows the hero. */
  trust: {
    label: "Verified",
    before: {
      title: "If only finding care you can trust were as simple as flipping a switch.",
      lines: ["It’s closer than you think.", "And every verified profile makes it clearer."],
    },
    after: {
      title: "There may not be a single switch,",
      accent: "but there is a verified network.",
      text: "Every clinician on Orovion passes license verification. These are the ways we help people learn, connect and get care with confidence.",
    },
  },
  services: [
    { title: "Clinical Cases", text: "De-identified cases discussed by verified specialists — real perspectives you can trust.", image: "/marketing/service-cases.jpg", href: "/app/explore" },
    { title: "Medical Pulses", text: "Short clinical explainers and procedures, made by the people who perform them.", image: "/marketing/service-pulses.jpg", href: "/app/pulse" },
    { title: "Research & Thesis", text: "Papers, theses and new findings, shared and discussed with their authors.", image: "/marketing/service-research.jpg", href: "/app/explore" },
    { title: "Private Consults", text: "Secure video consultations with license-verified doctors, booked in minutes.", image: "/marketing/service-consults.jpg", href: "/app/consults" },
  ],
  philosophy: {
    eyebrow: "Our philosophy",
    text: "At Orovion, we don’t ask you to take trust on faith — we verify it. Through licensed professionals, transparent authorship and real conversations, we help medical knowledge move safely between the people who need it.",
    cta: { label: "Meet the team", to: "/team" },
  },
  stories: [
    {
      placeholder: true,
      eyebrow: "Real clinicians. Real cases.",
      title: "A second opinion before morning rounds.",
      text: "Dr. Ananya Mehra posted a puzzling case at 2 a.m. By sunrise, three interventional cardiologists in other cities had weighed in — and her patient’s plan was clearer for it.",
      cta: { label: "Read the story", to: "/login" },
      images: [
        { src: "/marketing/story-a-main.jpg", alt: "Two doctors reviewing a brain scan on a monitor" },
        { src: "/marketing/story-a-detail.jpg", alt: "Doctor in a white coat, arms crossed" },
      ],
    },
    {
      placeholder: true,
      eyebrow: "Care, closer to home.",
      title: "A follow-up without the three-hour drive.",
      text: "When Meera’s father needed a cardiology review, a verified specialist read his reports and met them on video the same week. The prescription was waiting before the call ended.",
      cta: { label: "Read the story", to: "/login" },
      images: [
        { src: "/marketing/story-b-main.jpg", alt: "A caregiver holding an older patient’s hand" },
        { src: "/marketing/story-b-detail.jpg", alt: "Nurse checking a patient’s blood pressure" },
      ],
    },
  ],
  how: {
    title: { lead: "How", accent: "It Works" },
    text: "Getting care doesn’t have to be complicated. Our process is simple, verified at every step, and designed around your time — from the first search to the follow-up.",
    steps: STEPS,
  },
  ready: {
    title: "Ready to join",
    accent: "the network?",
    text: "Whether you practise, study or are looking for guidance, Orovion meets you where you are. Create your profile in minutes — verification takes a couple of days.",
    cta: { label: "Join Orovion", to: "/login" },
  },
  statement: {
    title: "Knowledge grounded in evidence, shared by verified people, and",
    accent: "built for better care.",
    text: "Every post on Orovion shows who wrote it, what they are licensed for and where they practise. Learn more about",
    link: { label: "how verification works", to: "/help#verification" },
    tail: "and what to expect.",
  },
  quote: {
    placeholder: true,
    text: "Medicine moves forward when knowledge moves freely — between people you can trust.",
    author: "Dr. Arjun Malhotra · Consultant Pediatrician",
    image: { src: "/marketing/quote-theatre.jpg", alt: "Surgeons working under operating-theatre lights" },
  },
  community: {
    eyebrow: "From the community",
    title: "Insights for sharper thinking and better care.",
    text: "Cases, explainers and research from verified clinicians — one clear idea at a time.",
    cta: { label: "Explore the feed", to: "/app/explore" },
    posts: [
      { placeholder: true, tag: "Pulse", title: "Reading a paediatric ECG in 60 seconds", text: "Rate, rhythm, axis — a cardiologist’s quick framework for the night shift.", image: "/marketing/journal-heart.jpg", href: "/app/pulse" },
      { placeholder: true, tag: "Case study", title: "What makes a case discussion useful?", text: "Three neurologists on the details that turn a post into a better decision.", image: "/marketing/journal-brain.jpg", href: "/app/explore" },
      { placeholder: true, tag: "Research", title: "Biomarkers, without the jargon", text: "A lab physician explains which results change management — and which don’t.", image: "/marketing/journal-lab.jpg", href: "/app/explore" },
    ],
  },
  numbers: {
    title: "From the first case to lasting change,",
    accent: "these numbers reflect a network built on trust.",
    text: "Every count below is a verified person, a real discussion or a consultation that happened on Orovion.",
  },
};

/* ── FAQ ──────────────────────────────────────────────────────────────── */

const faqSection = (id: string) => FAQ_SECTIONS.find((s) => s.id === id)?.items ?? [];

/**
 * FAQ shown on the landing page — picked from the Help center source
 * (src/lib/faq.ts) so the answers never drift from /help.
 */
export const LANDING_FAQ: readonly FaqItem[] = [
  ...faqSection("getting-started").slice(0, 2),
  ...faqSection("verification").slice(0, 2),
  ...faqSection("consultations").slice(0, 1),
  ...faqSection("safety").slice(2, 3),
];

/** FAQ on /contact — the questions people most often write in about. */
export const CONTACT_FAQ: readonly FaqItem[] = [
  ...faqSection("verification"),
  ...faqSection("consultations").slice(0, 2),
  ...faqSection("getting-started").slice(0, 1),
];
