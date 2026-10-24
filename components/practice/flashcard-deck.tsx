"use client";

import { ArrowLeftRight, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { EndPup } from "@/components/mascot/end-pup";
import { Flashcard, type Direction } from "@/components/review/flashcard";
import { SealStamp } from "@/components/review/seal-stamp";
import { SessionBar, useOutboxStatus } from "@/components/review/session-bar";
import { Button } from "@/components/ui/button";
import { shuffle, type StudyWord } from "@/lib/practice";
import { enqueueReview } from "@/lib/srs/outbox";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

type Mark = "known" | "learning";

const SWIPE_PX = 80;

function isInteractive(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName))
  );
}

/**
 * Free flashcards: flip back and forth, move with buttons, arrow keys or a
 * swipe, and sort cards into "đã thuộc" / "chưa thuộc". A new round can repeat
 * only the cards still being learned.
 */
export function FlashcardDeck({
  words,
  countsToSrs,
  exitHref,
}: {
  words: StudyWord[];
  countsToSrs: boolean;
  exitHref: string;
}) {
  const { prefs } = useMe();
  const sync = useOutboxStatus();
  const [cards, setCards] = useState(words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<Direction>("recognize");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const shownAt = useRef(0);
  const recorded = useRef(new Set<string>());
  const word = cards[index];

  const say = useCallback(
    (w: StudyWord) =>
      speak(w.term, w.language, {
        voiceName: w.language === "en" ? prefs.voice_en : prefs.voice_zh,
        rate: prefs.tts_rate,
      }),
    [prefs],
  );

  useEffect(() => {
    shownAt.current = Date.now();
  }, [word, round]);

  const go = useCallback(
    (to: number) => {
      if (to < 0) return;
      setFlipped(false);
      if (to >= cards.length) setFinished(true);
      else setIndex(to);
    },
    [cards.length],
  );

  const flip = useCallback(() => {
    if (!word) return;
    setFlipped((f) => {
      if (!f && prefs.auto_speak) say(word);
      return !f;
    });
  }, [prefs.auto_speak, say, word]);

  const mark = useCallback(
    (m: Mark) => {
      if (!word) return;
      // One review per card per round; changing the mark later only re-sorts it.
      const key = `${round}:${word.id}`;
      if (!recorded.current.has(key)) {
        recorded.current.add(key);
        void enqueueReview({
          clientId: crypto.randomUUID(),
          wordId: word.id,
          direction,
          mode: "flashcard",
          rating: m === "known" ? 3 : 1,
          wasCorrect: m === "known",
          durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
          reviewedAt: new Date().toISOString(),
          updateCard: countsToSrs,
        });
      }
      setMarks((prev) => ({ ...prev, [word.id]: m }));
      go(index + 1);
    },
    [countsToSrs, direction, go, index, round, word],
  );

  function reshuffle() {
    setCards((c) => shuffle(c));
    setIndex(0);
    setFlipped(false);
  }

  function restart(onlyLearning: boolean) {
    const next = onlyLearning ? cards.filter((c) => marks[c.id] !== "known") : words;
    setCards(next.length ? next : words);
    setMarks({});
    setIndex(0);
    setFlipped(false);
    setFinished(false);
    setRound((r) => r + 1);
  }

  useEffect(() => {
    if (finished) return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter keeps activating a focused button; Space always flips (it would otherwise
      // re-press the mark button the user just clicked).
      if (e.key === "Enter" && isInteractive(e.target)) return;
      if ([" ", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "1") mark("learning");
      else if (e.key === "2") mark("known");
      else if ((e.key === "r" || e.key === "R") && word) say(word);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, flip, go, index, mark, say, word]);

  const known = cards.filter((c) => marks[c.id] === "known").length;
  const learning = cards.filter((c) => marks[c.id] === "learning").length;

  if (finished || !word) {
    const left = cards.filter((c) => marks[c.id] !== "known");
    return (
      <div className="flex flex-1 flex-col py-6">
        <div className="flex items-end justify-center gap-1">
          <EndPup mood={left.length === 0 || known >= left.length ? "cheer" : "happy"} size={96} />
          {left.length === 0 && <SealStamp text="Thuộc" size={84} />}
        </div>
        <h1 className="mt-6 text-center text-xl">Hết thẻ rồi!</h1>
        <p className="mt-2 text-center text-ink">
          {left.length === 0 ? "Bạn đã thuộc hết cả bộ thẻ này." : `Còn ${left.length} thẻ cần học thêm.`}
        </p>

        <dl className="mt-6 border-t border-rule">
          <div className="flex items-baseline justify-between border-b border-rule py-3">
            <dt className="flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="size-2.5 rounded-full bg-leaf" />
              Đã thuộc
            </dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{known}</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-rule py-3">
            <dt className="flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="size-2.5 rounded-full bg-seal" />
              Chưa thuộc
            </dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{left.length}</dd>
          </div>
        </dl>

        {sync.pending > 0 && (
          <p role="status" className="mt-4 rounded-btn bg-tint-turmeric px-3 py-2 text-sm text-ink">
            Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng.
          </p>
        )}

        {left.length > 0 && (
          <section className="mt-8" aria-labelledby="deck-left">
            <h2 id="deck-left" className="mb-2 text-base">
              Thẻ chưa thuộc ({left.length})
            </h2>
            <ul className="ruled-list border-y border-rule">
              {left.map((w) => (
                <li key={w.id}>
                  <Link href={`/words/${w.id}`} className="flex min-h-12 items-center gap-3 px-1 py-2 transition-colors hover:bg-surface-sunk">
                    <span lang={w.language === "zh" ? "zh-CN" : "en"} className={cn("text-lg font-medium text-ink", w.language === "zh" ? "font-hanzi" : "font-display")}>
                      {w.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{w.meaning_vi}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          {left.length > 0 && (
            <Button type="button" size="lg" className="flex-1" onClick={() => restart(true)}>
              <RotateCcw aria-hidden />
              Học lại {left.length} thẻ chưa thuộc
            </Button>
          )}
          <Button type="button" size="lg" variant={left.length > 0 ? "outline" : "default"} className="flex-1" onClick={() => restart(false)}>
            Lật lại cả bộ
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1">
            <Link href={exitHref}>Xong</Link>
          </Button>
        </div>
      </div>
    );
  }

  const current = marks[word.id];

  function cancelDrag() {
    dragStart.current = null;
    setDrag(0);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SessionBar done={index} total={cards.length} exitHref={exitHref} />

      <div className="flex items-center gap-2">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-ink-soft">
          <span className="font-medium">
            Thẻ {index + 1}/{cards.length}
            {round > 1 && ` (lượt ${round})`}
          </span>
          <span className="flex items-center gap-3" aria-label={`${known} đã thuộc, ${learning} chưa thuộc`}>
            <span aria-hidden className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="size-2 rounded-full bg-leaf" />
              {known}
            </span>
            <span aria-hidden className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="size-2 rounded-full bg-seal" />
              {learning}
            </span>
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDirection((d) => (d === "recognize" ? "recall" : "recognize"));
            setFlipped(false);
          }}
        >
          <ArrowLeftRight aria-hidden />
          {direction === "recognize" ? "Từ trước" : "Nghĩa trước"}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={reshuffle} aria-label="Xáo trộn thẻ">
          <Shuffle aria-hidden />
        </Button>
      </div>

      {/* Swipe left/right to move; a tap (no drag) flips. */}
      <div
        className="flex flex-1 touch-pan-y flex-col justify-center py-4 select-none"
        onPointerDown={(e) => {
          dragStart.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
        }}
        onPointerMove={(e) => {
          const s = dragStart.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > Math.abs(e.clientY - s.y) && Math.abs(dx) > 8) setDrag(dx);
        }}
        onPointerUp={() => {
          if (Math.abs(drag) > 8) swiped.current = true;
          if (drag <= -SWIPE_PX) go(index + 1);
          else if (drag >= SWIPE_PX) go(index - 1);
          dragStart.current = null;
          setDrag(0);
        }}
        onPointerCancel={cancelDrag}
        onPointerLeave={cancelDrag}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        <div
          className={cn(drag === 0 && "transition-transform duration-200")}
          style={drag ? { transform: `translateX(${drag}px) rotate(${Math.max(-6, Math.min(6, drag / 20))}deg)` } : undefined}
        >
          <Flashcard
            key={`${round}:${index}:${direction}`}
            word={word}
            direction={direction}
            flipped={flipped}
            onFlip={flip}
            flipBack
            hideImageFront={prefs.hide_images}
            hidePinyinFront={prefs.hide_pinyin_front}
            toneColors={prefs.tone_colors}
          />
        </div>
        <p className="mt-3 text-center text-sm text-ink-soft">
          <span className="hidden lg:inline">Mũi tên chuyển thẻ, Space lật, phím 1 và 2 để đánh dấu</span>
          <span className="lg:hidden">Vuốt trái/phải để chuyển thẻ</span>
        </p>
      </div>

      {/* Thumb zone */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-paper/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-sm">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Thẻ trước" className="w-13 shrink-0 px-0">
            <ChevronLeft className="size-6" aria-hidden />
          </Button>
          <Button type="button" size="lg" onClick={flip} className="flex-1">
            {flipped ? "Lật lại" : "Lật thẻ"}
            <kbd className="hidden rounded-sm border border-primary-foreground/40 px-1.5 font-sans text-xs font-normal lg:inline">Space</kbd>
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => go(index + 1)} aria-label="Thẻ sau" className="w-13 shrink-0 px-0">
            <ChevronRight className="size-6" aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Đánh dấu thẻ">
          <button
            type="button"
            onClick={() => mark("learning")}
            aria-pressed={current === "learning"}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-btn border border-t-[3px] border-rule-strong border-t-seal font-semibold text-ink transition-colors hover:bg-surface-sunk",
              current === "learning" ? "bg-tint-seal" : "bg-surface",
            )}
          >
            Chưa thuộc
            <kbd className="hidden font-sans text-xs font-normal text-ink-faint lg:inline">1</kbd>
          </button>
          <button
            type="button"
            onClick={() => mark("known")}
            aria-pressed={current === "known"}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-btn border border-t-[3px] border-rule-strong border-t-leaf font-semibold text-ink transition-colors hover:bg-surface-sunk",
              current === "known" ? "bg-tint-leaf" : "bg-surface",
            )}
          >
            Đã thuộc
            <kbd className="hidden font-sans text-xs font-normal text-ink-faint lg:inline">2</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
