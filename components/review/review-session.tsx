"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudyWord } from "@/lib/practice";
import { formatInterval } from "@/lib/format";
import { previewDue, RATINGS, schedule, type DbCard, type RatingValue } from "@/lib/srs/fsrs";
import { enqueueReview, onFlushResult } from "@/lib/srs/outbox";
import { answer, buildQueue, peek, remaining, type QueueItem } from "@/lib/srs/queue";
import { playSfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";
import { CardStack } from "./card-stack";
import { Flashcard, type Direction } from "./flashcard";
import { Flyer, RateDrag } from "./rate-drag";
import { SessionBar } from "./session-bar";
import { useSessionHud } from "./use-session-hud";
import { SessionSummary, type SessionResult } from "./session-summary";

export type ReviewItem = QueueItem & { word: StudyWord; direction: Direction };

// The colour of a rating button says what it means: red = forgot, orange = hard, blue = good, green = easy.
const RATING_TONE: Record<RatingValue, "again" | "hard" | "good" | "easy"> = { 1: "again", 2: "hard", 3: "good", 4: "easy" };

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
  const hud = useSessionHud();
  const reduced = useReducedMotion();
  const [flyer, setFlyer] = useState<{ id: number; word: StudyWord; direction: Direction; rating: RatingValue } | null>(null);
  const answerHud = hud.answer;
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
    playSfx("flip");
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
      answerHud({ correct: rating > 1 });
      playSfx("whoosh");
      if (!reduced) setFlyer({ id: results.length, word: current.word, direction: current.direction, rating });
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
    [current, flipped, answerHud, queue, now, reduced, results.length],
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
        pup={prefs.mascot ? { mood: "happy" } : undefined}
        hud={{ combo: hud.combo, xp: hud.xp, reaction: hud.reaction }}
      />
      <div className="flex flex-1 flex-col justify-center py-4">
        <CardStack
          behind={remaining(queue) - 1}
          overlay={
            flyer && (
              <Flyer key={flyer.id} rating={flyer.rating} onDone={() => setFlyer(null)}>
                <Flashcard
                  word={flyer.word}
                  direction={flyer.direction}
                  flipped
                  onFlip={() => {}}
                  hideImageFront={prefs.hide_images}
                  hidePinyinFront={prefs.hide_pinyin_front}
                  toneColors={prefs.tone_colors}
                />
              </Flyer>
            )
          }
        >
          <RateDrag enabled={flipped} onRate={rate}>
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
          </RateDrag>
        </CardStack>
        {current.isNew && (
          <Badge variant="soft" tone="orange" className="mt-3 self-center">
            Từ mới
          </Badge>
        )}
      </div>

      {/* Thumb zone */}
      <div className="sticky bottom-0 -mx-4 bg-canvas/80 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl">
        {flipped && preview ? (
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Bạn nhớ từ này thế nào?">
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                type="button"
                variant="pressable"
                tone={RATING_TONE[r.value]}
                onClick={() => rate(r.value)}
                className="h-16 flex-col gap-0 rounded-md px-1 lg:h-16"
              >
                <span className="text-base font-extrabold">{r.label}</span>
                <span className="text-xs font-normal opacity-90">{formatInterval(preview[r.value].getTime() - now.getTime())}</span>
                <kbd className="hidden font-sans text-[0.8125rem] font-normal opacity-80 lg:block">{r.key}</kbd>
              </Button>
            ))}
          </div>
        ) : (
          <Button type="button" variant="pressable" size="xl" onClick={flip} className="w-full">
            Lật thẻ
            <kbd className="hidden rounded-xs bg-white/20 px-1.5 font-sans text-xs font-normal lg:inline">Space</kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
