"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Confetti } from "@/components/review/confetti";
import { WordVisual } from "@/components/review/word-visual";
import { checkTyping, type StudyWord, type TypingResult } from "@/lib/practice";
import {
  answer,
  initLearn,
  learnComplete,
  levelOf,
  progress,
  questionFor,
  restoreLearn,
  roundDone,
  startRound,
  type LearnState,
} from "@/lib/practice/learn";
import { clearLearn, loadLearn, saveLearn } from "@/lib/practice/learn-store";
import { reviewModeOf, type Question } from "@/lib/practice/questions";
import { enqueueReview } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";
import {
  FeedbackPanel,
  isTyping,
  MeaningLine,
  Options,
  TermLine,
  useSpeak,
  type Outcome,
} from "./question-parts";

type Phase = "loading" | "resume" | "question" | "round" | "done";
type Asked = { q: Question; tag: { label: string; tone: string } };

function tagFor(s: LearnState, wordId: string, q: Question): Asked["tag"] {
  if (q.kind === "typing") return { label: "Ôn lại — gõ từ", tone: "bg-wash-yellow text-sun-text" };
  const missed = (s.words.find((w) => w.wordId === wordId)?.misses ?? 0) > 0;
  return missed
    ? { label: "Học lại", tone: "bg-wash-red text-danger" }
    : { label: "Từ mới", tone: "bg-wash-blue text-ink-blue" };
}

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => Date.now();

function LearnBar({ state, exitHref }: { state: LearnState; exitHref: string }) {
  const p = progress(state);
  const total = state.words.length || 1;
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pb-2 backdrop-blur">
      <div className="flex h-12 items-center gap-3">
        <Link
          href={exitHref}
          aria-label="Thoát"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </Link>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.words.length}
          aria-valuenow={p.mastered}
          aria-label={`Đã thuộc ${p.mastered}/${state.words.length}, đang học ${p.learning}`}
          className="flex h-4 flex-1 overflow-hidden rounded-full bg-rule"
        >
          <div
            className="h-full bg-jade transition-[width] duration-500"
            style={{ width: `${(p.mastered / total) * 100}%` }}
          />
          <div
            className="h-full bg-sun transition-[width] duration-500"
            style={{ width: `${(p.learning / total) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold whitespace-nowrap text-ink-soft">Vòng {state.round}</span>
      </div>
    </div>
  );
}

function ProgressRows({ state }: { state: LearnState }) {
  const p = progress(state);
  const total = state.words.length || 1;
  const rows = [
    { label: "Chưa học", value: p.notStarted, bar: "bg-ink-soft/40" },
    { label: "Đang học", value: p.learning, bar: "bg-sun" },
    { label: "Đã thuộc", value: p.mastered, bar: "bg-jade" },
  ];
  return (
    <dl className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3">
          <dt className="text-sm font-semibold text-ink">{r.label}</dt>
          <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${(r.value / total) * 100}%` }} />
          </div>
          <dd className="text-right font-bold text-ink tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const primaryBtn =
  "btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn bg-primary px-4 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]";
const secondaryBtn =
  "btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]";

/** Learn mode (docs/PLAN-study-games.md §5): rounds of 7 words until every word is mastered. */
export function LearnSession({
  words,
  pool,
  progressKey,
  countsToSrs,
  exitHref,
  testHref,
}: {
  words: StudyWord[];
  /** Distractors, and the words a saved session may still need. */
  pool: StudyWord[];
  /** Saves progress on this device under this key; null = not saved (ad-hoc word lists). */
  progressKey: string | null;
  countsToSrs: boolean;
  exitHref: string;
  testHref: string;
}) {
  const { userId, prefs } = useMe();
  const say = useSpeak();
  const byId = useMemo(() => new Map([...pool, ...words].map((w) => [w.id, w])), [pool, words]);
  const choicePool = useMemo(() => [...byId.values()], [byId]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<LearnState>(() => initLearn(words.map((w) => w.id)));
  const [saved, setSaved] = useState<LearnState | null>(null);
  const [asked, setAsked] = useState<Asked | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState("");
  const shownAt = useRef(0);
  const continueRef = useRef<HTMLButtonElement>(null);

  const persist = useCallback(
    (s: LearnState) => {
      if (progressKey) void saveLearn(userId, progressKey, s);
    },
    [progressKey, userId],
  );

  const show = useCallback(
    (s: LearnState) => {
      setState(s);
      setOutcome(null);
      setTyped("");
      if (roundDone(s)) {
        setAsked(null);
        setPhase(learnComplete(s) ? "done" : "round");
        return;
      }
      const q = questionFor(s, byId.get(s.queue[0])!, choicePool);
      setAsked({ q, tag: tagFor(s, s.queue[0], q) });
      shownAt.current = clock();
      setPhase("question");
    },
    [byId, choicePool],
  );

  const fresh = useCallback(() => {
    const s = startRound(initLearn(words.map((w) => w.id)));
    persist(s);
    show(s);
  }, [persist, show, words]);

  // Saved progress is read once, on the client (IndexedDB).
  useEffect(() => {
    let alive = true;
    void (async () => {
      const raw = progressKey ? await loadLearn(userId, progressKey) : null;
      if (!alive) return;
      const restored = restoreLearn(raw, new Set(byId.keys()), words.map((w) => w.id), words.length);
      if (restored && !learnComplete(restored) && progress(restored).notStarted < restored.words.length) {
        setState(restored);
        setSaved(restored);
        setPhase("resume");
      } else {
        fresh();
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, []);

  const q = phase === "question" ? (asked?.q ?? null) : null;

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
        durationMs: Math.min(clock() - shownAt.current, 3_600_000),
        reviewedAt: new Date(clock()).toISOString(),
        updateCard: countsToSrs,
      });
      const next = answer(state, q.word.id, o.correct);
      setState(next);
      persist(next);
      if (prefs.auto_speak) say(q.word);
      requestAnimationFrame(() => continueRef.current?.focus());
    },
    [countsToSrs, outcome, persist, prefs.auto_speak, q, say, state],
  );

  const pick = useCallback(
    (id: string) => {
      if (q && "answerId" in q) finish({ correct: id === q.answerId, picked: id });
    },
    [finish, q],
  );

  const next = useCallback(() => {
    if (outcome) show(state);
  }, [outcome, show, state]);

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

  if (phase === "loading") {
    return <div className="flex-1" aria-busy="true" />;
  }

  if (phase === "resume" && saved) {
    const p = progress(saved);
    return (
      <div className="flex flex-1 flex-col">
        <LearnBar state={saved} exitHref={exitHref} />
        <div className="flex flex-1 flex-col justify-center gap-6 py-6">
          <div className="text-center">
            <span aria-hidden className="text-6xl">📚</span>
            <h1 className="mt-3 text-2xl text-ink">Tiếp tục học?</h1>
            <p className="mt-1 text-ink-soft">
              Đã thuộc {p.mastered}/{saved.words.length} từ
            </p>
          </div>
          <ProgressRows state={saved} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" autoFocus onClick={() => show(saved.queue.length ? saved : startRound(saved))} className={primaryBtn}>
              Học tiếp
            </button>
            <button type="button" onClick={fresh} className={secondaryBtn}>
              Bắt đầu lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "round") {
    return (
      <div className="flex flex-1 flex-col">
        <LearnBar state={state} exitHref={exitHref} />
        <div className="flex flex-1 flex-col gap-6 py-6">
          <h1 className="text-center text-2xl text-ink">
            <span className="highlighter highlighter-animate">Hết vòng {state.round}</span>
          </h1>
          <ProgressRows state={state} />
          <ul className="ruled-list overflow-hidden rounded-card border border-rule bg-surface shadow-card">
            {state.roundWords.map((id) => {
              const w = byId.get(id);
              if (!w) return null;
              const mastered = levelOf(state, id) === 2;
              const zh = w.language === "zh";
              return (
                <li key={id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <span
                    lang={zh ? "zh-CN" : "en"}
                    className={cn("font-semibold text-ink", zh && "font-hanzi text-lg")}
                  >
                    {w.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{w.meaning_vi}</span>
                  {mastered ? (
                    <Check className="size-5 shrink-0 text-jade-text" aria-label="Đã thuộc" />
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-sun-text">Đang học</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            autoFocus
            onClick={() => {
              const s = startRound(state);
              persist(s);
              show(s);
            }}
            className={cn(primaryBtn, "mt-auto flex-none")}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="relative flex flex-1 flex-col py-6">
        <Confetti />
        <span aria-hidden className="animate-float self-center text-7xl">
          🎓
        </span>
        <h1 className="mt-3 text-center text-2xl text-ink">
          <span className="highlighter highlighter-animate">Bạn đã thuộc hết {state.words.length} từ!</span>
        </h1>
        <p className="mt-2 text-center text-ink-soft">
          Xong sau {state.round} vòng. Làm bài kiểm tra để chắc chắn nhé.
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          <Link href={testHref} className={primaryBtn}>
            Làm bài kiểm tra
          </Link>
          <button
            type="button"
            onClick={() => {
              if (progressKey) void clearLearn(userId, progressKey);
              fresh();
            }}
            className={secondaryBtn}
          >
            Học lại từ đầu
          </button>
          <Link href={exitHref} className={secondaryBtn}>
            Xong
          </Link>
        </div>
      </div>
    );
  }

  if (!q || !asked) return null;
  const zh = q.word.language === "zh";
  const { tag } = asked;
  const typingResult: TypingResult | null =
    q.kind === "typing" && outcome
      ? outcome.close
        ? "close"
        : outcome.correct
          ? "correct"
          : "wrong"
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <LearnBar state={state} exitHref={exitHref} />
      <div className="flex flex-1 flex-col justify-center py-2">
        <span className={cn("self-center rounded-full px-3 py-1 text-sm font-semibold", tag.tone)}>
          {tag.label}
        </span>
        {q.kind === "choice" && (
          <>
            <div className="flex flex-col items-center gap-4 py-4">
              {q.prompt === "term" ? (
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
        )}
        {q.kind === "typing" && (
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
              <label htmlFor="learn-answer" className="text-sm text-ink-soft">
                {zh ? "Gõ chữ Hán hoặc pinyin (có dấu, số thanh hay không dấu đều được)" : "Gõ từ tiếng Anh"}
              </label>
              <input
                id="learn-answer"
                key={q.id}
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
        )}
      </div>

      {outcome && (
        <FeedbackPanel
          outcome={outcome}
          word={q.word}
          onNext={next}
          nextLabel="Tiếp tục"
          buttonRef={continueRef}
        />
      )}
    </div>
  );
}
