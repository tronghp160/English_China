"use client";

import { useState } from "react";
import { WordHero } from "@/components/word/word-hero";
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
          className="block w-full rounded-xl text-left"
        >
          <span className="flip-card grid w-full [&>*]:[grid-area:1/1]" data-flipped={flipped}>
            <span className="flip-face block" aria-hidden={flipped}>
              <WordHero
                lang="en"
                term="resilient"
                reading="/rɪˈzɪliənt/"
                className="shadow-lg"
                innerClassName="min-h-[16rem]"
                showReading
              >
                <span className="flex h-[var(--line)] items-end pt-1 text-sm text-fg-muted">Chạm để lật</span>
              </WordHero>
            </span>
            <span className={cn("flip-face flip-back rounded-lg border border-border/60 bg-surface shadow-sm shadow-lg  block rounded-xl py-6 pr-5 pl-4")} aria-hidden={!flipped}>
              <span className="block text-[1.5rem] leading-snug font-medium text-fg">
                <span className={cn("font-bold text-primary-fg", flipped && "")}>kiên cường, mau phục hồi</span>
              </span>
              <span className="mt-3 block text-sm text-fg-muted">able to recover quickly from difficulties</span>
              <span className="mt-5 block border-l-2 border-primary pl-3">
                <span className="block text-fg">
                  She&apos;s remarkably <mark className="bg-transparent font-bold text-primary-fg">resilient</mark>.
                </span>
                <span className="block text-sm text-fg-muted">Cô ấy kiên cường đáng kinh ngạc.</span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <div className="mt-5 ml-auto w-[min(100%,15rem)]">
        <WordHero lang="zh" term="坚强" reading="jiānqiáng" size="md" />
      </div>
    </div>
  );
}
