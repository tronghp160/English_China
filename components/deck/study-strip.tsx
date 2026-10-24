"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { MODE_LOOK } from "@/components/practice/mode-look";
import type { PracticeMode } from "@/lib/lang/registry";
import { MODE_INFO } from "@/lib/practice/questions";
import { initLearn } from "@/lib/practice/learn";
import { loadLearn } from "@/lib/practice/learn-store";
import { formatMs } from "@/lib/practice/match";
import { getMatchRecord } from "@/lib/practice/match-records";

type Item = { mode: PracticeMode; n: number };

/**
 * "Học bộ này": the four quick ways in as one strip of cells under a shared outline.
 * The line under each name is only what is really known on this device (unfinished Learn progress,
 * the Match record, the card count); nothing is made up while it loads.
 */
export function StudyStrip({ deckId, items, wordCount }: { deckId: string; items: Item[]; wordCount: number }) {
  const me = useOptionalMe();
  const userId = me?.userId;
  const [learnLeft, setLearnLeft] = useState<number | null>(null);
  const [matchBest, setMatchBest] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadLearn(userId, `${deckId}:all`).then((raw) => {
      const state = raw as ReturnType<typeof initLearn> | null;
      if (alive && state?.version === 1 && Array.isArray(state.words)) {
        const left = state.words.filter((w) => w.level < 2).length;
        setLearnLeft(left);
      }
    });
    const pairs = items.find((i) => i.mode === "match")?.n;
    if (pairs) getMatchRecord(userId, deckId, pairs).then((r) => alive && r && setMatchBest(r.ms));
    return () => {
      alive = false;
    };
  }, [userId, deckId, items]);

  const hint = (mode: PracticeMode, n: number): string | null => {
    switch (mode) {
      case "learn":
        return learnLeft !== null ? `còn ${learnLeft} từ` : null;
      case "test":
        return `${Math.min(n, wordCount)} câu`;
      case "match":
        return matchBest !== null ? `kỷ lục ${formatMs(matchBest)}` : null;
      case "flashcard":
        return `${wordCount} thẻ`;
      default:
        return null;
    }
  };

  return (
    <nav aria-label="Học bộ này" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-4">
      {items.map(({ mode, n }) => {
        const Icon = MODE_LOOK[mode].icon;
        const line = hint(mode, n);
        return (
          <Link
            key={mode}
            href={`/practice/${mode}?deck=${deckId}&n=${n}&from=deck`}
            className="flex min-h-16 flex-col justify-center gap-0.5 bg-surface px-4 py-3 transition-colors hover:bg-surface-sunk"
          >
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
              {MODE_INFO[mode].label}
            </span>
            <span className="min-h-4 text-xs leading-4 text-ink-soft">{line}</span>
          </Link>
        );
      })}
    </nav>
  );
}
