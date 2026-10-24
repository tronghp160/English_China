"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Celebration } from "@/components/review/celebration";
import { SessionBar } from "@/components/review/session-bar";
import { useSessionHud, type SessionHud } from "@/components/review/use-session-hud";
import { WordVisual } from "@/components/review/word-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FigureTile } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
  KeyHints,
  MeaningLine,
  Options,
  QuestionSlide,
  TermLine,
  useSpeak,
  type Outcome,
} from "./question-parts";

type Phase = "loading" | "resume" | "question" | "round" | "done";
type Asked = { q: Question; tag: { label: string; variant: "outline" | "secondary" | "destructive" } };

function tagFor(s: LearnState, wordId: string, q: Question): Asked["tag"] {
  if (q.kind === "typing") return { label: "Ôn lại — gõ từ", variant: "secondary" };
  const missed = (s.words.find((w) => w.wordId === wordId)?.misses ?? 0) > 0;
  return missed ? { label: "Học lại", variant: "destructive" } : { label: "Từ mới", variant: "outline" };
}

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => Date.now();

function LearnBar({ state, exitHref, mood, hud }: { state: LearnState; exitHref: string; mood?: Parameters<typeof Pup>[0]["mood"]; hud?: SessionHud }) {
  const p = progress(state);
  return (
    <SessionBar
      done={p.mastered}
      total={state.words.length || 1}
      exitHref={exitHref}
      segments={{ mastered: p.mastered, learning: p.learning }}
      label={`Vòng ${state.round}`}
      ariaLabel={`Đã thuộc ${p.mastered}/${state.words.length}, đang học ${p.learning}`}
      pup={mood ? { mood } : undefined}
      hud={hud ? { combo: hud.combo, xp: hud.xp, reaction: hud.reaction } : undefined}
    />
  );
}

/** Three ruled rows: how many words are not started, being learned, mastered. */
function ProgressRows({ state }: { state: LearnState }) {
  const p = progress(state);
  const total = state.words.length || 1;
  const rows = [
    { label: "Chưa học", value: p.notStarted, bar: "bg-border-strong" },
    { label: "Đang học", value: p.learning, bar: "bg-streak" },
    { label: "Đã thuộc", value: p.mastered, bar: "bg-success" },
  ];
  return (
    <dl className="border-t border-border">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 border-b border-border py-3">
          <dt className="text-sm font-medium text-fg">{r.label}</dt>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${(r.value / total) * 100}%` }} />
          </div>
          <dd className="text-right font-display text-lg font-semibold text-fg tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const hud = useSessionHud();
  const answerHud = hud.answer;
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
      answerHud(o);
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
    [countsToSrs, answerHud, outcome, persist, prefs.auto_speak, q, say, state],
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
          <div className="flex flex-col items-center gap-3 text-center">
            {prefs.mascot ? <Pup mood="think" size={72} /> : <FigureTile name="notebook" />}
            <h1 className="text-xl">Tiếp tục học?</h1>
            <p className="text-fg-muted">
              Đã thuộc {p.mastered}/{saved.words.length} từ
            </p>
          </div>
          <ProgressRows state={saved} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="lg" autoFocus onClick={() => show(saved.queue.length ? saved : startRound(saved))} className="flex-1">
              Học tiếp
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={fresh} className="flex-1">
              Bắt đầu lại
            </Button>
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
          <h1 className="text-xl">Hết vòng {state.round}</h1>
          <ProgressRows state={state} />
          <ul className="divide-y divide-border border-y border-border">
            {state.roundWords.map((id) => {
              const w = byId.get(id);
              if (!w) return null;
              const mastered = levelOf(state, id) === 2;
              const zh = w.language === "zh";
              return (
                <li key={id} className="flex min-h-12 items-center gap-3 px-1 py-2">
                  <span
                    lang={zh ? "zh-CN" : "en"}
                    className={cn("text-lg font-medium text-fg", zh ? "font-hanzi" : "font-display")}
                  >
                    {w.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{w.meaning_vi}</span>
                  {mastered ? (
                    <Check className="size-5 shrink-0 text-success-fg" aria-label="Đã thuộc" />
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-streak-fg">Đang học</span>
                  )}
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            size="lg"
            autoFocus
            onClick={() => {
              const s = startRound(state);
              persist(s);
              show(s);
            }}
            className="mt-auto"
          >
            Tiếp tục
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-1 flex-col py-6">
        <Celebration mood="cheer" />
        <h1 className="mt-6 text-center text-xl">Bạn đã thuộc hết {state.words.length} từ!</h1>
        <p className="mt-2 text-center text-fg-muted">Xong sau {state.round} vòng. Làm bài kiểm tra để chắc chắn nhé.</p>
        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <Link href={testHref}>Làm bài kiểm tra</Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (progressKey) void clearLearn(userId, progressKey);
              fresh();
            }}
          >
            Học lại từ đầu
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1">
            <Link href={exitHref}>Xong</Link>
          </Button>
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
      <LearnBar state={state} exitHref={exitHref} mood={prefs.mascot ? "happy" : undefined} hud={hud} />
      <QuestionSlide id={q.id} className="flex flex-1 flex-col justify-center py-2">
        <Badge variant={tag.variant} className="self-center">
          {tag.label}
        </Badge>
        {q.kind === "choice" && (
          <>
            <div className="flex flex-col items-center gap-4 py-4">
              {q.prompt === "term" ? (
                <>
                  <TermLine word={q.word} />
                  <p className="text-sm text-fg-muted">Nghĩa của từ này là gì?</p>
                </>
              ) : (
                <>
                  {!prefs.hide_images && <WordVisual word={q.word} size={96} />}
                  <MeaningLine word={q.word} />
                  <p className="text-sm text-fg-muted">{zh ? "Chữ Hán nào?" : "Từ nào?"}</p>
                </>
              )}
            </div>
            <Options
              options={q.options}
              answerId={q.answerId}
              outcome={outcome}
              onPick={pick}
              fx={hud.answers}
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
              <label htmlFor="learn-answer" className="text-sm text-fg-muted">
                {zh ? "Gõ chữ Hán hoặc pinyin (có dấu, số thanh hay không dấu đều được)" : "Gõ từ tiếng Anh"}
              </label>
              <Input
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
                  "h-14 px-4 text-xl",
                  zh ? "font-hanzi" : "font-display",
                  typingResult === "wrong" ? "border-danger bg-danger-soft" : typingResult ? "border-success bg-success-soft" : "",
                )}
              />
              {!outcome && (
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Kiểm tra
                  </Button>
                  <Button type="button" variant="outline" onClick={() => finish({ correct: false })}>
                    Không nhớ
                  </Button>
                </div>
              )}
            </form>
          </>
        )}
        <KeyHints
          items={
            q.kind === "choice"
              ? [
                  { keys: "1–4", label: "chọn đáp án" },
                  { keys: "R", label: "nghe lại" },
                  { keys: "Enter", label: "tiếp tục" },
                ]
              : [{ keys: "Enter", label: "kiểm tra, rồi tiếp tục" }]
          }
        />
      </QuestionSlide>

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
