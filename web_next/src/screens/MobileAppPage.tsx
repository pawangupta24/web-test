"use client";
import { Link } from "@/lib/router";
import {
  BadgeCheck, Bell, Clapperboard, Heart, MessageCircle, MessageSquare,
  Phone, Play, Search, Send, Stethoscope, Video, Wifi,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import StoreBadge from "@/components/ui/StoreBadge";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Accent, Display, Eyebrow, enter } from "@/components/marketing/Type";
import { cn } from "@/lib/utils";

// TODO: set the real store URLs once the listings are live; the badges become
// links automatically. Until then they render as static badges with a note.
const APP_STORE_URL: string | null = null;
const PLAY_STORE_URL: string | null = null;

// Illustrative people for the phone mockups only (marketing page — not live data).
const SAMPLE = [
  { _id: "m1", fullName: "Dr. Sara Reyes", role: "doctor", professionalHeadline: "Pediatric Oncology · AIIMS", isVerified: true },
  { _id: "m2", fullName: "Dr. Daniel Kovač", role: "doctor", professionalHeadline: "Interventional Cardiology", isVerified: true },
];

/** /mobile-app — marketing page for the iOS & Android apps. */
export default function MobileAppPage() {
  return (
    <MarketingShell>
      <Hero />
      <Screens />
      <Capabilities />
      <StoresCTA />
    </MarketingShell>
  );
}

/** Store badge that upgrades to a real link once the URL exists. */
function BadgeSlot({ store, url }: { store: "apple" | "google"; url: string | null }) {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" data-cursor="snap" className="group press rounded-xl" aria-label={store === "apple" ? "Download Orovion on the App Store" : "Get Orovion on Google Play"}>
        <StoreBadge store={store} />
      </a>
    );
  }
  return <StoreBadge store={store} className="opacity-95" />;
}

function Hero() {
  const e = { eyebrow: enter(0.4, "above"), title: enter(0.4), intro: enter(0.6), badges: enter(0.7), phone: enter(0.6, "none") };
  return (
    <section className="mk-top overflow-hidden">
      <div className="mk-container flex flex-col gap-14">
        <Eyebrow className={e.eyebrow.className} style={e.eyebrow.style}>Mobile app · iOS &amp; Android</Eyebrow>
        <div className="mk-split items-center" style={{ ["--mk-gap" as string]: "64px" }}>
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <Display as="h1" className={e.title.className} style={e.title.style}>
                Orovion, in <Accent>your pocket.</Accent>
              </Display>
              <p className={cn("max-w-[480px] t-body-lg text-ink-600", e.intro.className)} style={e.intro.style}>
                Your healthcare network — connections, knowledge, conversations and private
                consultations — wherever you go.
              </p>
            </div>
            <div className={cn("flex flex-col gap-3", e.badges.className)} style={e.badges.style}>
              <div className="flex flex-wrap items-center gap-3">
                <BadgeSlot store="apple" url={APP_STORE_URL} />
                <BadgeSlot store="google" url={PLAY_STORE_URL} />
              </div>
              {!APP_STORE_URL && !PLAY_STORE_URL && (
                <p className="t-small text-ink-500">Download Orovion and carry your healthcare network with you.</p>
              )}
            </div>
          </div>
          <div className={cn("relative mx-auto", e.phone.className)} style={e.phone.style}>
            <div aria-hidden className="absolute -inset-16 rounded-full bg-brand-600/10 blur-3xl" />
            <div className="relative">
              <PhoneFrame tilt="rotate-2">
                <FeedScreen />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Screens() {
  return (
    <section className="mk-section bg-ink-50">
      <div className="mk-container flex flex-col gap-14 tab:gap-20">
        <div className="mk-split items-end" style={{ ["--mk-gap" as string]: "24px" }}>
          <div className="flex flex-col gap-6">
            <Eyebrow className="mk-reveal">Designed for one hand</Eyebrow>
            <Display className="mk-reveal">Every surface, <Accent>made to move.</Accent></Display>
          </div>
          <p className="mk-reveal max-w-[480px] t-body text-ink-600">
            The connected Orovion experience, designed around the way you discover, connect and
            interact on the go.
          </p>
        </div>
        <div className="grid items-start justify-items-center gap-14 tab:grid-cols-3 tab:gap-8">
          <ScreenDemo caption="The feed" text="Cases, research and healthcare content from professionals and people you follow.">
            <FeedScreen />
          </ScreenDemo>
          <ScreenDemo caption="Real-time chat" text="Private conversations with presence, read states, files and real-time communication.">
            <ChatScreen />
          </ScreenDemo>
          <ScreenDemo caption="Pulses" text="Short-form healthcare and professional content, designed for quick discovery on the go.">
            <PulseScreen />
          </ScreenDemo>
        </div>
      </div>
    </section>
  );
}

function ScreenDemo({ caption, text, children, className = "" }: { caption: string; text: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("mk-reveal flex max-w-xs flex-col items-center text-center", className)}>
      <PhoneFrame small>{children}</PhoneFrame>
      <figcaption className="mt-8 flex flex-col gap-2">
        <p className="t-title !text-xl text-ink-900">{caption}</p>
        <p className="t-small text-ink-600">{text}</p>
      </figcaption>
    </figure>
  );
}

const CAPABILITIES = [
  { icon: Bell, title: "Push notifications", text: "Stay updated on messages, consultation requests, connection activity and important interactions." },
  { icon: MessageSquare, title: "Messages & communication", text: "Continue private conversations, share files and access communication features based on your role." },
  { icon: Clapperboard, title: "Pulse on the go", text: "Discover short-form healthcare and professional content whenever you have a moment." },
  { icon: Stethoscope, title: "Consults anywhere", text: "Request, manage and attend private consultations — or review and schedule requests as a healthcare professional." },
];

function Capabilities() {
  return (
    <section className="mk-section">
      <div className="mk-container mk-split mk-split--rev items-start">
        <div className="flex flex-col gap-6 self-start tab:sticky tab:top-40">
          <Eyebrow className="mk-reveal">Nothing left behind</Eyebrow>
          <Display className="mk-reveal">The full network, <Accent>wherever you are.</Accent></Display>
          <p className="mk-reveal max-w-[480px] t-body text-ink-600">The core Orovion experience, built to move with you between wards, lectures and home.</p>
        </div>
        <ul className="flex flex-col">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="mk-reveal flex gap-6 border-t border-ink-900/[.08] py-8 first:border-t-0 first:pt-0 tab:py-10">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><c.icon size={22} strokeWidth={1.7} /></span>
              <div className="flex flex-col gap-2">
                <h3 className="t-title text-ink-900">{c.title}</h3>
                <p className="max-w-[520px] t-body text-ink-600">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StoresCTA() {
  return (
    <section className="mk-section bg-ink-50">
      <div className="mk-container mk-split items-end" style={{ ["--mk-gap" as string]: "32px" }}>
        <div className="flex flex-col gap-6">
          <Eyebrow className="mk-reveal">Get the app</Eyebrow>
          <Display className="mk-reveal">Available on <Accent>iOS and Android.</Accent></Display>
          <p className="mk-reveal max-w-[480px] t-body text-ink-600">Download Orovion and carry your network with you.</p>
        </div>
        <div className="mk-reveal flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <BadgeSlot store="apple" url={APP_STORE_URL} />
            <BadgeSlot store="google" url={PLAY_STORE_URL} />
          </div>
          <p className="t-small text-ink-600">Prefer the browser? <Link to="/login" className="link-u font-semibold text-brand-600">Open Orovion on the web</Link>.</p>
        </div>
      </div>
    </section>
  );
}

/* ── CSS phone mockups (image-free, on-brand — same approach as the landing hero) ── */

function PhoneFrame({ children, small = false, tilt = "" }: { children: React.ReactNode; small?: boolean; tilt?: string }) {
  return (
    <div className={cn("relative max-w-full rounded-[2.6rem] bg-ink-950 p-2.5 shadow-4 ring-1 ring-white/10", small ? "w-60" : "w-64 sm:w-72", tilt)} aria-hidden>
      {/* notch */}
      <div className="absolute left-1/2 top-4 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-50">
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-ink-500">
          <span>9:41</span>
          <Wifi size={11} />
        </div>
        <div className={small ? "h-[26rem]" : "h-[30rem]"}>{children}</div>
      </div>
    </div>
  );
}

function FeedScreen() {
  return (
    <div className="space-y-2.5 p-3">
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-base font-extrabold text-ink-900">Feed</p>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-500 shadow-1"><Search size={13} /></span>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-hidden">
        {["All", "Cardiology", "Neuro"].map((t, i) => (
          <span key={t} className={cn("shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold", i === 0 ? "bg-brand-600 text-white" : "bg-surface text-ink-600 shadow-1")}>{t}</span>
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-3 shadow-1">
        <div className="flex items-center gap-2">
          <Avatar user={SAMPLE[0]} size={30} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[0].fullName} <Verified size={10} /></p>
            <p className="truncate text-[9px] text-ink-400">{SAMPLE[0].professionalHeadline}</p>
          </div>
          <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-[8px] font-bold uppercase text-brand-700">Case</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-700">Febrile neutropenia pathway update — day 3 cultures negative, when do you step down?</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[Stethoscope, Heart, Play].map((Icon, i) => (
            <div key={i} className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600"><Icon size={14} /></div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-500">
          <span className="flex items-center gap-1"><Heart size={11} className="fill-rose-500 text-rose-500" /> 248</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> 34</span>
        </div>
      </div>
      <div className="rounded-2xl bg-surface p-3 shadow-1">
        <div className="flex items-center gap-2">
          <Avatar user={SAMPLE[1]} size={30} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[1].fullName} <Verified size={10} /></p>
            <p className="truncate text-[9px] text-ink-400">{SAMPLE[1].professionalHeadline}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-700">New paper: radial vs femoral access outcomes in 2,400 PCI patients…</p>
      </div>
    </div>
  );
}

function ChatScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-surface px-3 py-2.5 shadow-1">
        <Avatar user={SAMPLE[1]} size={28} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[1].fullName} <Verified size={10} /></p>
          <p className="text-[9px] font-medium text-emerald-600">Online</p>
        </div>
        <Phone size={13} className="text-ink-500" />
        <Video size={14} className="text-brand-600" />
      </div>
      <div className="flex-1 space-y-2 p-3">
        <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[11px] leading-snug text-ink-700 shadow-1">
          ECG attached — ST elevation in V2–V4. Cath lab or thrombolysis given the transfer time?
        </div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-3 py-2 text-[11px] leading-snug text-white shadow-1">
          Activate the lab. Door-to-balloon still beats lysis at 40 min transfer.
        </div>
        <div className="max-w-[60%] rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[11px] text-ink-700 shadow-1">
          Agreed — sending now. 🙏
        </div>
      </div>
      <div className="flex items-center gap-2 bg-surface px-3 py-2.5 shadow-1">
        <span className="flex-1 rounded-full bg-ink-900/[.05] px-3 py-1.5 text-[10px] text-ink-400">Message…</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white"><Send size={12} /></span>
      </div>
    </div>
  );
}

function PulseScreen() {
  return (
    <div className="relative h-full bg-ink-950">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-800/70 via-ink-950 to-ink-950" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur"><Play size={18} className="fill-white text-white" /></span>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 text-white">
        <p className="flex items-center gap-1 text-[11px] font-bold">Dr. Sara Reyes <BadgeCheck size={11} className="text-white" /></p>
        <p className="mt-1 text-[10px] leading-snug text-white/85">Reading a paediatric ECG in 60 seconds — rate, rhythm, axis. #Pulse</p>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-white/85">
          <span className="flex items-center gap-1"><Heart size={11} className="fill-rose-500 text-rose-500" /> 1.2k</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> 86</span>
        </div>
      </div>
    </div>
  );
}
