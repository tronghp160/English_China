"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Celebration } from "@/components/review/celebration";
import { SessionBar, useOutboxStatus } from "@/components/review/session-bar";
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
import { enqueueReview } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";
import { MeaningLine, Options, TermLine } from "./question-parts";

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => Date.now();

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
}: {
  q: Question;
  index: number;
  answer: string | undefined;
  onAnswer: (v: string) => void;
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
            className={cn(
              "h-14 rounded-none border-0 border-b-2 border-primary bg-transparent px-1 text-xl hover:border-primary focus-visible:ring-0",
              zh ? "font-hanzi" : "font-display",
            )}
          />
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

  return (
    <section id={`q-${index}`} aria-labelledby={titleId} className="scroll-mt-20 py-5 pr-4 pl-4">
      <h2 id={titleId} className="flex items-baseline gap-2 text-base">
        <span className="font-display text-lg font-semibold tabular-nums">Câu {index + 1}:</span>
        {label && <span className="text-sm font-normal text-fg-muted">{label}</span>}
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

/** The teacher's pen: a hand-drawn red loop around the percentage, a little crooked. */
function PenScore({ percent }: { percent: number }) {
  return (
    <span className="relative grid size-28 shrink-0 -rotate-6 place-items-center text-danger-fg">
      <svg viewBox="0 0 112 112" aria-hidden className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
        <path d="M58 9C84 8 104 28 103 56c-1 28-22 47-50 46C27 101 8 80 10 53 12 27 34 10 62 11c8 0 14 2 20 5" />
      </svg>
      <span className="font-display text-2xl font-semibold tabular-nums">{percent}%</span>
    </span>
  );
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
  const shown = onlyWrong ? wrong : grade.items;
  const { prefs } = useMe();

  return (
    <div className="flex flex-1 flex-col py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl">{mood}</h1>
          <p className="mt-3 font-display text-5xl leading-none font-semibold text-fg tabular-nums">
            Đúng {grade.correct}/{grade.total}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-fg-muted">
            <span>{formatDuration(durationMs)}</span>
            <span>+{grade.correct} XP</span>
          </p>
        </div>
        <div className="flex shrink-0 items-end">
          {prefs.mascot && (
            <Pup mood={grade.percent >= 70 ? "cheer" : grade.percent >= 40 ? "happy" : "sad"} size={72} className="-mr-3" />
          )}
          <PenScore percent={grade.percent} />
        </div>
      </header>
      {grade.percent === 100 && (
        <Celebration mood="cheer" size={72} className="mt-4" />
      )}

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
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const left = questions.length - answered;

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
      <SessionBar done={answered} total={questions.length} exitHref={exitHref} />

      <nav
        aria-label="Danh sách câu"
        className="fixed top-20 left-[calc(50%+22rem)] hidden w-40 lg:block"
      >
        <p className="mb-2 text-sm font-semibold text-fg-muted">Danh sách câu</p>
        <div className="grid grid-cols-4 gap-1.5">
          {questions.map((q, i) => (
            <a
              key={q.id}
              href={`#q-${i}`}
              aria-label={`Câu ${i + 1}${answers[q.id]?.trim() ? ", đã làm" : ""}`}
              className={cn(
                "grid size-9 place-items-center rounded-full text-sm font-medium tabular-nums",
                answers[q.id]?.trim()
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {i + 1}
            </a>
          ))}
        </div>
      </nav>

      <div className="my-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="">
          <h1 className="border-b border-border py-3 pr-4 pl-4 font-display text-lg font-semibold">Bài kiểm tra</h1>
          <div className="divide-y divide-border">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            answer={answers[q.id]}
            onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-3 border-t border-border bg-canvas/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-sm">
        <p className="flex-1 font-medium text-fg tabular-nums">
          Đã làm {answered}/{questions.length}
        </p>
        <Button type="button" size="lg" onClick={() => (left > 0 ? setConfirmOpen(true) : submit())}>
          Nộp bài
        </Button>
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
