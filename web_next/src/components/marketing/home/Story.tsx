import { cn } from "@/lib/utils";
import PillButton from "../PillButton";
import { Display, Eyebrow } from "../Type";
import ParallaxImage from "./ParallaxImage";

type StoryContent = {
  eyebrow: string;
  title: string;
  text: string;
  cta: { label: string; to: string };
  images: { src: string; alt: string }[];
};

/**
 * Story spotlight (reference "Story A/B"): copy on one side, two staggered,
 * overlapping photos on the other, each drifting slightly with the scroll.
 * `flip` mirrors it.
 */
export default function Story({ story, id, flip = false }: { story: StoryContent; id?: string; flip?: boolean }) {
  const [main, detail] = story.images;
  return (
    <section id={id} className="relative scroll-mt-24 mk-section">
      <div className="mk-container grid items-start gap-16 tab:grid-cols-2 tab:gap-10">
        <div className={cn("flex flex-col gap-6 tab:pt-10", flip && "tab:order-2 tab:pl-[8%]")}>
          <Eyebrow className="mk-reveal">{story.eyebrow}</Eyebrow>
          <Display className="mk-reveal max-w-[560px]">{story.title}</Display>
          <p className="mk-reveal max-w-[460px] t-body text-ink-600">{story.text}</p>
          <div className="mk-reveal pt-8">
            <PillButton to={story.cta.to}>{story.cta.label}</PillButton>
          </div>
        </div>

        <div className={cn("relative h-[520px] tab:h-[600px] desk:h-[720px]", flip && "tab:order-1")}>
          <ParallaxImage
            src={main.src}
            alt={main.alt}
            intensity={120}
            noise={0.08}
            sizes="(min-width: 810px) 32vw, 70vw"
            className={cn("mk-reveal absolute top-0 h-[78%] w-[62%] rounded-2xl", flip ? "left-0" : "right-0")}
          />
          <ParallaxImage
            src={detail.src}
            alt={detail.alt}
            intensity={80}
            noise={0.08}
            sizes="(min-width: 810px) 26vw, 56vw"
            className={cn("mk-reveal absolute bottom-0 h-[66%] w-[52%] rounded-2xl ring-8 ring-surface", flip ? "right-0" : "left-0")}
          />
        </div>
      </div>
    </section>
  );
}
