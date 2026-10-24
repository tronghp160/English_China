"use client";

import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { CountUp } from "@/components/fx/count-up";
import { Pup } from "@/components/mascot/pup";
import { useBinAction } from "@/components/mascot/use-bin";
import { Celebration } from "@/components/review/celebration";
import { SessionBar } from "@/components/review/session-bar";
import { useSessionHud, type SessionHud } from "@/components/review/use-session-hud";
import { WordVisual } from "@/components/review/word-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FigureTile } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PronounceButton } from "@/components/word/pronounce-button";
import type { Tone } from "@/lib/tone";
import type { Example } from "@/lib/word-schema";
import { checkTyping, type StudyWord, type TypingResult } from "@/lib/practice";
import {
  answer,
  initLearn,
  learnComplete,
  levelOf,
  masteryDots,
  previewRound,
  progress,
  questionFor,
  recordRound,
  restoreLearn,
  roundDone,
  roundsDone,
  stageCount,
  starsFor,
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
import { LearnMap } from "./learn-map";
import { SessionGifts } from "@/components/review/session-gifts";
import { TypingDiff, TypingHint } from "./typing-parts";
import { MasteryDots } from "./mastery-dots";

type Phase = "loading" | "resume" | "map" | "intro" | "question" | "round" | "done";
type Asked = { q: Question; tag: { label: string; tone: Tone } };

function tagFor(s: LearnState, wordId: string, q: Question): Asked["tag"] {
  if (q.kind === "typing") return { label: "Ôn lại — gõ từ", tone: "blue" };
  const missed = (s.words.find((w) => w.wordId === wordId)?.misses ?? 0) > 0;
  return missed ? { label: "Học lại", tone: "red" } : { label: "Từ mới", tone: "orange" };
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
  // Words Bin has shown a "new word" card for on this visit, and how this round went (for its stars)
  const introduced = useRef(new Set<string>());
  const tally = useRef({ right: 0, total: 0 });
  const [masteredBefore, setMasteredBefore] = useState(0);
  // Every answer of this visit, for what the session earned on the last screen
  const [visit, setVisit] = useState({ right: 0, total: 0 });
  const bin = useBinAction("happy");
  const playBin = useRef(bin.play);
  useEffect(() => {
    playBin.current = bin.play;
  }, [bin.play]);

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
        // The round is over: it earns its stars from how many answers were right
        const ended = recordRound(s, starsFor(tally.current.right, tally.current.total));
        setState(ended);
        persist(ended);
        setAsked(null);
        setPhase(learnComplete(ended) ? "done" : "round");
        return;
      }
      const id = s.queue[0];
      const q = questionFor(s, byId.get(id)!, choicePool);
      setAsked({ q, tag: tagFor(s, id, q) });
      shownAt.current = clock();
      setPhase(masteryDots(s, id) === 0 && !introduced.current.has(id) ? "intro" : "question");
    },
    [byId, choicePool, persist],
  );

  // A new round starts when its stage is picked on the map.
  const startStage = useCallback(
    (from: LearnState) => {
      const s = startRound(from);
      tally.current = { right: 0, total: 0 };
      setMasteredBefore(progress(from).mastered);
      persist(s);
      show(s);
    },
    [persist, show],
  );

  const fresh = useCallback(() => {
    introduced.current = new Set();
    setState(initLearn(words.map((w) => w.id)));
    setPhase("map");
  }, [words]);

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
      tally.current = { right: tally.current.right + (o.correct ? 1 : 0), total: tally.current.total + 1 };
      setVisit((v) => ({ right: v.right + (o.correct ? 1 : 0), total: v.total + 1 }));
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
    if (phase !== "round") return;
    const t = setTimeout(() => playBin.current("jump"), 250);
    return () => clearTimeout(t);
  }, [phase]);

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
            <Button
              type="button"
              size="lg"
              autoFocus
              onClick={() => {
                setState(saved);
                if (saved.queue.length) show(saved);
                else setPhase("map");
              }}
              className="flex-1"
            >
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

  if (phase === "map") {
    const p = progress(state);
    const done = roundsDone(state);
    return (
      <div className="flex flex-1 flex-col">
        <LearnBar state={state} exitHref={exitHref} />
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-fg-muted">Học</p>
            <h1 className="text-lg leading-tight font-extrabold tracking-[-0.02em]">Chọn chặng để học</h1>
          </div>
          <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-extrabold text-success-fg tabular-nums">
            Đã thuộc {p.mastered}/{state.words.length}
          </span>
        </div>
        <LearnMap
          state={state}
          stages={stageCount(state)}
          done={done}
          stars={state.roundStars ?? []}
          next={previewRound(state)}
          words={byId}
          onStart={() => startStage(state)}
        />
      </div>
    );
  }

  if (phase === "intro" && asked) {
    const w = asked.q.word;
    const example = (Array.isArray(w.examples) ? (w.examples as unknown as Example[]) : [])[0];
    return (
      <div className="flex flex-1 flex-col">
        <LearnBar state={state} exitHref={exitHref} mood={prefs.mascot ? "happy" : undefined} hud={hud} />
        <QuestionSlide id={`intro:${w.id}`} className="flex flex-1 flex-col justify-center gap-5 py-3">
          <div className="flex items-end gap-2 self-center">
            {prefs.mascot && <Pup mood="think" action="sniff" size={72} />}
            <p className="mb-3 rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2 text-[0.9375rem] font-semibold shadow-sm dark:border dark:border-border">Từ mới nè!</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-5 py-6 shadow-md dark:border dark:border-border">
            <Badge variant="soft" tone="orange" className="self-start">
              Từ mới
            </Badge>
            {!prefs.hide_images && <WordVisual word={w} size={96} />}
            <div className="flex items-center gap-2">
              <TermLine word={w} />
              <PronounceButton text={w.term} lang={w.language} size="lg" className="bg-surface-2" />
            </div>
            <MeaningLine word={w} bare />
            {example && (
              <p lang={w.language === "zh" ? "zh-CN" : "en"} className={cn("w-full max-w-md rounded-lg bg-surface-2 px-4 py-3 text-fg", w.language === "zh" && "font-hanzi")}>
                {example.text}
                {example.vi && <span className="mt-1 block text-sm text-fg-muted">{example.vi}</span>}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="pressable"
            size="xl"
            autoFocus
            onClick={() => {
              introduced.current.add(w.id);
              shownAt.current = clock();
              if (prefs.auto_speak) say(w);
              setPhase("question");
            }}
          >
            Đã hiểu
          </Button>
        </QuestionSlide>
      </div>
    );
  }

  if (phase === "round") {
    const stars = state.roundStars?.[state.round - 1] ?? 1;
    const p = progress(state);
    return (
      <div className="flex flex-1 flex-col">
        <LearnBar state={state} exitHref={exitHref} />
        <div className="flex flex-1 flex-col gap-6 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            {prefs.mascot && <Pup mood={bin.mood} action={bin.action ?? "jump"} size={96} />}
            <h1 className="text-xl">Hết vòng {state.round}</h1>
            <span role="img" aria-label={`${stars} sao`} className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  aria-hidden
                  className={cn("size-7 animate-pop", n <= stars ? "fill-c-sun stroke-c-sun-fg" : "fill-surface-3 stroke-border-strong")}
                  style={{ animationDelay: `${n * 140}ms` }}
                  strokeWidth={1.6}
                />
              ))}
            </span>
            <p className="text-fg-muted">
              Đã thuộc <span className="font-bold text-fg"><CountUp value={p.mastered} from={masteredBefore} /></span>/{state.words.length} từ
            </p>
          </div>
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
                  <MasteryDots filled={masteryDots(state, id)} />
                  {mastered ? (
                    <Check className="size-5 shrink-0 text-success-fg" aria-label="Đã thuộc" />
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-streak-fg">Đang học</span>
                  )}
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="pressable" size="xl" autoFocus onClick={() => setPhase("map")} className="mt-auto">
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
        <SessionGifts xp={visit.right} correct={visit.right} answers={visit.total} />
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
        <div className="flex flex-col items-center gap-1.5">
          <Badge variant="soft" tone={tag.tone}>
            {tag.label}
          </Badge>
          <MasteryDots filled={masteryDots(state, q.word.id)} />
        </div>
        {q.kind === "choice" && (
          <>
            <div className="my-3 flex flex-col items-center gap-4 rounded-xl bg-surface px-5 py-6 shadow-md dark:border dark:border-border">
              {q.prompt === "term" ? (
                <>
                  <TermLine word={q.word} />
                  <p className="text-sm text-fg-muted">Nghĩa của từ này là gì?</p>
                </>
              ) : (
                <>
                  {!prefs.hide_images && <WordVisual word={q.word} size={96} />}
                  <MeaningLine word={q.word} bare />
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
            <div className="my-3 flex flex-col items-center gap-4 rounded-xl bg-surface px-5 py-6 shadow-md dark:border dark:border-border">
              {!prefs.hide_images && <WordVisual word={q.word} size={96} />}
              <MeaningLine word={q.word} bare />
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
              {!outcome && <TypingHint key={`hint:${q.id}`} word={q.word} />}
              {outcome && typingResult !== "correct" && <TypingDiff typed={typed} word={q.word} />}
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
