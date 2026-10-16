"use client";

import Link from "next/link";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
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
};

function Term({
  word,
  toneColors,
  showReading,
}: {
  word: StudyWord;
  toneColors: boolean;
  showReading: boolean;
}) {
  const zh = word.language === "zh";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        lang={zh ? "zh-CN" : "en"}
        className={cn(
          "ruled-word font-bold break-words text-ink",
          zh
            ? "font-hanzi text-6xl leading-tight sm:text-7xl"
            : "text-4xl leading-tight sm:text-5xl",
        )}
      >
        {word.term}
      </span>
      <div className="flex min-h-11 items-center gap-1">
        {showReading &&
          word.reading &&
          (zh ? (
            <PinyinText
              pinyin={word.reading}
              colored={toneColors}
              className="text-xl font-medium"
            />
          ) : (
            <span className="font-ipa text-lg text-ink-soft">{word.reading}</span>
          ))}
        <PronounceButton text={word.term} lang={word.language} size="lg" />
      </div>
    </div>
  );
}

function Meaning({ word, large }: { word: StudyWord; large?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className={cn("font-semibold text-ink", large ? "text-3xl" : "text-2xl")}>
        {word.meaning_vi}
      </p>
      {word.parts_of_speech.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {word.parts_of_speech.map((p) => (
            <PosBadge key={p} pos={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Two-sided card. Both faces share one grid cell, so the card is as tall as the taller face. */
export function Flashcard({
  word,
  direction,
  flipped,
  onFlip,
  hideImageFront,
  hidePinyinFront,
  toneColors,
}: Props) {
  const zh = word.language === "zh";
  const extra = (word.lang_extra ?? {}) as LangExtra;
  const examples = (
    Array.isArray(word.examples) ? (word.examples as unknown as Example[]) : []
  ).slice(0, 2);

  const front =
    direction === "recognize" ? (
      <>
        {!hideImageFront && <WordVisual word={word} />}
        <Term word={word} toneColors={toneColors} showReading={!(zh && hidePinyinFront)} />
      </>
    ) : (
      <>
        {!hideImageFront && <WordVisual word={word} />}
        <Meaning word={word} large />
        <p className="text-sm text-ink-soft">{zh ? "Chữ Hán là gì?" : "Từ tiếng Anh là gì?"}</p>
      </>
    );

  return (
    <div className="flip-scene w-full">
      <div className="flip-card grid w-full [&>*]:[grid-area:1/1]" data-flipped={flipped}>
        {/* Front */}
        {/* Tapping anywhere flips; keyboard users have Space and the "Lật thẻ" button below. */}
        <div
          onClick={onFlip}
          inert={flipped}
          className={cn(
            "flip-face notebook-card flex min-h-[22rem] cursor-pointer flex-col items-center justify-center gap-5 px-5 py-8",
            flipped && "pointer-events-none",
          )}
        >
          {front}
          <span className="mt-2 text-sm text-ink-soft">Chạm để lật</span>
        </div>

        {/* Back */}
        <div
          inert={!flipped}
          className={cn(
            "flip-face flip-back notebook-card flex min-h-[22rem] flex-col gap-5 px-5 py-6",
            !flipped && "pointer-events-none",
          )}
        >
          <div className="flex flex-col items-center gap-4">
            {direction === "recall" && <Term word={word} toneColors={toneColors} showReading />}
            {direction === "recognize" && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-rule pb-3">
                <span
                  lang={zh ? "zh-CN" : "en"}
                  className={cn("font-bold text-ink", zh ? "font-hanzi text-3xl" : "text-2xl")}
                >
                  {word.term}
                </span>
                {word.reading &&
                  (zh ? (
                    <PinyinText
                      pinyin={word.reading}
                      colored={toneColors}
                      className="text-lg font-medium"
                    />
                  ) : (
                    <span className="font-ipa text-ink-soft">{word.reading}</span>
                  ))}
                <PronounceButton text={word.term} lang={word.language} size="sm" />
              </div>
            )}
            {direction === "recognize" && hideImageFront && <WordVisual word={word} size={88} />}
            <Meaning word={word} />
            {word.meaning_en && (
              <p className="text-center text-sm text-ink-soft">{word.meaning_en}</p>
            )}
            {zh && extra.han_viet && (
              <p className="text-sm text-ink-soft">
                Hán Việt: <span className="font-medium text-ink">{extra.han_viet}</span>
              </p>
            )}
          </div>

          {examples.length > 0 && (
            <ul className="ruled-list border-t border-rule">
              {examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p
                      lang={zh ? "zh-CN" : "en"}
                      className={cn("text-ink", zh && "font-hanzi text-lg")}
                    >
                      {ex.text}
                    </p>
                    {zh && ex.reading && (
                      <PinyinText
                        pinyin={ex.reading}
                        colored={false}
                        className="text-sm text-ink-soft"
                      />
                    )}
                    {ex.vi && <p className="text-sm text-ink-soft">{ex.vi}</p>}
                  </div>
                  <PronounceButton
                    text={ex.text}
                    lang={word.language}
                    size="sm"
                    label="Đọc câu ví dụ"
                  />
                </li>
              ))}
            </ul>
          )}

          {word.personal_note && (
            <p className="rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
              {word.personal_note}
            </p>
          )}

          <Link
            href={`/words/${word.id}`}
            className="mt-auto self-center rounded-[10px] px-3 py-2 text-sm text-ink-blue hover:underline"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
