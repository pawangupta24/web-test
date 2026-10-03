import { Stethoscope } from "lucide-react";
import { HOME } from "@/lib/marketing";
import PillButton from "../PillButton";
import { Eyebrow } from "../Type";
import { ScrollWords } from "./TextEffects";

/** Centered statement that lights up word by word as it scrolls (reference "Our philosophy"). */
export default function Philosophy() {
  const p = HOME.philosophy;
  return (
    <section id="philosophy" className="relative py-20 tab:py-[120px]">
      <div className="mk-container flex flex-col items-center gap-8 text-center">
        <Stethoscope aria-hidden size={40} strokeWidth={1.4} className="mk-reveal text-brand-600" />
        <Eyebrow className="mk-reveal">{p.eyebrow}</Eyebrow>
        <ScrollWords as="p" text={p.text} className="max-w-[1080px] t-display-sm !font-medium text-ink-900" />
        <div className="mk-reveal pt-4">
          <PillButton to={p.cta.to}>{p.cta.label}</PillButton>
        </div>
      </div>
    </section>
  );
}
