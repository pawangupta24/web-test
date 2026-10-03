"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  buildContactMailto, CONTACT_EMAIL, CONTACT_ROLES, CONTACT_SOURCES, CONTACT_TOPICS, type ContactValues,
} from "@/lib/contact";
import PillButton, { type PillState } from "./PillButton";

/**
 * The /contact enquiry form, laid out like the reference booking form:
 * five groups 64px apart, underline fields, square brand checkboxes and the
 * dot-swap submit. There is no public contact API, so submitting opens the
 * visitor's mail app with everything pre-filled (src/lib/contact.ts). Native
 * validation runs first; the button then shows its spinner and a success label.
 */
export default function ContactForm() {
  const [state, setState] = useState<PillState>("idle");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("website") || "")) return; // honeypot: bots fill every field
    const values: ContactValues = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      role: String(fd.get("role") || ""),
      message: String(fd.get("message") || ""),
      topics: fd.getAll("topics").map(String),
      source: String(fd.get("source") || ""),
      updates: fd.get("updates") === "on",
    };
    setState("loading");
    const url = buildContactMailto(values);
    window.setTimeout(() => {
      window.location.href = url;
      setState("success");
    }, 700);
  };

  return (
    <form onSubmit={onSubmit} onChange={() => state === "success" && setState("idle")} className="relative flex w-full flex-col gap-16" noValidate={false}>
      <Group title="Tell us about you.">
        <Field label="Your name" required>
          <input name="name" type="text" autoComplete="name" required placeholder="Your name *" className="mk-field" />
        </Field>
        <Field label="Your email" required>
          <input name="email" type="email" autoComplete="email" required placeholder="Your email *" className="mk-field" />
        </Field>
        <Field label="Phone number">
          <input name="phone" type="tel" autoComplete="tel" placeholder="Phone number" className="mk-field" />
        </Field>
        <Field label="I am a" required select>
          <select name="role" required defaultValue="" className="mk-field">
            <option value="" disabled>I am a… *</option>
            {CONTACT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </Group>

      <Group title="How can we help?">
        <Field label="Your message" required>
          <textarea name="message" required rows={4} placeholder="Share anything that helps us understand what you need — the more context, the faster we can help." className="mk-field" />
        </Field>
      </Group>

      <Group title="What is this about?">
        <div className="flex flex-col gap-6">
          {CONTACT_TOPICS.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 t-small text-ink-600">
              <input type="checkbox" name="topics" value={t} className="mk-check" />
              <span className="select-none">{t}</span>
            </label>
          ))}
        </div>
      </Group>

      <Field label="Where did you hear about us?" required select>
        <select name="source" required defaultValue="" className="mk-field">
          <option value="" disabled>Where did you hear about us? *</option>
          {CONTACT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-center gap-2.5 t-small text-ink-600">
          <input type="checkbox" name="updates" className="mk-check" />
          <span className="select-none">Send me occasional product updates by email</span>
        </label>
        <p className="max-w-[480px] t-small text-ink-500">
          One email a month at most — new features, clinical content highlights and community
          news. Every email contains an unsubscribe link.
        </p>
      </div>

      {/* honeypot — hidden from people, irresistible to bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />

      <div className="flex flex-col gap-4">
        <div className="w-max">
          <PillButton type="submit" state={state} className="min-w-[192px]">
            {state === "success" ? "Email ready" : "Send message"}
          </PillButton>
        </div>
        <p aria-live="polite" className="min-h-[1.8em] max-w-[480px] t-small text-ink-500">
          {state === "success" && (
            <>Your email app should have opened with your message filled in — just press send. Nothing opened? Write to us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="link-u font-semibold text-brand-600">{CONTACT_EMAIL}</a>.</>
          )}
        </p>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-8">
      <legend className="t-title mb-8 text-ink-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, select, children }: { label: string; required?: boolean; select?: boolean; children: ReactNode }) {
  return (
    <label className={select ? "mk-select block" : "block"}>
      <span className="sr-only">{label}{required ? " (required)" : ""}</span>
      {children}
    </label>
  );
}
