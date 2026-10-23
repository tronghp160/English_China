import {
  checkTyping,
  choiceOptions,
  makeCloze,
  pickDistractors,
  shuffle,
  type Rng,
  type StudyWord,
  type TypingResult,
} from "./index";
import { fitsMode, type Question } from "./questions";

/** Pure logic of the test mode (docs/PLAN-study-games.md §4). */

export const TEST_TYPES = ["choice", "tf", "typing", "cloze"] as const;
export type TestType = (typeof TEST_TYPES)[number];
export const TEST_ASKS = ["both", "term", "meaning"] as const;
export type TestAsk = (typeof TEST_ASKS)[number];
export const DEFAULT_TEST_TYPES: TestType[] = ["choice", "tf", "typing"];

export const TEST_TYPE_LABEL: Record<TestType, string> = {
  choice: "Trắc nghiệm",
  tf: "Đúng / Sai",
  typing: "Gõ từ",
  cloze: "Điền từ",
};

export type TestOptions = { types: TestType[]; ask: TestAsk; count?: number };

/** "choice,tf" from a URL, keeping known types only (the defaults when none is left). */
export function parseTestTypes(raw: unknown): TestType[] {
  const list = typeof raw === "string" ? raw.split(",") : [];
  const types = TEST_TYPES.filter((t) => list.includes(t));
  return types.length ? types : DEFAULT_TEST_TYPES;
}

export function parseTestAsk(raw: unknown): TestAsk {
  return TEST_ASKS.find((a) => a === raw) ?? "both";
}

function promptFor(ask: TestAsk, rng: Rng): "term" | "meaning" {
  return ask === "both" ? (rng() < 0.5 ? "term" : "meaning") : ask;
}

/**
 * A mixed test: the chosen question types share the questions evenly (the
 * remainder goes to random types), every word is asked once, order shuffled.
 * Cloze only takes words with a usable example; its missing share goes to the
 * other types. With fewer than 2 words there is nothing to choose between, so
 * choice and true/false fall back to typing.
 */
export function buildTest(
  targets: StudyWord[],
  pool: StudyWord[],
  { types, ask, count }: TestOptions,
  rng: Rng = Math.random,
): Question[] {
  const all = [...new Map([...targets, ...pool].map((w) => [w.id, w])).values()];
  const words = shuffle([...new Map(targets.map((w) => [w.id, w])).values()], rng);
  const total = Math.min(count ?? words.length, words.length);
  let chosen = [...new Set(types)].filter((t) => all.length >= 2 || (t !== "choice" && t !== "tf"));
  if (!chosen.length) chosen = ["typing"];

  const quota = new Map(chosen.map((t) => [t, Math.floor(total / chosen.length)]));
  shuffle(chosen, rng)
    .slice(0, total % chosen.length)
    .forEach((t) => quota.set(t, quota.get(t)! + 1));

  const plan: [StudyWord, TestType][] = [];
  const clozeQuota = quota.get("cloze") ?? 0;
  if (clozeQuota) {
    const fit = words.filter((w) => fitsMode(w, "cloze")).slice(0, clozeQuota);
    fit.forEach((w) => plan.push([w, "cloze"]));
    quota.delete("cloze");
    const others = [...quota.keys()];
    const fallback: TestType[] = others.length ? others : [all.length >= 2 ? "choice" : "typing"];
    for (let i = 0; i < clozeQuota - fit.length; i++) {
      const t = fallback[i % fallback.length];
      quota.set(t, (quota.get(t) ?? 0) + 1);
    }
  }
  const used = new Set(plan.map(([w]) => w.id));
  const rest = words.filter((w) => !used.has(w.id));
  for (const [t, k] of quota) rest.splice(0, k).forEach((w) => plan.push([w, t]));

  return shuffle(
    plan.map(([word, type], i) => testQuestion(word, type, all, ask, `${word.id}:${i}`, rng)),
    rng,
  );
}

function testQuestion(
  word: StudyWord,
  type: TestType,
  all: StudyWord[],
  ask: TestAsk,
  id: string,
  rng: Rng,
): Question {
  switch (type) {
    case "choice": {
      const prompt = promptFor(ask, rng);
      const opts = choiceOptions(word, all, rng);
      if (opts.length < 2) return { id, kind: "typing", word };
      return {
        id,
        kind: "choice",
        prompt,
        word,
        answerId: word.id,
        options: opts.map((o) => ({ id: o.id, label: prompt === "term" ? o.meaning_vi : o.term })),
      };
    }
    case "tf": {
      const prompt = promptFor(ask, rng);
      const [other] = pickDistractors(word, all, rng, 1);
      if (!other) return { id, kind: "typing", word };
      const isTrue = rng() < 0.5;
      const pair = isTrue ? word : other;
      return {
        id,
        kind: "truefalse",
        prompt,
        word,
        isTrue,
        shown: prompt === "term" ? pair.meaning_vi : pair.term,
      };
    }
    case "cloze": {
      const cloze = makeCloze(word)!;
      const others = pickDistractors(word, all, rng).map((o) => ({ id: o.id, label: o.term }));
      return {
        id,
        kind: "cloze",
        word,
        cloze,
        answerId: word.id,
        options: shuffle([{ id: word.id, label: cloze.answer }, ...others], rng),
      };
    }
    // Typing always shows the meaning: a typed Vietnamese meaning cannot be graded reliably.
    case "typing":
      return { id, kind: "typing", word };
  }
}

export type TestAnswers = Record<string, string>;
export type GradedItem = { question: Question; answer: string | null; result: TypingResult };
export type TestGrade = { correct: number; total: number; percent: number; items: GradedItem[] };

/**
 * Answers are option ids (choice, cloze), "true"/"false" (true/false) or the
 * typed text. A "close" typing answer counts as correct; a blank one is wrong.
 */
export function gradeTest(questions: Question[], answers: TestAnswers): TestGrade {
  const items = questions.map((question): GradedItem => {
    const raw = answers[question.id];
    const answer = raw?.trim() ? raw : null;
    let result: TypingResult = "wrong";
    if (answer !== null) {
      switch (question.kind) {
        case "typing":
          result = checkTyping(answer, question.word, question.word.language);
          break;
        case "truefalse":
          result = (answer === "true") === question.isTrue ? "correct" : "wrong";
          break;
        case "choice":
        case "cloze":
        case "tones":
          result = answer === question.answerId ? "correct" : "wrong";
          break;
      }
    }
    return { question, answer, result };
  });
  const correct = items.filter((i) => i.result !== "wrong").length;
  const total = items.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0, items };
}

/** What the user answered, as text for the review list. */
export function answerText(q: Question, answer: string | null): string | null {
  if (answer === null) return null;
  if (q.kind === "truefalse") return answer === "true" ? "Đúng" : "Sai";
  if ("options" in q) return q.options.find((o) => o.id === answer)?.label ?? null;
  return answer;
}

/** The expected answer, as text for the review list. */
export function expectedText(q: Question): string {
  switch (q.kind) {
    case "truefalse":
      return q.isTrue ? "Đúng" : `Sai (${q.prompt === "term" ? q.word.meaning_vi : q.word.term})`;
    case "choice":
    case "cloze":
    case "tones":
      return q.options.find((o) => o.id === q.answerId)?.label ?? q.word.term;
    default:
      return q.word.reading ? `${q.word.term} · ${q.word.reading}` : q.word.term;
  }
}
