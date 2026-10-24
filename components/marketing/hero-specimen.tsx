"use client";

import { useState } from "react";
import { WordSpecimen } from "@/components/word/word-specimen";
import { cn } from "@/lib/utils";

/**
 * The landing page's one moving piece: a real word card you can turn over (tap, click or Space).
 * Front: "resilient" on ruled paper. Back: its meaning and one example. A smaller Chinese card sits below it.
 */
export function HeroSpecimen() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="flip-scene">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          aria-label="Thẻ từ resilient, bấm để lật"
          className="block w-full rounded-sheet text-left"
        >
          <span className="flip-card grid w-full [&>*]:[grid-area:1/1]" data-flipped={flipped}>
            <span className="flip-face block" aria-hidden={flipped}>
              <WordSpecimen
                lang="en"
                term="resilient"
                reading="/rɪˈzɪliənt/"
                className="sheet-lift"
                innerClassName="min-h-[16rem]"
                showReading
              >
                <span className="flex h-[var(--line)] items-end pt-1 text-sm text-ink-soft">Chạm để lật</span>
              </WordSpecimen>
            </span>
            <span className={cn("flip-face flip-back sheet sheet-lift margin-line block rounded-sheet py-6 pr-5 pl-[calc(var(--margin-x)+1rem)]")} aria-hidden={!flipped}>
              <span className="block text-[1.5rem] leading-snug font-medium text-ink">
                <span className={cn("highlighter", flipped && "highlighter-animate")}>kiên cường, mau phục hồi</span>
              </span>
              <span className="mt-3 block text-sm text-ink-soft">able to recover quickly from difficulties</span>
              <span className="mt-5 block border-l-2 border-ink-violet pl-3">
                <span className="block text-ink">
                  She&apos;s remarkably <mark className="highlighter bg-transparent text-inherit">resilient</mark>.
                </span>
                <span className="block text-sm text-ink-soft">Cô ấy kiên cường đáng kinh ngạc.</span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <div className="mt-5 ml-auto w-[min(100%,15rem)]">
        <WordSpecimen lang="zh" term="坚强" reading="jiānqiáng" size="md" className="sheet p-4" />
      </div>
    </div>
  );
}
