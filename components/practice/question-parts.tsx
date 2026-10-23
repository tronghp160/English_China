"use client";

import { Check, Volume2, X } from "lucide-react";
import { useCallback } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { PosBadge } from "@/components/word/pos-badge";
import { PinyinText } from "@/components/zh/pinyin-text";
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
}: {
  options: Option[];
  answerId: string;
  outcome: Outcome | null;
  onPick: (id: string) => void;
  lang?: "zh" | "en";
  big?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Các đáp án">
      {options.map((o, i) => {
        const isAnswer = o.id === answerId;
        const picked = outcome?.picked === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={!!outcome}
            onClick={() => onPick(o.id)}
            lang={lang === "zh" ? "zh-CN" : undefined}
            className={cn(
              "btn-3d flex min-h-14 items-center gap-3 rounded-btn border-2 px-4 py-3 text-left font-medium text-ink disabled:cursor-default",
              !outcome && "border-rule bg-surface [--edge-color:var(--rule)] hover:border-ink-blue/40 hover:bg-wash-blue",
              outcome && isAnswer && "animate-pop-in border-jade bg-wash-jade [--edge-color:var(--jade)]",
              outcome && picked && !isAnswer && "border-margin-red bg-wash-red [--edge-color:var(--margin-red)]",
              outcome && !isAnswer && !picked && "border-rule bg-surface opacity-60 [--edge-color:var(--rule)]",
              big && "text-2xl",
              lang === "zh" && "font-hanzi text-2xl",
            )}
          >
            <kbd className="hidden size-6 shrink-0 place-items-center rounded-md border-2 border-rule font-sans text-xs font-bold text-ink-soft lg:grid">
              {i + 1}
            </kbd>
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
