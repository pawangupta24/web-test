/**
 * Help-centre Q&A content, as plain data.
 *
 * Extracted out of `src/screens/legal/HelpCenter.tsx` so the rendered accordion
 * and the FAQPage JSON-LD on /help read from ONE source. If they drift apart,
 * Google treats the markup as not matching visible page content — which loses
 * the rich result and can trigger a manual action.
 *
 * Framework-free on purpose (see CLAUDE.md): no React imports, so it stays
 * unit-testable from `src/lib/__tests__/`.
 */

export type FaqItem = readonly [question: string, answer: string];

export type FaqSection = {
  /** Anchor id — must match the section id used by LegalShell's jump nav. */
  id: string;
  title: string;
  items: readonly FaqItem[];
};

export const FAQ_SECTIONS: readonly FaqSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      ["How do I create an account?", "Sign in with Google or your phone number, pick your role (doctor, student, or general user), and complete onboarding. Doctors and students can then submit credentials for verification."],
      ["What's the difference between roles?", "Doctors get the full clinical toolkit — posting, cases, consultations. Students get learning-focused access. General users can follow clinicians, learn from content, and book consultations."],
      ["How does the home feed work?", "The feed shows posts from people you follow plus recommended content. Use the specialty bar at the top to filter by field (Cardiology, Pediatrics, and so on), or by content type like Research and Case studies."],
    ],
  },
  {
    id: "verification",
    title: "Verification & the blue badge",
    items: [
      ["How do I get verified?", "Open Profile → Edit profile → Verification & Credentials and upload your license or registration documents. Our review team checks them, usually within 2–3 business days."],
      ["Why was my verification rejected?", "The rejection notice includes the reviewer's reason — most often unreadable documents or a name mismatch. Fix the issue and resubmit from the same screen."],
      ["What does the badge change?", "Verified clinicians appear with the checkmark everywhere their name shows, rank higher in search and suggestions, and can run paid consultations."],
    ],
  },
  {
    id: "posts-feed",
    title: "Posts, comments & saving",
    items: [
      ["Can I edit a post after publishing?", "Yes — within 24 hours of posting, from the post's ⋯ menu. After that the edit option closes; you can still delete the post at any time."],
      ["How do mentions work?", "Type @ in any comment and pick a colleague from the suggestions. They get a notification that deep-links straight to your comment."],
      ["Who can see my saved items?", "Only you. The Saved tab is private and organized by type: posts, case studies, research, theses, and Pulse."],
      ["How do I see fewer posts like one in my feed?", "Open the post's ⋯ menu: Not interested hides it and tunes recommendations; Don't recommend stops suggestions from that author entirely."],
    ],
  },
  {
    id: "consultations",
    title: "Consultations & payments",
    items: [
      ["How do I book a consultation?", "Open a doctor's profile and tap Request consultation, pick a slot from their availability, and pay to confirm. The video call happens inside Orovion."],
      ["What if my consultation fails or is missed?", "If a doctor cancels or doesn't join, the payment is automatically refunded to the original method within 5–7 business days."],
      ["Where are my prescriptions?", "Prescriptions and reports shared during a consultation stay in that consultation's history — only you and your doctor can open them."],
    ],
  },
  {
    id: "safety",
    title: "Privacy, reporting & safety",
    items: [
      ["How do I report a post or user?", "Use Report in the post's ⋯ menu and pick a category. Reports go to the moderation team, who can remove content network-wide. Reporting is anonymous."],
      ["How do I block someone?", "From their profile's menu choose Block. They won't be able to see your profile, message you, or appear in your feed. Manage your block list in Settings → Privacy."],
      ["Can I make my account private?", "No. Every Orovion profile is public: anyone can see your posts, pulses and follower lists, and anyone can follow you without approval. If you do not want someone seeing your profile or reaching you, block them from their profile menu."],
    ],
  },
];

/** Every Q&A pair, flattened — what the FAQPage JSON-LD is built from. */
export const ALL_FAQ_ITEMS: readonly FaqItem[] = FAQ_SECTIONS.flatMap((s) => s.items);
