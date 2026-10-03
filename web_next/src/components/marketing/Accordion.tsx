"use client";
import { useId, useState } from "react";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/faq";

/**
 * FAQ list in the reference style: white 16px-radius cards, 8px apart. Each
 * card opens on its own (several can be open); the height, the answer's
 * opacity and the icon's -135° turn (plus → ×) all ride the same 0.8s spring.
 * Answers stay in the DOM when closed, so the FAQPage JSON-LD on /help still
 * matches visible content.
 */
export default function Accordion({ items, defaultOpen = [0], reveal = true, className }: { items: readonly FaqItem[]; defaultOpen?: number[]; reveal?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map(([q, a], i) => (
        <AccordionItem key={q} question={q} answer={a} defaultOpen={defaultOpen.includes(i)} reveal={reveal} />
      ))}
    </div>
  );
}

function AccordionItem({ question, answer, defaultOpen, reveal }: { question: string; answer: string; defaultOpen: boolean; reveal: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("mk-faq-item", reveal && "mk-reveal")} data-open={open} data-cursor="snap">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-4 rounded-2xl p-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <span className="flex-1 text-lg font-semibold leading-[1.6] text-ink-900">{question}</span>
          <PlusCircle size={24} strokeWidth={1.5} className="mk-faq-icon mt-0.5 text-brand-600" aria-hidden />
        </button>
      </h3>
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="mk-faq-panel">
        <div>
          <p className="mk-faq-answer max-w-[640px] px-6 pb-6 pr-16 t-small text-ink-600">{answer}</p>
        </div>
      </div>
    </div>
  );
}
