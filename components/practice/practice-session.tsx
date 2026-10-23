"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { SessionBar } from "@/components/review/session-bar";
import { SessionSummary, type SessionResult } from "@/components/review/session-summary";
import { WordVisual } from "@/components/review/word-visual";
import { PronounceButton } from "@/components/word/pronounce-button";
import { PinyinText } from "@/components/zh/pinyin-text";
import { checkTyping, type TypingResult } from "@/lib/practice";
import { reviewModeOf, type Question } from "@/lib/practice/questions";
import { enqueueReview } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";
import {
  isTyping,
  MeaningLine,
  Options,
  ReplayButton,
  TermLine,
  toneLabel,
  useSpeak,
  type Outcome,
} from "./question-parts";
import { WritingPad } from "./writing-pad";

export function PracticeSession({
  questions,
  countsToSrs,
  exitHref,
  againHref,
}: {
  questions: Question[];
  countsToSrs: boolean;
  exitHref: string;
  againHref: string;
}) {
  const { prefs } = useMe();
  const say = useSpeak();
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<SessionResult[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const shownAt = useRef(0);
  const continueRef = useRef<HTMLButtonElement>(null);
  const q = questions[index];

  // Audio-first modes speak as soon as the question appears.
  useEffect(() => {
    shownAt.current = Date.now();
    if (q && (q.kind === "tones" || (q.kind === "choice" && q.prompt === "audio"))) say(q.word);
  }, [q, say]);

  const finish = useCallback(
    (o: Outcome) => {
      if (!q || outcome) return;
      setOutcome(o);
      void enqueueReview({
        clientId: crypto.randomUUID(),
        wordId: q.word.id,
        direction: "recognize",
        mode: reviewModeOf(q),
        rating: o.correct ? 3 : 1,
        wasCorrect: o.correct,
        durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
        reviewedAt: new Date().toISOString(),
        updateCard: countsToSrs,
      });
      setResults((r) => [
        ...r,
        {
          wordId: q.word.id,
          term: q.word.term,
          language: q.word.language,
          meaning: q.word.meaning_vi,
          rating: o.correct ? 3 : 1,
        },
      ]);
      if (prefs.auto_speak && q.kind !== "tones" && !(q.kind === "choice" && q.prompt === "audio"))
        say(q.word);
      requestAnimationFrame(() => continueRef.current?.focus());
    },
    [countsToSrs, outcome, prefs.auto_speak, q, say],
  );

  const next = useCallback(() => {
    if (!outcome) return;
    setOutcome(null);
    setTyped("");
    if (index + 1 >= questions.length) setFinishedAt(Date.now());
    else setIndex(index + 1);
  }, [index, outcome, questions.length]);

  const pick = useCallback(
    (id: string) => {
      if (!q || q.kind === "typing" || q.kind === "writing" || q.kind === "flashcard") return;
      finish({ correct: id === q.answerId, picked: id });
    },
    [finish, q],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || !q) return;
      if (outcome && e.key === "Enter" && !isTyping(e.target)) {
        e.preventDefault();
        next();
        return;
      }
      if (isTyping(e.target)) return;
      if (!outcome && "options" in q && /^[1-4]$/.test(e.key)) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) pick(opt.id);
      } else if (e.key === "r" || e.key === "R") {
        say(q.word);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, outcome, pick, q, say]);

  if (finishedAt || !q) {
    const xp = results.filter((r) => r.rating > 1).length;
    return (
      <SessionSummary
        results={results}
        durationMs={(finishedAt ?? startedAt) - startedAt}
        xp={xp}
        exitHref="/today"
        againHref={againHref}
        correctLabel="Đúng"
        missedTitle="Từ làm sai"
      />
    );
  }

  const zh = q.word.language === "zh";
  let typingResult: TypingResult | null = null;

  let body: React.ReactNode;
  switch (q.kind) {
    case "choice":
      body = (
        <>
          <div className="flex flex-col items-center gap-4 py-4">
            {q.prompt === "audio" ? (
              <>
                <ReplayButton word={q.word} big />
                <p className="text-sm text-ink-soft">Bạn nghe thấy từ nào?</p>
              </>
            ) : q.prompt === "term" ? (
              <>
                <TermLine word={q.word} />
                <p className="text-sm text-ink-soft">Nghĩa của từ này là gì?</p>
              </>
            ) : (
              <>
                {!prefs.hide_images && <WordVisual word={q.word} size={96} />}
                <MeaningLine word={q.word} />
                <p className="text-sm text-ink-soft">{zh ? "Chữ Hán nào?" : "Từ nào?"}</p>
              </>
            )}
          </div>
          <Options
            options={q.options}
            answerId={q.answerId}
            outcome={outcome}
            onPick={pick}
            lang={q.prompt !== "term" && zh ? "zh" : undefined}
          />
        </>
      );
      break;
    case "cloze":
      body = (
        <>
          <div className="notebook-card my-4 py-5 pr-4">
            <p
              lang={zh ? "zh-CN" : "en"}
              className={cn("text-xl leading-relaxed text-ink", zh && "font-hanzi text-2xl")}
            >
              {q.cloze.before}
              <span
                className={cn(
                  "mx-1 inline-block min-w-16 border-b-2 text-center",
                  outcome ? "border-jade-text font-semibold text-jade-text" : "border-ink-blue",
                )}
              >
                {outcome ? q.cloze.answer : " "}
              </span>
              {q.cloze.after}
            </p>
            {q.cloze.vi && <p className="mt-2 text-ink-soft">{q.cloze.vi}</p>}
          </div>
          <Options
            options={q.options}
            answerId={q.answerId}
            outcome={outcome}
            onPick={pick}
            lang={zh ? "zh" : undefined}
          />
        </>
      );
      break;
    case "tones":
      body = (
        <>
          <div className="flex flex-col items-center gap-4 py-4">
            <TermLine word={q.word} showReading={!!outcome} />
            <ReplayButton word={q.word} />
            <p className="text-sm text-ink-soft">Từ này mang thanh điệu nào?</p>
          </div>
          <Options
            options={q.options.map((o) => ({
              ...o,
              label: `${toneLabel(o.label)}   (${o.label.replace(/5/g, "nhẹ")})`,
            }))}
            answerId={q.answerId}
            outcome={outcome}
            onPick={pick}
            big
          />
        </>
      );
      break;
    case "typing": {
      typingResult = outcome
        ? outcome.close
          ? "close"
          : outcome.correct
            ? "correct"
            : "wrong"
        : null;
      body = (
        <>
          <div className="flex flex-col items-center gap-4 py-4">
            {!prefs.hide_images && <WordVisual word={q.word} size={96} />}
            <MeaningLine word={q.word} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (outcome) return next();
              const r = checkTyping(typed, q.word, q.word.language);
              finish({ correct: r !== "wrong", close: r === "close" });
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="typing-answer" className="text-sm text-ink-soft">
              {zh
                ? "Gõ chữ Hán hoặc pinyin (có dấu, số thanh hay không dấu đều được)"
                : "Gõ từ tiếng Anh"}
            </label>
            <input
              id="typing-answer"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              readOnly={!!outcome}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              lang={zh ? "zh-CN" : "en"}
              className={cn(
                "h-14 rounded-btn border-2 bg-surface px-4 text-xl text-ink outline-none focus:border-ink-blue",
                typingResult === "wrong"
                  ? "border-danger"
                  : typingResult
                    ? "border-jade-text"
                    : "border-rule",
              )}
            />
            {!outcome && (
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn-3d min-h-12 flex-1 rounded-btn bg-primary font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
                >
                  Kiểm tra
                </button>
                <button
                  type="button"
                  onClick={() => finish({ correct: false })}
                  className="btn-3d min-h-12 rounded-btn border-2 border-rule bg-surface px-4 font-semibold text-ink [--edge-color:var(--rule)]"
                >
                  Không nhớ
                </button>
              </div>
            )}
          </form>
        </>
      );
      break;
    }
    case "writing":
      body = (
        <>
          <div className="flex flex-col items-center gap-3 py-3">
            <MeaningLine word={q.word} />
            <div className="flex items-center gap-1">
              {q.word.reading && (
                <PinyinText
                  pinyin={q.word.reading}
                  colored={prefs.tone_colors}
                  className="text-lg font-medium"
                />
              )}
              <PronounceButton text={q.word.term} lang="zh" />
            </div>
          </div>
          <WritingPad
            key={q.id}
            chars={q.chars}
            disabled={!!outcome}
            onDone={(correct) => finish({ correct })}
          />
        </>
      );
      break;
  }

  return (
    <div className="flex flex-1 flex-col">
      <SessionBar done={index + (outcome ? 1 : 0)} total={questions.length} exitHref={exitHref} />
      <div className="flex flex-1 flex-col justify-center py-2">{body}</div>

      {outcome && (
        <div
          role="status"
          className={cn(
            "sticky bottom-0 -mx-4 mt-4 flex animate-pop-in flex-col gap-3 rounded-t-sheet border-t-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
            outcome.correct ? "border-jade/50 bg-wash-jade" : "border-margin-red/50 bg-wash-red",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={cn("font-heading text-xl font-black", outcome.correct ? "text-jade-text" : "text-danger")}
              >
                {outcome.close ? "Gần đúng! 👌" : outcome.correct ? "Đúng rồi! 🎉" : "Chưa đúng 😅"}
              </p>
              <p className="mt-0.5 text-ink">
                <span
                  lang={zh ? "zh-CN" : "en"}
                  className={cn("font-semibold", zh && "font-hanzi text-lg")}
                >
                  {q.word.term}
                </span>
                {q.word.reading && <span className="text-ink-soft"> · {q.word.reading}</span>}
                <span className="text-ink-soft"> — {q.word.meaning_vi}</span>
              </p>
            </div>
            <PronounceButton text={q.word.term} lang={q.word.language} />
          </div>
          <button
            ref={continueRef}
            type="button"
            onClick={next}
            className={cn(
              "btn-3d min-h-14 rounded-btn text-lg font-extrabold text-white dark:text-paper",
              outcome.correct
                ? "bg-jade-text [--edge-color:color-mix(in_oklab,var(--jade-text),black_30%)]"
                : "bg-danger [--edge-color:color-mix(in_oklab,var(--danger),black_30%)]",
            )}
          >
            {index + 1 >= questions.length ? "Xem kết quả" : "Tiếp tục"}
            <kbd className="ml-2 hidden text-xs font-normal opacity-70 lg:inline">Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
