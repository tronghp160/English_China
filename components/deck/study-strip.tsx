"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { ModeArt } from "@/components/practice/mode-art";
import { MODE_LOOK } from "@/components/practice/mode-look";
import { useModeStats } from "@/components/practice/use-mode-stats";
import type { PracticeMode } from "@/lib/lang/registry";
import { formatMs } from "@/lib/practice/match";
import { MODE_INFO } from "@/lib/practice/questions";
import { suggestMode } from "@/lib/practice/suggest";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";

type Item = { mode: PracticeMode; n: number };

/**
 * "Học bộ này": the four quick ways in, in the same card style as the practice picker (a picture in the hue of the
 * mode, its name, and one line). The line is only what this device really knows (Learn progress, the last test,
 * the Match record, the card count); nothing is made up while it loads. One card carries "Gợi ý cho bạn".
 */
export function StudyStrip({ deckId, items, wordCount }: { deckId: string; items: Item[]; wordCount: number }) {
  const matchPairs = items.find((i) => i.mode === "match")?.n ?? 0;
  const stats = useModeStats(deckId, matchPairs);
  const suggested = suggestMode(stats);

  const line = (mode: PracticeMode, n: number): string => {
    switch (mode) {
      case "learn":
        return stats.learnPercent !== null ? `Đã thuộc ${stats.learnPercent}%` : "Chưa học";
      case "test":
        return stats.testPercent !== null ? `Lần trước ${stats.testPercent}%` : `${Math.min(n, wordCount)} câu`;
      case "match":
        return stats.matchMs !== null ? `Kỷ lục ${formatMs(stats.matchMs)}` : "Chưa có kỷ lục";
      case "flashcard":
        return `${wordCount} thẻ`;
      default:
        return "";
    }
  };

  return (
    <nav aria-label="Học bộ này" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ mode, n }) => {
        const { tone } = MODE_LOOK[mode];
        const t = TONE_CLASSES[tone];
        return (
          <Link
            key={mode}
            href={`/practice/${mode}?deck=${deckId}&n=${n}&from=deck`}
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-surface p-2.5 shadow-sm transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-border"
          >
            <span className={cn("relative block overflow-hidden rounded-md px-2 py-1.5", t.soft)}>
              <ModeArt mode={mode} className="mx-auto max-h-12" />
            </span>
            <span className="flex min-w-0 flex-col px-1 pb-0.5">
              {suggested === mode && (
                <span className="mb-1 inline-flex w-fit items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[0.8125rem] font-extrabold text-primary-fg">
                  <Sparkles className="size-2.5" strokeWidth={2.6} aria-hidden />
                  Gợi ý cho bạn
                </span>
              )}
              <span data-check-overflow className="font-bold text-fg">{MODE_INFO[mode].label}</span>
              <span className={cn("min-h-4 text-xs leading-4 font-semibold tabular-nums", t.fg)}>{line(mode, n)}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
