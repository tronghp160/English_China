"use client";

import { m } from "motion/react";
import Link from "next/link";
import { LangMark } from "@/components/lang-mark";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { WordHero } from "@/components/word/word-hero";
import { PinyinText } from "@/components/zh/pinyin-text";
import type { StudyWord } from "@/lib/practice";
import { cn } from "@/lib/utils";
import type { Example, LangExtra } from "@/lib/word-schema";
import { WordVisual } from "./word-visual";

export type Direction = "recognize" | "recall";

type Props = {
  word: StudyWord;
  direction: Direction;
  flipped: boolean;
  onFlip: () => void;
  hideImageFront: boolean;
  hidePinyinFront: boolean;
  toneColors: boolean;
  /** Tapping the back flips the card over again (free flashcard mode). */
  flipBack?: boolean;
};

/** Flip on a tap anywhere on a face, except on its own buttons and links. */
function tapToFlip(onFlip: () => void) {
  return (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button, [role=button]")) return;
    onFlip();
  };
}

/** One quiet line at the foot of a face; touch devices tap, keyboards use Space. */
function FlipHint({ children = "lật", className }: { children?: string; className?: string }) {
  return (
    <p className={cn("text-sm text-fg-subtle", className)}>
      <span className="lg:hidden">Chạm để {children}</span>
      <span className="hidden lg:inline">Nhấn Space để {children}</span>
    </p>
  );
}

/** The studied word inside an example: bold and blue, the one place it carries meaning. */
function Marked({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return text;
  const parts = text.split(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === t.toLowerCase() ? (
      <b key={i} className="font-bold text-primary">
        {p}
      </b>
    ) : (
      p
    ),
  );
}

/** The round speaker of the card (48px, pale). */
function Speaker({ word }: { word: StudyWord }) {
  return <PronounceButton text={word.term} lang={word.language} size="lg" className="bg-surface-2" />;
}

/** Front face asking for the word: the word big, its reading, the speaker. */
function TermFace({ word, toneColors, showReading, hideImage }: { word: StudyWord; toneColors: boolean; showReading: boolean; hideImage: boolean }) {
  return (
    <div className="flex min-h-[26rem] flex-col items-center gap-5 px-6 pt-5 pb-6">
      <div className="flex w-full items-center justify-between">
        <LangMark lang={word.language} label />
      </div>
      {!hideImage && <WordVisual word={word} size={120} />}
      <div className="my-auto flex w-full flex-col items-center gap-4">
        <WordHero
          lang={word.language}
          term={word.term}
          reading={word.reading}
          toneColors={toneColors}
          showReading={showReading}
          size="lg"
          align="center"
          framed={false}
          actions={<Speaker word={word} />}
        />
      </div>
      <FlipHint className="hint-pulse" />
    </div>
  );
}

/** Front face asking for the meaning (recall direction): the Vietnamese meaning is the prompt. */
function MeaningFace({ word, hideImage }: { word: StudyWord; hideImage: boolean }) {
  const zh = word.language === "zh";
  return (
    <div className="flex min-h-[26rem] flex-col items-center gap-5 px-6 pt-5 pb-6">
      <div className="flex w-full items-center justify-between">
        <LangMark lang={word.language} label />
        <span className="flex flex-wrap justify-end gap-1.5">
          {word.parts_of_speech.map((p) => (
            <PosBadge key={p} pos={p} />
          ))}
        </span>
      </div>
      {!hideImage && <WordVisual word={word} size={120} />}
      <div className="my-auto flex flex-col items-center gap-3 text-center">
        <p className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-fg">{word.meaning_vi}</p>
        <p className="text-sm text-fg-muted">{zh ? "Chữ Hán là gì?" : "Từ tiếng Anh là gì?"}</p>
      </div>
      <FlipHint className="hint-pulse" />
    </div>
  );
}

/**
 * Two-sided card (REDESIGN_V2 §6.7). Both faces share one grid cell, so the card is as tall as the taller face.
 * A strip of the language color sits on top (blue English, coral Chinese). Front = the word (or its meaning in
 * the recall direction); back = the word again, its meaning and examples.
 */
export function Flashcard({
  word,
  direction,
  flipped,
  onFlip,
  hideImageFront,
  hidePinyinFront,
  toneColors,
  flipBack = false,
}: Props) {
  const zh = word.language === "zh";
  const extra = (word.lang_extra ?? {}) as LangExtra;
  const examples = (Array.isArray(word.examples) ? (word.examples as unknown as Example[]) : []).slice(0, 2);
  const strip = <div aria-hidden className={cn("h-1.5 shrink-0", zh ? "bg-zh" : "bg-en")} />;

  return (
    <div className="flip-scene mx-auto w-full max-w-[32.5rem]">
      <m.div
        className="grid w-full [&>*]:[grid-area:1/1] [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* Front. Tapping anywhere flips; keyboard users have Space and the "Lật thẻ" button below. */}
        <div
          onClick={tapToFlip(onFlip)}
          inert={flipped}
          className={cn(
            "flip-face flex cursor-pointer flex-col overflow-hidden rounded-xl bg-surface shadow-lg dark:border dark:border-border",
            flipped && "pointer-events-none",
          )}
        >
          {strip}
          {direction === "recognize" ? (
            <TermFace word={word} toneColors={toneColors} showReading={!(zh && hidePinyinFront)} hideImage={hideImageFront} />
          ) : (
            <MeaningFace word={word} hideImage={hideImageFront} />
          )}
        </div>

        {/* Back */}
        <div
          onClick={flipBack ? tapToFlip(onFlip) : undefined}
          inert={!flipped}
          className={cn(
            "flip-face flip-back flex min-h-[26rem] flex-col overflow-hidden rounded-xl bg-surface shadow-lg dark:border dark:border-border",
            !flipped && "pointer-events-none",
            flipBack && "cursor-pointer",
          )}
        >
          {strip}
          <div className="flex flex-1 flex-col gap-4 px-6 pt-5 pb-5">
            <div className="flex items-center justify-between gap-2">
              <LangMark lang={word.language} label />
              <span className="flex flex-wrap justify-end gap-1.5">
                {word.parts_of_speech.map((p) => (
                  <PosBadge key={p} pos={p} />
                ))}
              </span>
            </div>

            {/* The word again with its sound; in the recall direction it is the answer, so it is bigger */}
            <WordHero
              lang={word.language}
              term={word.term}
              reading={word.reading}
              toneColors={toneColors}
              size={direction === "recall" ? "lg" : "md"}
              align="center"
              framed={false}
              actions={<Speaker word={word} />}
            />

            <div className="flex flex-col items-center gap-1 border-t border-border pt-4 text-center">
              <div className="flex items-center gap-3">
                <p className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-fg">{word.meaning_vi}</p>
                {direction === "recognize" && hideImageFront && <WordVisual word={word} size={56} />}
              </div>
              {word.meaning_en && <p className="text-sm text-fg-muted">{word.meaning_en}</p>}
              {zh && extra.han_viet && (
                <p className="text-sm text-fg-muted">
                  Hán Việt: <span className="font-semibold text-fg">{extra.han_viet}</span>
                </p>
              )}
            </div>

            {examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-surface-2 p-4">
                <div className="min-w-0 flex-1">
                  <p lang={zh ? "zh-CN" : "en"} className={cn("text-fg", zh ? "font-hanzi-sans text-lg font-medium" : "text-base")}>
                    <Marked text={ex.text} term={word.term} />
                  </p>
                  {zh && ex.reading && <PinyinText pinyin={ex.reading} colored={false} className="text-sm text-fg-muted" />}
                  {ex.vi && <p className="text-sm text-fg-muted">{ex.vi}</p>}
                </div>
                <PronounceButton text={ex.text} lang={word.language} size="sm" label="Đọc câu ví dụ" />
              </div>
            ))}

            {word.personal_note && <p className="rounded-md bg-streak-soft px-3 py-2 text-sm text-streak-fg">{word.personal_note}</p>}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
              {flipBack ? <FlipHint>lật lại</FlipHint> : <span />}
              <Link href={`/words/${word.id}`} className="inline-flex min-h-10 items-center rounded-md px-1 text-sm font-semibold text-primary-fg hover:underline">
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}
