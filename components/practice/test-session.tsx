"use client";

import { Check, ChevronsDown, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Confetti } from "@/components/fx/confetti";
import { useBinAction } from "@/components/mascot/use-bin";
import { useOutboxStatus } from "@/components/review/session-bar";
import { ProgressRing } from "@/components/stats/progress-ring";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import type { BinAction } from "@/lib/mascot/lines";
import { PronounceButton } from "@/components/word/pronounce-button";
import { formatDuration } from "@/lib/format";
import { reviewModeOf, type Question } from "@/lib/practice/questions";
import {
  answerText,
  buildTest,
  expectedText,
  gradeTest,
  type TestAnswers,
  type TestAsk,
  type TestGrade,
  type TestType,
} from "@/lib/practice/test";
import { playSfx } from "@/lib/sfx";
import { enqueueReview } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";
import { MeaningLine, Options, TermLine } from "./question-parts";

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => Date.now();

/** Each kind of question has its own color for the big number on its card. */
const KIND_TONE: Partial<Record<Question["kind"], Tone>> = { choice: "mint", truefalse: "teal", typing: "pink", cloze: "coral" };

const KIND_LABEL: Partial<Record<Question["kind"], string>> = {
  choice: "Trắc nghiệm",
  truefalse: "Đúng / Sai",
  typing: "Gõ từ",
  cloze: "Điền từ",
};

function questionText(q: Question): string {
  switch (q.kind) {
    case "choice":
      return q.prompt === "term" ? q.word.term : q.word.meaning_vi;
    case "truefalse":
      return q.prompt === "term"
        ? `${q.word.term} = ${q.shown}?`
        : `${q.word.meaning_vi} = ${q.shown}?`;
    case "cloze":
      return `${q.cloze.before}___${q.cloze.after}`;
    default:
      return q.word.meaning_vi;
  }
}

function TrueFalse({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Đúng hay sai?">
      {[
        { v: "true", label: "Đúng", Icon: Check },
        { v: "false", label: "Sai", Icon: X },
      ].map(({ v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex min-h-14 items-center justify-center gap-2 rounded-md border text-lg font-semibold text-fg transition-colors",
            value === v ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-input bg-surface hover:bg-surface-2",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

function QuestionCard({
  q,
  index,
  answer,
  onAnswer,
  onSkip,
}: {
  q: Question;
  index: number;
  answer: string | undefined;
  onAnswer: (v: string) => void;
  /** Moves on to the next question without answering (typing questions only) */
  onSkip?: () => void;
}) {
  const zh = q.word.language === "zh";
  const label = KIND_LABEL[q.kind];
  const titleId = `q-${index}-title`;
  let body: React.ReactNode = null;

  switch (q.kind) {
    case "choice":
      body = (
        <>
          <div className="flex flex-col items-center gap-2 py-3">
            {q.prompt === "term" ? <TermLine word={q.word} bare /> : <MeaningLine word={q.word} bare />}
            <p className="text-sm text-fg-muted">
              {q.prompt === "term" ? "Nghĩa của từ này là gì?" : zh ? "Chữ Hán nào?" : "Từ nào?"}
            </p>
          </div>
          <Options
            options={q.options}
            answerId={q.answerId}
            outcome={null}
            selected={answer ?? null}
            letters
            onPick={onAnswer}
            lang={q.prompt !== "term" && zh ? "zh" : undefined}
          />
        </>
      );
      break;
    case "truefalse":
      body = (
        <>
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            {q.prompt === "term" ? <TermLine word={q.word} bare /> : <MeaningLine word={q.word} bare />}
            <p className="text-sm text-fg-muted">{q.prompt === "term" ? "có nghĩa là" : "là từ"}</p>
            <p
              lang={q.prompt === "meaning" && zh ? "zh-CN" : undefined}
              className={cn(
                "rounded-md border border-border bg-surface-2 px-4 py-2 text-xl font-semibold text-fg",
                q.prompt === "meaning" && zh && "font-hanzi text-3xl",
              )}
            >
              {q.shown}
            </p>
          </div>
          <TrueFalse value={answer} onChange={onAnswer} />
        </>
      );
      break;
    case "typing":
      body = (
        <>
          <div className="py-3">
            <MeaningLine word={q.word} bare />
          </div>
          <label htmlFor={`q-${index}-input`} className="mb-1 block text-sm text-fg-muted">
            {zh ? "Gõ chữ Hán hoặc pinyin" : "Gõ từ tiếng Anh"}
          </label>
          <Input
            id={`q-${index}-input`}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={answer ?? ""}
            onChange={(e) => onAnswer(e.target.value)}
            lang={zh ? "zh-CN" : "en"}
            className={cn("h-14 border-2 border-border-strong bg-surface px-4 text-xl focus-visible:border-primary", zh ? "font-hanzi" : "font-display")}
          />
          {onSkip && (
            <button type="button" onClick={onSkip} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">
              Bỏ qua
            </button>
          )}
        </>
      );
      break;
    case "cloze": {
      const picked = q.options.find((o) => o.id === answer)?.label;
      body = (
        <>
          <p
            lang={zh ? "zh-CN" : "en"}
            className={cn("py-3 text-xl leading-relaxed text-fg", zh && "font-hanzi text-2xl")}
          >
            {q.cloze.before}
            <span className="mx-1 inline-block min-w-16 border-b-2 border-primary text-center font-semibold text-primary">
              {picked ?? " "}
            </span>
            {q.cloze.after}
          </p>
          {q.cloze.vi && <p className="-mt-1 mb-3 text-fg-muted">{q.cloze.vi}</p>}
          <Options
            options={q.options}
            answerId={q.answerId}
            outcome={null}
            selected={answer ?? null}
            letters
            onPick={onAnswer}
            lang={zh ? "zh" : undefined}
          />
        </>
      );
      break;
    }
  }

  const tone = KIND_TONE[q.kind] ?? "blue";
  const answered = Boolean(answer?.trim());
  return (
    <section
      id={`q-${index}`}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-36 rounded-xl bg-surface p-5 shadow-sm transition-transform duration-300 dark:border dark:border-border",
        answered && "scale-[0.985]",
      )}
    >
      <h2 id={titleId} className="flex items-center gap-3 text-base">
        <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-xl font-extrabold text-white tabular-nums", TONE_CLASSES[tone].solid)}>
          {index + 1}
        </span>
        <span className="font-display text-lg font-semibold tabular-nums">Câu {index + 1}:</span>
        {label && <span className="text-sm font-normal text-fg-muted">{label}</span>}
        {answered && <Check className="ml-auto size-5 shrink-0 animate-pop text-success-fg" strokeWidth={3} aria-label="Đã làm" />}
      </h2>
      {body}
    </section>
  );
}

function verdict(pct: number) {
  if (pct >= 90) return "Xuất sắc!";
  if (pct >= 70) return "Làm tốt lắm!";
  return "Cố thêm chút nữa nhé!";
}

/** The letter grade: A from 90%, B from 75%, C from 60%, otherwise D (REDESIGN_V3 §8.4). */
export function gradeLetter(pct: number): { letter: "A" | "B" | "C" | "D"; tone: Tone; action: BinAction } {
  if (pct >= 90) return { letter: "A", tone: "mint", action: "dance" };
  if (pct >= 75) return { letter: "B", tone: "blue", action: "jump" };
  if (pct >= 60) return { letter: "C", tone: "sun", action: "nod" };
  return { letter: "D", tone: "coral", action: "droop" };
}

/** Bin reacts to the score: dances for an A, jumps for a B, nods for a C and droops for a D. */
function ScoreBin({ percent }: { percent: number }) {
  const g = gradeLetter(percent);
  const bin = useBinAction(percent >= 70 ? "cheer" : percent >= 40 ? "happy" : "sad");
  const play = useRef(bin.play);
  useEffect(() => {
    play.current = bin.play;
  }, [bin.play]);
  useEffect(() => {
    const t = setTimeout(() => play.current(g.action), 400);
    return () => clearTimeout(t);
  }, [g.action]);
  return <Pup mood={bin.mood} action={bin.action} size={96} />;
}

function Results({
  grade,
  durationMs,
  onRetryWrong,
  againHref,
  exitHref,
  learnHref,
  matchHref,
}: {
  grade: TestGrade;
  durationMs: number;
  onRetryWrong: () => void;
  againHref: string;
  exitHref: string;
  learnHref?: (wordIds: string[]) => string;
  matchHref?: string;
}) {
  const sync = useOutboxStatus();
  const [onlyWrong, setOnlyWrong] = useState(false);
  const wrong = grade.items.filter((i) => i.result === "wrong");
  const mood = verdict(grade.percent);
  const letter = gradeLetter(grade.percent);
  const shown = onlyWrong ? wrong : grade.items;
  const { prefs } = useMe();

  return (
    <div className="flex flex-1 flex-col py-6">
      <header className="flex flex-col items-center gap-3 text-center">
        {prefs.mascot && <ScoreBin percent={grade.percent} />}
        <h1 className="text-xl">{mood}</h1>
        <div className="flex items-center gap-5">
          <ProgressRing value={grade.percent} size={168} stroke={16} className="[&>svg]:size-full">
            <span className="font-display text-4xl font-extrabold tabular-nums">{grade.percent}%</span>
          </ProgressRing>
          <span
            role="img"
            aria-label={`Xếp loại ${letter.letter}`}
            className={cn("grid size-16 animate-pop place-items-center rounded-full font-display text-3xl font-extrabold text-white shadow-md", TONE_CLASSES[letter.tone].solid, letter.tone === "sun" && "text-c-sun-on")}
          >
            {letter.letter}
          </span>
        </div>
        <p className="font-display text-3xl leading-none font-extrabold text-fg tabular-nums">
          Đúng {grade.correct}/{grade.total}
        </p>
        <p className="flex flex-wrap justify-center gap-x-4 text-sm text-fg-muted">
          <span>{formatDuration(durationMs)}</span>
          <span>+{grade.correct} XP</span>
        </p>
      </header>
      {grade.percent >= 90 && <Confetti preset="small" />}

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng.
        </p>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {wrong.length > 0 && (
          <Button type="button" size="lg" onClick={onRetryWrong}>
            Làm lại câu sai ({wrong.length})
          </Button>
        )}
        {wrong.length > 0 && learnHref && (
          <Button asChild size="lg" variant="outline">
            <Link href={learnHref(wrong.map((i) => i.question.word.id))}>Học các từ sai</Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          <a href={againHref}>Làm bài mới</a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={exitHref}>Xong</Link>
        </Button>
      </div>

      {matchHref && (
        <p className="mt-4 text-center text-sm text-fg-muted">
          Đổi gió một chút?{" "}
          <Link href={matchHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Chơi Ghép thẻ
          </Link>
        </p>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg">Xem lại bài</h2>
          {wrong.length > 0 && wrong.length < grade.total && (
            <Button type="button" variant={onlyWrong ? "secondary" : "outline"} size="sm" aria-pressed={onlyWrong} onClick={() => setOnlyWrong(!onlyWrong)}>
              Chỉ câu sai
            </Button>
          )}
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {shown.map((item) => {
            const n = grade.items.indexOf(item) + 1;
            const q = item.question;
            const ok = item.result !== "wrong";
            const given = answerText(q, item.answer);
            const zh = q.word.language === "zh";
            return (
              <li key={q.id}>
                <details open={!ok} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-1 py-2">
                    {ok ? (
                      <Check className="size-5 shrink-0 text-success-fg" aria-label="Đúng" />
                    ) : (
                      <X className="size-5 shrink-0 text-danger-fg" aria-label="Sai" />
                    )}
                    <span className="shrink-0 font-display text-sm font-semibold text-fg-muted tabular-nums">Câu {n}</span>
                    {/* mixed scripts (term = meaning?), so no CJK serif face here */}
                    <span className="min-w-0 flex-1 truncate text-fg">{questionText(q)}</span>
                    {item.result === "close" && <span className="shrink-0 text-xs font-medium text-streak-fg">Gần đúng</span>}
                  </summary>
                  <div className="flex items-start gap-3 border-t border-border px-1 py-3">
                    <div className="min-w-0 flex-1 space-y-1 text-[0.9375rem]">
                      <p className={ok ? "text-success-fg" : "text-danger-fg"}>
                        Bạn chọn:{" "}
                        <span className={cn("font-semibold", !ok && "line-through decoration-danger decoration-2")}>{given ?? "(bỏ trống)"}</span>
                      </p>
                      {(!ok || item.result === "close") && (
                        <p className="text-success-fg">
                          Đáp án đúng: <span className="font-semibold">{expectedText(q)}</span>
                        </p>
                      )}
                      <p className="text-fg-muted">
                        <span lang={zh ? "zh-CN" : "en"} className={cn("font-semibold text-fg", zh && "font-hanzi")}>
                          {q.word.term}
                        </span>
                        {q.word.reading && <span> {q.word.reading}</span>} {q.word.meaning_vi}
                      </p>
                    </div>
                    <PronounceButton text={q.word.term} lang={q.word.language} />
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** Test mode (docs/PLAN-study-games.md §4): answer everything, then grade. */
export function TestSession({
  questions: initial,
  countsToSrs,
  exitHref,
  againHref,
  types,
  ask,
  learnBase,
  matchHref,
}: {
  questions: Question[];
  countsToSrs: boolean;
  exitHref: string;
  againHref: string;
  types: TestType[];
  ask: TestAsk;
  /** Learn URL without the word list; "Học các từ sai" appends `&words=`. */
  learnBase?: string;
  matchHref?: string;
}) {
  const [questions, setQuestions] = useState(initial);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [grade, setGrade] = useState<TestGrade | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reduced = useReducedMotion();
  const [auto, setAuto] = useState(true);
  const [current, setCurrent] = useState(0);
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(advance.current), []);
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const left = questions.length - answered;

  const goTo = useCallback(
    (i: number) => document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
    [reduced],
  );

  // The dot of the question being looked at follows the scroll
  useEffect(() => {
    if (grade) return;
    const els = questions.map((_, i) => document.getElementById(`q-${i}`)).filter((el): el is HTMLElement => Boolean(el));
    const visible = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number(e.target.id.slice(2));
          if (e.isIntersecting) visible.add(i);
          else visible.delete(i);
        }
        if (visible.size) setCurrent(Math.min(...visible));
      },
      { rootMargin: "-150px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [questions, grade]);

  function setAnswer(i: number, id: string, kind: Question["kind"], v: string) {
    setAnswers((a) => ({ ...a, [id]: v }));
    // After a tap on an option the page moves on to the next question that is still empty
    if (auto && kind !== "typing") {
      clearTimeout(advance.current);
      const next = questions.findIndex((x, j) => j > i && !answers[x.id]?.trim());
      if (next >= 0) advance.current = setTimeout(() => goTo(next), 350);
    }
  }

  function submit() {
    const g = gradeTest(questions, answers);
    const spent = clock() - startedAt;
    // One duration for the whole test, split evenly (questions are not timed one by one).
    const per = Math.min(Math.round(spent / Math.max(questions.length, 1)), 3_600_000);
    const at = new Date(clock()).toISOString();
    for (const item of g.items) {
      const correct = item.result !== "wrong";
      void enqueueReview({
        clientId: crypto.randomUUID(),
        wordId: item.question.word.id,
        direction: "recognize",
        mode: reviewModeOf(item.question),
        rating: correct ? 3 : 1,
        wasCorrect: correct,
        durationMs: per,
        reviewedAt: at,
        updateCard: countsToSrs,
      });
    }
    playSfx(g.percent >= 70 ? "complete" : "pop");
    setGrade(g);
    setDurationMs(spent);
    window.scrollTo({ top: 0 });
  }

  function retryWrong() {
    if (!grade) return;
    const wrongWords = grade.items.filter((i) => i.result === "wrong").map((i) => i.question.word);
    setQuestions(buildTest(wrongWords, questions.map((q) => q.word), { types, ask }));
    setAnswers({});
    setGrade(null);
    setStartedAt(clock());
    window.scrollTo({ top: 0 });
  }

  if (grade) {
    return (
      <Results
        grade={grade}
        durationMs={durationMs}
        onRetryWrong={retryWrong}
        againHref={againHref}
        exitHref={exitHref}
        learnHref={learnBase ? (ids) => `${learnBase}&words=${ids.join(",")}` : undefined}
        matchHref={matchHref}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 -mx-4 bg-canvas/90 px-4 pb-2 shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2">
          <Link
            href={exitHref}
            aria-label="Thoát phiên"
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </Link>
          <p className="min-w-0 flex-1 truncate font-semibold text-fg tabular-nums">
            Đã làm {answered}/{questions.length}
          </p>
          <ProgressRing value={questions.length ? (answered / questions.length) * 100 : 0} size={34} stroke={5} className="[&>svg]:size-full" />
          <button
            type="button"
            aria-pressed={auto}
            aria-label="Tự chuyển câu"
            title="Tự chuyển sang câu tiếp theo sau khi chọn"
            onClick={() => setAuto((v) => !v)}
            className={cn("grid size-10 shrink-0 place-items-center rounded-full transition-colors", auto ? "bg-primary-soft text-primary-fg" : "text-fg-muted hover:bg-surface-2")}
          >
            <ChevronsDown className="size-5" strokeWidth={2} aria-hidden />
          </button>
          <Button type="button" size="lg" className="h-11 px-5 lg:h-11" onClick={() => (left > 0 ? setConfirmOpen(true) : submit())}>
            Nộp bài
          </Button>
        </div>
        <ScrollFade className="gap-1.5 px-1 pt-1 pb-1.5">
          {questions.map((q, i) => {
            const done = Boolean(answers[q.id]?.trim());
            return (
              <button
                key={q.id}
                type="button"
                aria-label={`Câu ${i + 1}${done ? ", đã làm" : ""}`}
                aria-current={current === i ? "true" : undefined}
                onClick={() => goTo(i)}
                className={cn(
                  "grid size-10 shrink-0 snap-start place-items-center rounded-full text-sm font-bold tabular-nums transition-colors",
                  done ? "bg-primary text-on-primary" : "bg-surface-3 text-fg-muted",
                  current === i && "ring-2 ring-fg ring-offset-2 ring-offset-canvas",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </ScrollFade>
      </div>

      <h1 className="mt-4 mb-3 font-display text-xl font-semibold">Bài kiểm tra</h1>
      <div className="flex flex-col gap-4 pb-8">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            answer={answers[q.id]}
            onAnswer={(v) => setAnswer(i, q.id, q.kind, v)}
            onSkip={q.kind === "typing" && i < questions.length - 1 ? () => goTo(i + 1) : undefined}
          />
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Còn {left} câu chưa làm. Vẫn nộp?</AlertDialogTitle>
            <AlertDialogDescription>Câu bỏ trống được tính là sai.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Làm tiếp</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Nộp bài</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
