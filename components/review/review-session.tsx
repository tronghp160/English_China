"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudyWord } from "@/lib/practice";
import { formatInterval } from "@/lib/format";
import { previewDue, RATINGS, schedule, type DbCard, type RatingValue } from "@/lib/srs/fsrs";
import { enqueueReview, onFlushResult } from "@/lib/srs/outbox";
import { answer, buildQueue, peek, remaining, type QueueItem } from "@/lib/srs/queue";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { Flashcard, type Direction } from "./flashcard";
import { SessionBar } from "./session-bar";
import { SessionSummary, type SessionResult } from "./session-summary";

export type ReviewItem = QueueItem & { word: StudyWord; direction: Direction };

// The colour of the top edge says what the rating means: seal = forgot, turmeric = hard, violet = good, leaf = easy.
const RATING_EDGE: Record<RatingValue, string> = {
  1: "border-t-danger",
  2: "border-t-streak",
  3: "border-t-primary",
  4: "border-t-success",
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function ReviewSession({
  items,
  exitHref,
  tomorrowDue,
}: {
  items: ReviewItem[];
  exitHref: string;
  tomorrowDue: number;
}) {
  const { prefs } = useMe();
  const [queue, setQueue] = useState(() => buildQueue(items));
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [bonusXp, setBonusXp] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  // Snapshot "now" when a card appears so previews match what gets submitted.
  const [now, setNow] = useState(() => new Date());
  const current = useMemo(() => peek(queue, now), [queue, now]);
  const preview = useMemo(() => (current ? previewDue(current.card, now) : null), [current, now]);

  useEffect(() => onFlushResult((r) => setBonusXp((b) => b + (r.stats?.goal_bonus ?? 0))), []);

  const speakTerm = useCallback(
    (word: StudyWord) =>
      speak(word.term, word.language, {
        voiceName: word.language === "en" ? prefs.voice_en : prefs.voice_zh,
        rate: prefs.tts_rate,
      }),
    [prefs],
  );

  const flip = useCallback(() => {
    if (!current || flipped) return;
    setFlipped(true);
    if (prefs.auto_speak) speakTerm(current.word);
  }, [current, flipped, prefs.auto_speak, speakTerm]);

  const rate = useCallback(
    (rating: RatingValue) => {
      if (!current || !flipped) return;
      // Schedule at the same instant the button labels were computed for, so the
      // interval shown is exactly the one the server stores (fuzz is time-seeded).
      const at = now;
      const card: DbCard = schedule(current.card, rating, at);
      void enqueueReview({
        clientId: crypto.randomUUID(),
        wordId: current.word.id,
        direction: current.direction,
        mode: "flashcard",
        rating,
        wasCorrect: rating > 1,
        durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
        reviewedAt: at.toISOString(),
        updateCard: true,
      });
      const nextQueue = answer(queue, current, { ...current, card }, rating === 1, at);
      setResults((r) => [
        ...r,
        {
          wordId: current.word.id,
          term: current.word.term,
          language: current.word.language,
          meaning: current.word.meaning_vi,
          rating,
        },
      ]);
      setQueue(nextQueue);
      setFlipped(false);
      const nextNow = new Date();
      setNow(nextNow);
      shownAt.current = nextNow.getTime();
      if (!remaining(nextQueue)) setFinishedAt(Date.now());
    },
    [current, flipped, queue, now],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === " " || e.key === "Enter") {
        if (!flipped) {
          e.preventDefault();
          flip();
        }
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        if (flipped) {
          e.preventDefault();
          rate(Number(e.key) as RatingValue);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (current) speakTerm(current.word);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flip, flipped, rate, speakTerm]);

  if (!current || finishedAt) {
    return (
      <SessionSummary
        results={results}
        durationMs={(finishedAt ?? startedAt) - startedAt}
        xp={results.length + bonusXp}
        tomorrowDue={tomorrowDue}
        exitHref={exitHref}
      />
    );
  }

  const done = results.length;
  const total = done + remaining(queue);

  return (
    <div className="flex flex-1 flex-col">
      <SessionBar
        done={done}
        total={total}
        exitHref={exitHref}
        pup={
          prefs.mascot
            ? {
                // Again → sad, Hard → think, Good → wink, Easy → cheer.
                mood: !results.length ? "happy" : (["sad", "think", "wink", "cheer"] as const)[results.at(-1)!.rating - 1],
              }
            : undefined
        }
      />
      <div className="flex flex-1 flex-col justify-center py-4">
        <Flashcard
          key={`${current.key}:${done}`}
          word={current.word}
          direction={current.direction}
          flipped={flipped}
          onFlip={flip}
          hideImageFront={prefs.hide_images}
          hidePinyinFront={prefs.hide_pinyin_front}
          toneColors={prefs.tone_colors}
        />
        {current.isNew && (
          <Badge variant="outline" className="mt-3 self-center">
            Từ mới
          </Badge>
        )}
      </div>

      {/* Thumb zone */}
      <div className="sticky bottom-0 -mx-4 bg-canvas/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-sm">
        {flipped && preview ? (
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Bạn nhớ từ này thế nào?">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => rate(r.value)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md border border-t-[3px] border-border-strong bg-surface px-1 text-fg transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 active:translate-y-px",
                  RATING_EDGE[r.value],
                )}
              >
                <span className="text-base font-semibold">{r.label}</span>
                <span className="text-xs text-fg-muted">{formatInterval(preview[r.value].getTime() - now.getTime())}</span>
                <kbd className="hidden font-sans text-[0.6875rem] text-fg-subtle lg:block">{r.key}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <Button type="button" size="lg" onClick={flip} className="w-full">
            Lật thẻ
            <kbd className="hidden rounded-sm border border-primary-foreground/40 px-1.5 font-sans text-xs font-normal lg:inline">Space</kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
