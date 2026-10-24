"use client";

import { Check, Volume2, X } from "lucide-react";
import { useCallback, type Ref } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { WordHero } from "@/components/word/word-hero";
import { answerMood, say, seedOf } from "@/lib/mascot/lines";
import { TONE_GLYPH, type StudyWord } from "@/lib/practice";
import type { Option } from "@/lib/practice/questions";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

/** Question building blocks shared by the practice, test and learn sessions. */

export type Outcome = { correct: boolean; close?: boolean; picked?: string };

export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function useSpeak() {
  const { prefs } = useMe();
  return useCallback(
    (word: StudyWord) =>
      speak(word.term, word.language, {
        voiceName: word.language === "en" ? prefs.voice_en : prefs.voice_zh,
        rate: prefs.tts_rate,
      }),
    [prefs],
  );
}

/** The word as a medium specimen: in bold type with the pinyin under each character. */
export function TermLine({ word, showReading = true, bare = false }: { word: StudyWord; showReading?: boolean; bare?: boolean }) {
  const { prefs } = useMe();
  // Inside a page that already has its own surface (the test sheet) an English word is just set in type.
  if (bare && word.language === "en")
    return (
      <div className="flex flex-col items-center gap-1 text-center">
        <span lang="en" className="font-display text-3xl font-medium text-fg">
          {word.term}
        </span>
        {showReading && word.reading && <span className="font-ipa text-fg-muted">{word.reading}</span>}
      </div>
    );
  return (
    <WordHero
      lang={word.language}
      term={word.term}
      reading={word.reading}
      size="md"
      toneColors={prefs.tone_colors}
      showReading={showReading}
      align="center"
      framed={false}
      className="w-full max-w-md"
    />
  );
}

/** The Vietnamese meaning on a soft card, with the part-of-speech tags under it. */
export function MeaningLine({ word, bare = false }: { word: StudyWord; bare?: boolean }) {
  if (bare)
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-2xl font-medium text-fg">{word.meaning_vi}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {word.parts_of_speech.map((p) => (
            <PosBadge key={p} pos={p} />
          ))}
        </div>
      </div>
    );
  return (
    <div className="w-full max-w-md rounded-xl bg-surface-2 p-5">
      <p className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-fg">{word.meaning_vi}</p>
      <div className="flex flex-wrap items-center gap-1.5 pt-2">
        {word.parts_of_speech.map((p) => (
          <PosBadge key={p} pos={p} />
        ))}
      </div>
    </div>
  );
}

/** Round play button: 72px sun yellow when it is the centre of a question, 44px pale otherwise. */
export function ReplayButton({ word, big }: { word: StudyWord; big?: boolean }) {
  const say = useSpeak();
  return (
    <button
      type="button"
      onClick={() => say(word)}
      aria-label="Nghe lại"
      className={cn(
        "grid place-items-center rounded-full transition-[background-color,transform] active:scale-95",
        big ? "size-[4.5rem] bg-c-sun text-c-sun-fg shadow-sm hover:brightness-95" : "size-11 bg-surface-2 text-primary hover:bg-primary-soft",
      )}
    >
      <Volume2 className={big ? "size-8" : "size-5"} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function Options({
  options,
  answerId,
  outcome,
  onPick,
  lang,
  big,
  selected,
  letters,
}: {
  options: Option[];
  answerId: string;
  outcome: Outcome | null;
  onPick: (id: string) => void;
  lang?: "zh" | "en";
  big?: boolean;
  /** Test mode: the chosen option before grading (can still change). */
  selected?: string | null;
  /** A–D badges on every screen instead of the 1–4 keyboard hints. */
  letters?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Các đáp án">
      {options.map((o, i) => {
        const isAnswer = o.id === answerId;
        const picked = outcome?.picked === o.id;
        const chosen = !outcome && selected === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={!!outcome}
            aria-pressed={selected !== undefined && !outcome ? chosen : undefined}
            onClick={() => onPick(o.id)}
            lang={lang === "zh" ? "zh-CN" : undefined}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-semibold text-fg transition-[background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] disabled:cursor-default",
              !outcome && !chosen && "border-border bg-surface shadow-[0_3px_0_0_var(--border)] hover:bg-surface-2 active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--border)]",
              chosen && "border-primary bg-primary-soft shadow-[0_3px_0_0_var(--primary)]",
              outcome && isAnswer && "border-success bg-success-soft text-success-fg",
              outcome && picked && !isAnswer && "animate-shake border-danger bg-danger-soft text-danger-fg",
              outcome && !isAnswer && !picked && "border-border bg-surface opacity-60",
              big && "text-2xl",
              lang === "zh" && "font-hanzi text-2xl",
            )}
          >
            {letters ? (
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border font-sans text-xs font-semibold",
                  chosen ? "border-primary bg-primary text-on-primary" : "border-border-strong text-fg-muted",
                )}
              >
                {"ABCDEF"[i]}
              </span>
            ) : (
              <kbd className="hidden size-6 shrink-0 place-items-center rounded-xs bg-surface-2 font-sans text-xs font-semibold text-fg-muted lg:grid">
                {i + 1}
              </kbd>
            )}
            <span className="min-w-0 flex-1 break-words">{o.label}</span>
            {outcome && isAnswer && (
              <Check className="size-5 shrink-0 animate-pop text-success-fg" strokeWidth={3} aria-label="Đáp án đúng" />
            )}
            {outcome && picked && !isAnswer && (
              <X className="size-5 shrink-0 text-danger-fg" strokeWidth={3} aria-label="Bạn chọn" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function toneLabel(pattern: string) {
  return pattern
    .split("-")
    .map((t) => TONE_GLYPH[t] ?? t)
    .join(" ");
}

const VERDICT = {
  correct: { title: "Đúng rồi!", tone: "bg-success-soft", text: "text-success-fg", btn: "easy" as const },
  close: { title: "Gần đúng!", tone: "bg-streak-soft", text: "text-streak-fg", btn: "hard" as const },
  wrong: { title: "Chưa đúng", tone: "bg-danger-soft", text: "text-danger-fg", btn: "again" as const },
} as const;

/**
 * Sheet that slides up under an answered question: the verdict, the full answer, the mascot with a short
 * remark, and the continue button. Its tint and the button color carry the verdict (green, yellow, red).
 */
export function FeedbackPanel({
  outcome,
  word,
  onNext,
  nextLabel,
  buttonRef,
}: {
  outcome: Outcome;
  word: StudyWord;
  onNext: () => void;
  nextLabel: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const zh = word.language === "zh";
  const { prefs } = useMe();
  const verdict = outcome.close ? "close" : outcome.correct ? "correct" : "wrong";
  const v = VERDICT[verdict];
  return (
    <div
      role="status"
      className={cn(
        "sticky bottom-0 -mx-4 mt-4 flex animate-in flex-col gap-3 rounded-t-xl px-4 pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-lg duration-200 fade-in-0 slide-in-from-bottom-6",
        v.tone,
      )}
    >
      <div className="flex items-start gap-3">
        {prefs.mascot && <Pup mood={answerMood(verdict, seedOf(word.id))} size={40} className="mt-0.5" />}
        <div className="min-w-0 flex-1">
          <p className={cn("text-xl font-extrabold", v.text)}>{v.title}</p>
          {prefs.mascot && (
            <p className="text-sm text-fg-muted">{say(verdict, { seed: seedOf(word.id), name: prefs.mascot_name })}</p>
          )}
          <p className="mt-1 text-fg">
            <span lang={zh ? "zh-CN" : "en"} className={cn("font-semibold", zh && "font-hanzi text-lg")}>
              {word.term}
            </span>
            {word.reading && <span className="text-fg-muted"> {word.reading}</span>}
            <span className="text-fg-muted"> {word.meaning_vi}</span>
          </p>
        </div>
        <PronounceButton text={word.term} lang={word.language} />
      </div>
      <Button ref={buttonRef} type="button" variant="pressable" tone={v.btn} size="xl" onClick={onNext}>
        {nextLabel}
        <kbd className="hidden rounded-xs bg-white/20 px-1.5 font-sans text-xs font-normal lg:inline">Enter</kbd>
      </Button>
    </div>
  );
}
