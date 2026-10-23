"use client";

import { Check, Volume2, X } from "lucide-react";
import { useCallback, type Ref } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { PinyinText } from "@/components/zh/pinyin-text";
import { say, seedOf } from "@/lib/mascot/lines";
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

export function TermLine({ word, showReading = true }: { word: StudyWord; showReading?: boolean }) {
  const { prefs } = useMe();
  const zh = word.language === "zh";
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span
        lang={zh ? "zh-CN" : "en"}
        className={cn("font-bold text-ink", zh ? "font-hanzi text-5xl" : "text-4xl")}
      >
        {word.term}
      </span>
      {showReading &&
        word.reading &&
        (zh ? (
          <PinyinText
            pinyin={word.reading}
            colored={prefs.tone_colors}
            className="text-lg font-medium"
          />
        ) : (
          <span className="font-ipa text-ink-soft">{word.reading}</span>
        ))}
    </div>
  );
}

export function MeaningLine({ word }: { word: StudyWord }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-2xl font-semibold text-ink">{word.meaning_vi}</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {word.parts_of_speech.map((p) => (
          <PosBadge key={p} pos={p} />
        ))}
      </div>
    </div>
  );
}

export function ReplayButton({ word, big }: { word: StudyWord; big?: boolean }) {
  const say = useSpeak();
  return (
    <button
      type="button"
      onClick={() => say(word)}
      aria-label="Nghe lại"
      className={cn(
        "grid place-items-center rounded-full bg-wash-blue text-ink-blue hover:bg-wash-blue/70",
        big ? "size-24" : "size-12",
      )}
    >
      <Volume2 className={big ? "size-10" : "size-5"} aria-hidden />
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
              "btn-3d flex min-h-14 items-center gap-3 rounded-btn border-2 px-4 py-3 text-left font-medium text-ink disabled:cursor-default",
              !outcome && !chosen && "border-rule bg-surface [--edge-color:var(--rule)] hover:border-ink-blue/40 hover:bg-wash-blue",
              chosen && "border-ink-blue bg-wash-blue [--edge-color:var(--ink-blue)]",
              outcome && isAnswer && "animate-pop-in border-jade bg-wash-jade [--edge-color:var(--jade)]",
              outcome && picked && !isAnswer && "border-margin-red bg-wash-red [--edge-color:var(--margin-red)]",
              outcome && !isAnswer && !picked && "border-rule bg-surface opacity-60 [--edge-color:var(--rule)]",
              big && "text-2xl",
              lang === "zh" && "font-hanzi text-2xl",
            )}
          >
            {letters ? (
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 font-sans text-xs font-bold",
                  chosen ? "border-ink-blue bg-ink-blue text-primary-foreground" : "border-rule text-ink-soft",
                )}
              >
                {"ABCDEF"[i]}
              </span>
            ) : (
              <kbd className="hidden size-6 shrink-0 place-items-center rounded-md border-2 border-rule font-sans text-xs font-bold text-ink-soft lg:grid">
                {i + 1}
              </kbd>
            )}
            <span className="min-w-0 flex-1 break-words">{o.label}</span>
            {outcome && isAnswer && (
              <Check className="size-5 shrink-0 text-jade-text" aria-label="Đáp án đúng" />
            )}
            {outcome && picked && !isAnswer && (
              <X className="size-5 shrink-0 text-danger" aria-label="Bạn chọn" />
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

/** Right/wrong sheet under an answered question, with the full answer and a continue button. */
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
  const title = prefs.mascot
    ? say(verdict, { seed: seedOf(word.id), name: prefs.mascot_name })
    : outcome.close
      ? "Gần đúng! 👌"
      : outcome.correct
        ? "Đúng rồi! 🎉"
        : "Chưa đúng 😅";
  return (
    <div
      role="status"
      className={cn(
        "sticky bottom-0 -mx-4 mt-4 flex animate-pop-in flex-col gap-3 rounded-t-sheet border-t-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        outcome.correct ? "border-jade/50 bg-wash-jade" : "border-margin-red/50 bg-wash-red",
      )}
    >
      <div className="flex items-start gap-3">
        {prefs.mascot && (
          <Pup
            mood={verdict === "wrong" ? "sad" : verdict === "close" ? "happy" : "cheer"}
            size={60}
            className="-mt-1 -mb-2"
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn("font-heading text-xl font-black", outcome.correct ? "text-jade-text" : "text-danger")}
          >
            {title}
          </p>
          <p className="mt-0.5 text-ink">
            <span
              lang={zh ? "zh-CN" : "en"}
              className={cn("font-semibold", zh && "font-hanzi text-lg")}
            >
              {word.term}
            </span>
            {word.reading && <span className="text-ink-soft"> · {word.reading}</span>}
            <span className="text-ink-soft"> — {word.meaning_vi}</span>
          </p>
        </div>
        <PronounceButton text={word.term} lang={word.language} />
      </div>
      <button
        ref={buttonRef}
        type="button"
        onClick={onNext}
        className={cn(
          "btn-3d min-h-14 rounded-btn text-lg font-extrabold text-white dark:text-paper",
          outcome.correct
            ? "bg-jade-text [--edge-color:color-mix(in_oklab,var(--jade-text),black_30%)]"
            : "bg-danger [--edge-color:color-mix(in_oklab,var(--danger),black_30%)]",
        )}
      >
        {nextLabel}
        <kbd className="ml-2 hidden text-xs font-normal opacity-70 lg:inline">Enter</kbd>
      </button>
    </div>
  );
}
