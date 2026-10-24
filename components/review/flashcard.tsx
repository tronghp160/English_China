"use client";

import Link from "next/link";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { Paper, WordSpecimen } from "@/components/word/word-specimen";
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
    <p className={cn("text-sm text-ink-soft", className)}>
      <span className="lg:hidden">Chạm để {children}</span>
      <span className="hidden lg:inline">Nhấn Space để {children}</span>
    </p>
  );
}

/** Front face asking for the word: the specimen itself, on notebook paper (English) or in 田字格 cells (Chinese). */
function TermFace({ word, toneColors, showReading, hideImage }: { word: StudyWord; toneColors: boolean; showReading: boolean; hideImage: boolean }) {
  const zh = word.language === "zh";
  const visual = !hideImage ? <WordVisual word={word} size={zh ? 96 : 72} /> : null;
  const sound = <PronounceButton text={word.term} lang={word.language} size="lg" />;
  if (!zh) {
    return (
      <WordSpecimen
        lang="en"
        term={word.term}
        reading={showReading ? word.reading : null}
        actions={sound}
        aside={visual}
        framed={false}
        innerClassName="flex min-h-[22rem] flex-col"
      >
        <FlipHint className="mt-auto flex h-[var(--line)] items-end" />
      </WordSpecimen>
    );
  }
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center gap-6 px-5 py-8">
      {visual}
      <WordSpecimen lang="zh" term={word.term} reading={word.reading} toneColors={toneColors} showReading={showReading} align="center" actions={sound} />
      <FlipHint />
    </div>
  );
}

/** Front face asking for the meaning (recall direction): the Vietnamese meaning written on the ruled page. */
function MeaningFace({ word, hideImage }: { word: StudyWord; hideImage: boolean }) {
  const zh = word.language === "zh";
  return (
    <Paper framed={false} innerClassName="flex min-h-[22rem] flex-col">
      {!hideImage && (
        <div className="absolute top-4 right-4">
          <WordVisual word={word} size={72} />
        </div>
      )}
      <p className="flex min-h-[calc(var(--line)*3)] flex-wrap content-end items-end gap-x-2 pr-20 text-[1.625rem] leading-[var(--line)] font-medium text-ink">
        <span className="relative top-[0.25em]">{word.meaning_vi}</span>
      </p>
      <div className="flex min-h-[var(--line)] flex-wrap items-end gap-1.5 pb-1">
        {word.parts_of_speech.map((p) => (
          <PosBadge key={p} pos={p} />
        ))}
      </div>
      <p className="flex h-[var(--line)] items-end text-sm text-ink-soft">{zh ? "Chữ Hán là gì?" : "Từ tiếng Anh là gì?"}</p>
      <FlipHint className="mt-auto flex h-[var(--line)] items-end" />
    </Paper>
  );
}

/**
 * Two-sided card. Both faces share one grid cell, so the card is as tall as the taller face.
 * Front = the word as a specimen; back = its meaning with one highlighter stroke.
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

  return (
    <div className="flip-scene w-full">
      <div className="flip-card grid w-full [&>*]:[grid-area:1/1]" data-flipped={flipped}>
        {/* Front. Tapping anywhere flips; keyboard users have Space and the "Lật thẻ" button below. */}
        <div
          onClick={tapToFlip(onFlip)}
          inert={flipped}
          className={cn(
            "flip-face sheet sheet-lift cursor-pointer overflow-hidden rounded-sheet",
            flipped && "pointer-events-none",
          )}
        >
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
            "flip-face flip-back sheet sheet-lift margin-line flex min-h-[22rem] flex-col gap-4 rounded-sheet py-5 pr-5 pl-[calc(var(--margin-x)+1rem)]",
            !flipped && "pointer-events-none",
            flipBack && "cursor-pointer",
          )}
        >
          {/* The word again with its sound; in the recall direction it is the answer, so it is bigger */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule pb-3">
            <span
              lang={zh ? "zh-CN" : "en"}
              className={cn(
                "leading-tight font-medium text-ink",
                direction === "recall" ? "text-4xl" : "text-2xl",
                zh ? "font-hanzi" : "font-display",
              )}
            >
              {word.term}
            </span>
            {word.reading &&
              (zh ? (
                <PinyinText pinyin={word.reading} colored={toneColors} className="text-lg font-medium" />
              ) : (
                <span className="font-ipa text-ink-soft">{word.reading}</span>
              ))}
            <PronounceButton text={word.term} lang={word.language} size="sm" />
          </div>

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1.5rem] leading-snug font-medium text-ink">
                <span className={cn("highlighter", flipped && "highlighter-animate")}>{word.meaning_vi}</span>
              </p>
              {word.meaning_en && <p className="mt-2 text-sm text-ink-soft">{word.meaning_en}</p>}
              {zh && extra.han_viet && (
                <p className="mt-1 text-sm text-ink-soft">
                  Hán Việt: <span className="font-medium text-ink">{extra.han_viet}</span>
                </p>
              )}
              {word.parts_of_speech.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {word.parts_of_speech.map((p) => (
                    <PosBadge key={p} pos={p} />
                  ))}
                </div>
              )}
            </div>
            {direction === "recognize" && hideImageFront && <WordVisual word={word} size={72} />}
          </div>

          {examples.length > 0 && (
            <ul className="ruled-list border-t border-rule">
              {examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p lang={zh ? "zh-CN" : "en"} className={cn("text-ink", zh && "font-hanzi text-lg")}>
                      {ex.text}
                    </p>
                    {zh && ex.reading && <PinyinText pinyin={ex.reading} colored={false} className="text-sm text-ink-soft" />}
                    {ex.vi && <p className="text-sm text-ink-soft">{ex.vi}</p>}
                  </div>
                  <PronounceButton text={ex.text} lang={word.language} size="sm" label="Đọc câu ví dụ" />
                </li>
              ))}
            </ul>
          )}

          {word.personal_note && <p className="rounded-btn bg-tint-turmeric px-3 py-2 text-sm text-ink">{word.personal_note}</p>}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            {flipBack ? <FlipHint>lật lại</FlipHint> : <span />}
            <Link href={`/words/${word.id}`} className="rounded-btn px-1 py-2 text-sm font-medium text-ink-violet hover:underline">
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
