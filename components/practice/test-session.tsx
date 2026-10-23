"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Confetti } from "@/components/review/confetti";
import { SessionBar, useOutboxStatus } from "@/components/review/session-bar";
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

const KIND_LOOK: Partial<Record<Question["kind"], { label: string; tone: string }>> = {
  choice: { label: "Trắc nghiệm", tone: "bg-wash-grape text-grape-text" },
  truefalse: { label: "Đúng / Sai", tone: "bg-wash-pink text-pink-text" },
  typing: { label: "Gõ từ", tone: "bg-wash-sky text-sky-text" },
  cloze: { label: "Điền từ", tone: "bg-wash-yellow text-sun-text" },
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
            "btn-3d flex min-h-14 items-center justify-center gap-2 rounded-btn border-2 text-lg font-bold text-ink",
            value === v
              ? "border-ink-blue bg-wash-blue [--edge-color:var(--ink-blue)]"
              : "border-rule bg-surface [--edge-color:var(--rule)] hover:bg-wash-blue",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

function QuestionCard({
  q,
  index,
  total,
  answer,
  onAnswer,
}: {
  q: Question;
  index: number;
  total: number;
  answer: string | undefined;
  onAnswer: (v: string) => void;
}) {
  const zh = q.word.language === "zh";
  const look = KIND_LOOK[q.kind];
  const titleId = `q-${index}-title`;
  let body: React.ReactNode = null;

  switch (q.kind) {
    case "choice":
      body = (
        <>
          <div className="flex flex-col items-center gap-2 py-3">
            {q.prompt === "term" ? <TermLine word={q.word} /> : <MeaningLine word={q.word} />}
            <p className="text-sm text-ink-soft">
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
            {q.prompt === "term" ? <TermLine word={q.word} /> : <MeaningLine word={q.word} />}
            <p className="text-sm text-ink-soft">{q.prompt === "term" ? "có nghĩa là" : "là từ"}</p>
            <p
              lang={q.prompt === "meaning" && zh ? "zh-CN" : undefined}
              className={cn(
                "rounded-btn bg-wash-pink px-4 py-2 text-xl font-semibold text-ink",
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
            <MeaningLine word={q.word} />
          </div>
          <label htmlFor={`q-${index}-input`} className="mb-1 block text-sm text-ink-soft">
            {zh ? "Gõ chữ Hán hoặc pinyin" : "Gõ từ tiếng Anh"}
          </label>
          <input
            id={`q-${index}-input`}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={answer ?? ""}
            onChange={(e) => onAnswer(e.target.value)}
            lang={zh ? "zh-CN" : "en"}
            className="h-14 w-full rounded-btn border-2 border-rule bg-surface px-4 text-xl text-ink outline-none focus:border-ink-blue"
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
            className={cn("py-3 text-xl leading-relaxed text-ink", zh && "font-hanzi text-2xl")}
          >
            {q.cloze.before}
            <span className="mx-1 inline-block min-w-16 border-b-2 border-ink-blue text-center font-semibold text-ink-blue">
              {picked ?? " "}
            </span>
            {q.cloze.after}
          </p>
          {q.cloze.vi && <p className="-mt-1 mb-3 text-ink-soft">{q.cloze.vi}</p>}
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
    <section
      id={`q-${index}`}
      aria-labelledby={titleId}
      className="notebook-card scroll-mt-20 p-4"
    >
      <div className="flex items-center gap-2">
        <h2 id={titleId} className="text-base text-ink">
          Câu {index + 1}/{total}
        </h2>
        {look && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", look.tone)}>
            {look.label}
          </span>
        )}
      </div>
      {body}
    </section>
  );
}

function verdict(pct: number) {
  if (pct >= 90) return { emoji: "🏆", text: "Xuất sắc!" };
  if (pct >= 70) return { emoji: "🎉", text: "Làm tốt lắm!" };
  return { emoji: "💪", text: "Cố thêm chút nữa nhé!" };
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
    <div className="relative flex flex-1 flex-col py-6">
      {grade.percent >= 90 && <Confetti />}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-end">
          <ProgressRing
            value={grade.percent}
            size={140}
            stroke={14}
            trackClassName="text-muted"
            barClassName={grade.percent >= 70 ? "text-jade" : "text-sun"}
          >
            <span className="font-heading text-4xl font-black text-ink tabular-nums">
              {grade.percent}%
            </span>
          </ProgressRing>
          {prefs.mascot && (
            <Pup
              mood={grade.percent >= 70 ? "cheer" : grade.percent >= 40 ? "happy" : "sad"}
              size={84}
              className="-ml-4"
            />
          )}
        </div>
        <h1 className="mt-2 text-2xl text-ink">
          {mood.text} {!prefs.mascot && <span aria-hidden>{mood.emoji}</span>}
        </h1>
        <p className="font-semibold text-ink">
          Đúng {grade.correct}/{grade.total}
        </p>
        <p className="text-sm text-ink-soft">
          {formatDuration(durationMs)} · +{grade.correct} XP
        </p>
      </div>

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-btn bg-wash-yellow px-3 py-2 text-sm text-ink">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng.
        </p>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {wrong.length > 0 && (
          <button
            type="button"
            onClick={onRetryWrong}
            className="btn-3d min-h-14 rounded-btn bg-primary px-4 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            Làm lại câu sai ({wrong.length})
          </button>
        )}
        {wrong.length > 0 && learnHref && (
          <Link
            href={learnHref(wrong.map((i) => i.question.word.id))}
            className="btn-3d inline-flex min-h-14 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
          >
            Học các từ sai
          </Link>
        )}
        <a
          href={againHref}
          className="btn-3d inline-flex min-h-14 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
        >
          Làm bài mới
        </a>
        <Link
          href={exitHref}
          className="btn-3d inline-flex min-h-14 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
        >
          Xong
        </Link>
      </div>

      {matchHref && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          Đổi gió một chút?{" "}
          <Link href={matchHref} className="font-semibold text-ink-blue underline-offset-4 hover:underline">
            Chơi Ghép thẻ ⏱️
          </Link>
        </p>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg text-ink">Xem lại bài</h2>
          {wrong.length > 0 && wrong.length < grade.total && (
            <button
              type="button"
              aria-pressed={onlyWrong}
              onClick={() => setOnlyWrong(!onlyWrong)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold",
                onlyWrong
                  ? "border-ink-blue bg-ink-blue text-primary-foreground"
                  : "border-rule bg-surface text-ink-soft hover:text-ink",
              )}
            >
              Chỉ câu sai
            </button>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {shown.map((item) => {
            const n = grade.items.indexOf(item) + 1;
            const q = item.question;
            const ok = item.result !== "wrong";
            const given = answerText(q, item.answer);
            const zh = q.word.language === "zh";
            return (
              <li key={q.id}>
                <details open={!ok} className="group notebook-card">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2">
                    {ok ? (
                      <Check className="size-5 shrink-0 text-jade-text" aria-label="Đúng" />
                    ) : (
                      <X className="size-5 shrink-0 text-danger" aria-label="Sai" />
                    )}
                    <span className="shrink-0 text-sm font-bold text-ink-soft">Câu {n}</span>
                    {/* mixed scripts (term = meaning?), so no CJK serif face here */}
                    <span className="min-w-0 flex-1 truncate text-ink">{questionText(q)}</span>
                    {item.result === "close" && (
                      <span className="shrink-0 rounded-full bg-wash-yellow px-2 py-0.5 text-xs font-semibold text-sun-text">
                        Gần đúng
                      </span>
                    )}
                  </summary>
                  <div className="flex items-start gap-3 border-t border-rule px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1 text-[0.9375rem]">
                      <p className={ok ? "text-jade-text" : "text-danger"}>
                        Bạn trả lời: <span className="font-semibold">{given ?? "(bỏ trống)"}</span>
                      </p>
                      {(!ok || item.result === "close") && (
                        <p className="text-jade-text">
                          Đáp án: <span className="font-semibold">{expectedText(q)}</span>
                        </p>
                      )}
                      <p className="text-ink-soft">
                        <span lang={zh ? "zh-CN" : "en"} className={cn("font-semibold text-ink", zh && "font-hanzi")}>
                          {q.word.term}
                        </span>
                        {q.word.reading && ` · ${q.word.reading}`} — {q.word.meaning_vi}
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
        <p className="mb-2 text-sm font-bold text-ink-soft">Danh sách câu</p>
        <div className="grid grid-cols-4 gap-1.5">
          {questions.map((q, i) => (
            <a
              key={q.id}
              href={`#q-${i}`}
              aria-label={`Câu ${i + 1}${answers[q.id]?.trim() ? ", đã làm" : ""}`}
              className={cn(
                "grid size-9 place-items-center rounded-lg text-sm font-bold tabular-nums",
                answers[q.id]?.trim()
                  ? "bg-ink-blue text-primary-foreground"
                  : "border-2 border-rule bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {i + 1}
            </a>
          ))}
        </div>
      </nav>

      <h1 className="sr-only">Kiểm tra</h1>
      <div className="flex flex-col gap-4 py-3">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            total={questions.length}
            answer={answers[q.id]}
            onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-3 border-t border-rule bg-paper/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <p className="flex-1 font-semibold text-ink tabular-nums">
          Đã làm {answered}/{questions.length}
        </p>
        <button
          type="button"
          onClick={() => (left > 0 ? setConfirmOpen(true) : submit())}
          className="btn-3d min-h-12 rounded-btn bg-primary px-6 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
        >
          Nộp bài
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-sheet">
          <AlertDialogHeader>
            <AlertDialogTitle>Còn {left} câu chưa làm. Vẫn nộp?</AlertDialogTitle>
            <AlertDialogDescription>Câu bỏ trống được tính là sai.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-btn">Làm tiếp</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 rounded-btn" onClick={submit}>
              Nộp bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
