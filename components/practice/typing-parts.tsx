"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StudyWord } from "@/lib/practice";
import { diffChars, hintMask, maxHints, type DiffChar } from "@/lib/practice/typing-diff";
import { cn } from "@/lib/utils";

/** Typing-question parts shared by the practice and learn sessions (REDESIGN_V3 §8.7). */

/**
 * "Gợi ý" under the input: each tap shows one more letter of the word ("a _ _ _ _"). The parent keys it by
 * question so the count starts again on the next one.
 */
export function TypingHint({ word }: { word: StudyWord }) {
  const [shown, setShown] = useState(0);
  const zh = word.language === "zh";
  const max = maxHints(word.term);
  if (max === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant="soft" tone="sun" className="h-11 gap-1.5" disabled={shown >= max} onClick={() => setShown((n) => n + 1)}>
        <Lightbulb className="size-4" strokeWidth={2} aria-hidden />
        {shown ? "Gợi ý thêm" : "Gợi ý"}
      </Button>
      {shown > 0 && (
        <p
          aria-live="polite"
          lang={zh ? "zh-CN" : "en"}
          className={cn("flex flex-wrap justify-center gap-x-1.5 text-2xl font-extrabold tracking-[0.25em] text-c-sun-fg", zh ? "font-hanzi" : "font-display")}
        >
          <span className="sr-only">Gợi ý: </span>
          {hintMask(word.term, shown, zh ? "□" : "_")}
        </p>
      )}
    </div>
  );
}

function Letters({ chars, tone }: { chars: DiffChar[]; tone: "bad" | "missing" }) {
  return (
    <span className="inline-flex flex-wrap">
      {chars.map((c, i) => (
        <span
          key={i}
          className={cn(
            "whitespace-pre",
            c.ok ? "text-fg" : tone === "bad" ? "rounded-xs bg-danger-soft px-px text-danger-fg" : "rounded-xs bg-success-soft px-px text-success-fg underline decoration-2 underline-offset-4",
          )}
        >
          {c.ch}
        </span>
      ))}
    </span>
  );
}

/** After a wrong or nearly right answer: what was typed with the slips marked, over the answer with the missing letters marked. */
export function TypingDiff({ typed, word }: { typed: string; word: StudyWord }) {
  if (!typed.trim()) return null;
  const d = diffChars(typed, word.term);
  const zh = word.language === "zh";
  return (
    <dl lang={zh ? "zh-CN" : "en"} className={cn("grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 rounded-lg bg-surface-2 px-4 py-3 text-xl font-bold", zh ? "font-hanzi" : "font-display")}>
      <dt className="font-sans text-sm font-semibold text-fg-muted">Bạn gõ</dt>
      <dd>
        <Letters chars={d.typed} tone="bad" />
      </dd>
      <dt className="font-sans text-sm font-semibold text-fg-muted">Đáp án</dt>
      <dd>
        <Letters chars={d.answer} tone="missing" />
      </dd>
    </dl>
  );
}
