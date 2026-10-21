"use client";

import { ArrowLeftRight, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Confetti } from "@/components/review/confetti";
import { Flashcard, type Direction } from "@/components/review/flashcard";
import { SessionBar, useOutboxStatus } from "@/components/review/session-bar";
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
      <div className="relative flex flex-1 flex-col py-6">
        {known > 0 && <Confetti />}
        <span aria-hidden className="animate-float self-center text-7xl">
          {left.length === 0 ? "🏆" : known >= left.length ? "😎" : "💪"}
        </span>
        <h1 className="mt-3 text-center text-2xl text-ink">
          <span className="highlighter highlighter-animate">Hết thẻ rồi!</span>
        </h1>
        <p className="mt-2 text-center font-semibold text-ink">
          {left.length === 0
            ? "Bạn đã thuộc hết cả bộ thẻ này."
            : `Còn ${left.length} thẻ cần học thêm.`}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-card bg-wash-jade p-4 text-center">
            <p className="text-3xl font-extrabold text-jade-text">{known}</p>
            <p className="text-sm text-ink">😎 Đã thuộc</p>
          </div>
          <div className="rounded-card bg-wash-red p-4 text-center">
            <p className="text-3xl font-extrabold text-danger">{left.length}</p>
            <p className="text-sm text-ink">😵 Chưa thuộc</p>
          </div>
        </div>

        {sync.pending > 0 && (
          <p role="status" className="mt-4 rounded-btn bg-wash-yellow px-3 py-2 text-sm text-ink">
            Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có
            mạng.
          </p>
        )}

        {left.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-base text-ink">Thẻ chưa thuộc ({left.length})</h2>
            <ul className="ruled-list overflow-hidden rounded-card border border-rule bg-surface shadow-card">
              {left.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/words/${w.id}`}
                    className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-muted"
                  >
                    <span
                      lang={w.language === "zh" ? "zh-CN" : "en"}
                      className={cn(
                        "font-semibold text-ink",
                        w.language === "zh" && "font-hanzi text-lg",
                      )}
                    >
                      {w.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {w.meaning_vi}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          {left.length > 0 && (
            <button
              type="button"
              onClick={() => restart(true)}
              className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-btn bg-primary px-4 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
            >
              <RotateCcw className="size-5" aria-hidden />
              Học lại {left.length} thẻ chưa thuộc
            </button>
          )}
          <button
            type="button"
            onClick={() => restart(false)}
            className={cn(
              "btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn px-4 text-lg font-bold",
              left.length > 0
                ? "border-2 border-rule bg-surface text-ink [--edge-color:var(--rule)]"
                : "bg-primary text-primary-foreground [--edge-color:var(--ink-blue-shade)]",
            )}
          >
            Lật lại cả bộ
          </button>
          <Link
            href={exitHref}
            className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
          >
            Xong
          </Link>
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
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink-soft">
          Thẻ {index + 1}/{cards.length}
          {round > 1 && ` · lượt ${round}`}
          <span className="ml-2 whitespace-nowrap" aria-label={`${known} đã thuộc, ${learning} chưa thuộc`}>
            <span aria-hidden>😎 {known} · 😵 {learning}</span>
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setDirection((d) => (d === "recognize" ? "recall" : "recognize"));
            setFlipped(false);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-btn px-3 text-sm font-semibold text-ink-soft hover:bg-muted hover:text-ink"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
          {direction === "recognize" ? "Từ trước" : "Nghĩa trước"}
        </button>
        <button
          type="button"
          onClick={reshuffle}
          aria-label="Xáo trộn thẻ"
          className="grid size-11 place-items-center rounded-btn text-ink-soft hover:bg-muted hover:text-ink"
        >
          <Shuffle className="size-5" aria-hidden />
        </button>
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
          style={drag ? { transform: `translateX(${drag}px) rotate(${drag / 24}deg)` } : undefined}
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
          <span className="hidden lg:inline">← → chuyển thẻ · Space lật · 1/2 đánh dấu</span>
          <span className="lg:hidden">Vuốt trái/phải để chuyển thẻ</span>
        </p>
      </div>

      {/* Thumb zone */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-paper/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Thẻ trước"
            className="btn-3d grid min-h-14 w-14 shrink-0 place-items-center rounded-btn border-2 border-rule bg-surface text-ink [--edge-color:var(--rule)] disabled:opacity-40"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={flip}
            className="btn-3d flex min-h-14 flex-1 items-center justify-center gap-2 rounded-btn bg-primary text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            {flipped ? "Lật lại" : "Lật thẻ"}
            <kbd className="hidden rounded border border-primary-foreground/30 px-1.5 text-xs font-normal lg:inline">
              Space
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Thẻ sau"
            className="btn-3d grid min-h-14 w-14 shrink-0 place-items-center rounded-btn border-2 border-rule bg-surface text-ink [--edge-color:var(--rule)]"
          >
            <ChevronRight className="size-6" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Đánh dấu thẻ">
          <button
            type="button"
            onClick={() => mark("learning")}
            aria-pressed={current === "learning"}
            className={cn(
              "btn-3d flex min-h-12 items-center justify-center gap-2 rounded-btn border-2 font-bold text-danger [--edge-color:var(--margin-red)]",
              current === "learning"
                ? "border-margin-red bg-wash-red"
                : "border-margin-red/40 bg-wash-red/60",
            )}
          >
            <span aria-hidden>😵</span> Chưa thuộc
            <kbd className="hidden text-xs font-normal opacity-60 lg:inline">1</kbd>
          </button>
          <button
            type="button"
            onClick={() => mark("known")}
            aria-pressed={current === "known"}
            className={cn(
              "btn-3d flex min-h-12 items-center justify-center gap-2 rounded-btn border-2 font-bold text-jade-text [--edge-color:var(--jade)]",
              current === "known" ? "border-jade bg-wash-jade" : "border-jade/40 bg-wash-jade/60",
            )}
          >
            <span aria-hidden>😎</span> Đã thuộc
            <kbd className="hidden text-xs font-normal opacity-60 lg:inline">2</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
