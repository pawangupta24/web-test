import { HOME } from "@/lib/marketing";
import PillButton from "../PillButton";
import ReachUs from "../ReachUs";
import { TrustBlock } from "../Trust";
import { Accent, Display } from "../Type";

/** "Ready to join?" call to action with the trust block (reference "Ready to find your path?"). */
export default function Ready() {
  const r = HOME.ready;
  return (
    <section className="relative py-20 tab:py-[120px]">
      <div className="mk-container mk-split items-start" style={{ ["--mk-gap" as string]: "64px" }}>
        <div className="flex flex-col gap-6">
          <Display size="sm" className="mk-reveal">{r.title}<br /><Accent>{r.accent}</Accent></Display>
          <p className="mk-reveal max-w-[480px] t-body text-ink-600">{r.text}</p>
          <div className="mk-reveal pt-10"><PillButton to={r.cta.to}>{r.cta.label}</PillButton></div>
        </div>
        <div className="flex flex-col gap-20">
          <TrustBlock />
          <ReachUs />
        </div>
      </div>
    </section>
  );
}
