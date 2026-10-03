"use client";
import { Linkedin, Instagram, Mail, MapPin, GraduationCap } from "lucide-react";
import TeamAvatar from "./TeamAvatar";
import type { TeamMember } from "@/lib/team";

/** Founder card (cover, portrait, education, location, socials) shared by /team and /team/[slug]. */
export default function TeamProfileCard({ member: m, headingAs: H = "h3" }: { member: TeamMember; headingAs?: "h3" | "p" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/[.06] bg-surface">
      {/* cover — the backdrop is the literal color baked into Cover.png (NOT a
          theme var: it must match the asset even if the accent is rethemed). */}
      <div className="relative h-44">
        <div className="absolute inset-0 bg-[#1e7b74]" />
        <img src="/team/Cover.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain object-center" />
      </div>
      <div className="px-6 pb-6">
        <div className="relative z-10 -mt-12 w-max rounded-3xl bg-surface p-1.5 shadow-card">
          <TeamAvatar member={m} className="h-24 w-24 rounded-2xl text-2xl" />
        </div>
        <H className="mt-4 t-title !text-xl text-ink-900">{m.name}</H>
        {m.role && <p className="text-sm font-semibold text-brand-600">{m.role}</p>}
        <ul className="mt-5 space-y-2.5 t-small text-ink-600">
          <li className="flex items-center gap-2.5"><GraduationCap size={16} className="shrink-0 text-ink-400" /> {m.education}</li>
          <li className="flex items-center gap-2.5"><MapPin size={16} className="shrink-0 text-ink-400" /> {m.location}</li>
        </ul>
        <div className="mt-5 flex gap-2 border-t border-ink-900/[.06] pt-4">
          {m.socials.linkedin && <SocialButton href={m.socials.linkedin} label={`${m.name} on LinkedIn`} icon={Linkedin} />}
          {m.socials.instagram && <SocialButton href={m.socials.instagram} label={`${m.name} on Instagram`} icon={Instagram} />}
          {m.socials.email && <SocialButton href={`mailto:${m.socials.email}`} label={`Email ${m.name}`} icon={Mail} />}
        </div>
      </div>
    </div>
  );
}

function SocialButton({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="press grid h-10 w-10 place-items-center rounded-full bg-ink-900/[.05] text-ink-600 transition-colors duration-300 hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon size={16} />
    </a>
  );
}
