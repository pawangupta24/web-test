/**
 * /contact form options and its mailto: hand-off.
 *
 * There is no public contact endpoint (POST /support needs a session), so the
 * form composes an email in the visitor's own mail app. Framework-free so the
 * encoding rules are unit-tested (src/lib/__tests__/contact.test.ts).
 */

export const CONTACT_EMAIL = "hello@orovion.com";
export const CONTACT_PHONE = "+91 80042 27370";
export const CONTACT_PHONE_HREF = "tel:+918004227370";
export const CONTACT_ADDRESS = "Varanasi, Uttar Pradesh, India, 221010";

export const CONTACT_ROLES = [
  "Doctor or specialist",
  "Nurse or allied health professional",
  "Medical student",
  "Hospital or clinic",
  "Patient or caregiver",
  "Other",
] as const;

export const CONTACT_TOPICS = [
  "Account & verification",
  "Consultations & payments",
  "Partnerships & institutions",
  "Press & media",
  "Something else",
] as const;

export const CONTACT_SOURCES = [
  "Google search",
  "A colleague or friend",
  "Social media",
  "Conference or event",
  "Other",
] as const;

export type ContactValues = {
  name: string;
  email: string;
  phone?: string;
  role: string;
  message?: string;
  topics: string[];
  source: string;
  updates: boolean;
};

/** Long mailto: URLs get truncated or rejected by some mail clients. */
export const MAX_MESSAGE_CHARS = 1500;

const clean = (s?: string) => (s ?? "").trim();

/** Subject + plain-text body for a contact enquiry. */
export function contactEmailParts(v: ContactValues): { subject: string; body: string } {
  const topic = v.topics[0] ?? "General enquiry";
  const subject = `Orovion enquiry: ${topic} (${clean(v.name)})`;

  let message = clean(v.message);
  if (message.length > MAX_MESSAGE_CHARS) message = `${message.slice(0, MAX_MESSAGE_CHARS)}… [message shortened — please paste the rest here]`;

  const lines = [`Name: ${clean(v.name)}`, `Email: ${clean(v.email)}`];
  if (clean(v.phone)) lines.push(`Phone: ${clean(v.phone)}`);
  lines.push(`I am a: ${clean(v.role)}`);
  if (v.topics.length > 0) lines.push(`Topics: ${v.topics.join(", ")}`);
  lines.push(
    `Heard about Orovion via: ${clean(v.source)}`,
    `Product updates by email: ${v.updates ? "Yes" : "No"}`,
    "",
    "Message:",
    message || "(no message)",
  );

  return { subject, body: lines.join("\r\n") };
}

/** A mailto: URL with the enquiry pre-filled (RFC 6068: CRLF line breaks, percent-encoded). */
export function buildContactMailto(v: ContactValues, to: string = CONTACT_EMAIL): string {
  const { subject, body } = contactEmailParts(v);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
