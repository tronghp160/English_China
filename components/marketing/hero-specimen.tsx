"use client";

import { Flame, Sparkles } from "lucide-react";
import { useState } from "react";
import { LangMark } from "@/components/lang-mark";
import { Pup } from "@/components/mascot/pup";
import { WordHero } from "@/components/word/word-hero";
import { cn } from "@/lib/utils";

/**
 * The landing page's picture (REDESIGN_V2 §6.13): real components on a pale blue block, no image.
 * A word card you can turn over (tap, click or Space), a Chinese card, two chips and Bin waving.
 */
export function HeroSpecimen() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative mx-auto w-full max-w-md rounded-[2.5rem] bg-primary-soft px-5 pt-10 pb-12 sm:px-8">
      <span className="absolute top-4 right-5 z-20 inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1.5 text-sm font-bold text-streak-fg shadow-sm">
        <Flame className="size-4 fill-c-sun" aria-hidden />
        Chuỗi 14 ngày
      </span>
      <span className="absolute bottom-5 left-5 z-20 inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1.5 text-sm font-bold text-xp-fg shadow-sm">
        <Sparkles className="size-4" aria-hidden />
        +20 XP
      </span>

      <div className="flip-scene -rotate-3">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          className="block w-full rounded-xl text-left"
        >
          <span className="flip-card grid w-full [&>*]:[grid-area:1/1]" data-flipped={flipped}>
            <span className="flip-face block rounded-xl bg-surface shadow-lg" aria-hidden={flipped}>
              <WordHero lang="en" term="resilient" reading="/rɪˈzɪliənt/" className="shadow-none" innerClassName="min-h-[13rem] justify-center" showReading>
                <span className="mt-auto text-sm text-fg-subtle">Chạm để lật</span>
              </WordHero>
            </span>
            <span className="flip-face flip-back block overflow-hidden rounded-xl bg-surface shadow-lg" aria-hidden={!flipped}>
              <span aria-hidden className="block h-1 bg-en" />
              <span className="flex min-h-[13rem] flex-col gap-3 p-5">
                <LangMark lang="en" />
                <span className="block text-[1.625rem] leading-tight font-extrabold tracking-[-0.02em] text-fg">kiên cường, mau phục hồi</span>
                <span className="block text-sm text-fg-muted">able to recover quickly from difficulties</span>
                <span className="mt-auto block rounded-lg bg-surface-2 p-3">
                  <span className="block text-fg">
                    She&apos;s remarkably <b className="font-bold text-primary">resilient</b>.
                  </span>
                  <span className="block text-sm text-fg-muted">Cô ấy kiên cường đáng kinh ngạc.</span>
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <div className="relative z-10 -mt-3 ml-auto w-[min(100%,14rem)] rotate-2">
        <WordHero lang="zh" term="坚强" reading="jiānqiáng" size="md" className={cn("shadow-md")} />
      </div>

      <Pup mood="wave" size={104} className="absolute -right-2 -bottom-6" />
    </div>
  );
}
