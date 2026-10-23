import type { PracticeMode, ReviewMode } from "@/lib/lang/registry";
import {
  choiceOptions,
  makeCloze,
  pickDistractors,
  shuffle,
  toneOptions,
  wordTonePattern,
  type Cloze,
  type Rng,
  type StudyWord,
} from "./index";

export type Option = { id: string; label: string };

export type Question =
  | {
      id: string;
      kind: "choice";
      prompt: "term" | "meaning" | "audio";
      word: StudyWord;
      options: Option[];
      answerId: string;
    }
  | { id: string; kind: "flashcard"; word: StudyWord }
  | { id: string; kind: "typing"; word: StudyWord }
  | {
      /** Test mode: is `shown` the meaning of the term (or the term of the meaning)? */
      id: string;
      kind: "truefalse";
      prompt: "term" | "meaning";
      word: StudyWord;
      shown: string;
      isTrue: boolean;
    }
  | {
      id: string;
      kind: "cloze";
      word: StudyWord;
      cloze: Cloze;
      options: Option[];
      answerId: string;
    }
  | { id: string; kind: "tones"; word: StudyWord; options: Option[]; answerId: string }
  | { id: string; kind: "writing"; word: StudyWord; chars: string[] };

const HAN = /\p{Script=Han}/u;

/** Whether a word can be asked in a mode at all. */
export function fitsMode(word: StudyWord, mode: PracticeMode): boolean {
  switch (mode) {
    case "cloze":
      return makeCloze(word) !== null;
    case "tones":
      return wordTonePattern(word) !== null;
    case "writing":
      return [...word.term].some((c) => HAN.test(c));
    default:
      return true;
  }
}

/**
 * Build the questions of a practice session on the server (randomness stays
 * out of client rendering). `pool` provides distractors from the same deck.
 */
export function buildQuestions(
  mode: ReviewMode,
  targets: StudyWord[],
  pool: StudyWord[],
  rng: Rng = Math.random,
): Question[] {
  const all = [...new Map([...targets, ...pool].map((w) => [w.id, w])).values()];
  return targets
    .filter((w) => fitsMode(w, mode))
    .map((word, i): Question => {
      const id = `${word.id}:${i}`;
      switch (mode) {
        case "quiz": {
          const prompt = rng() < 0.5 ? "term" : "meaning";
          const opts = choiceOptions(word, all, rng);
          return {
            id,
            kind: "choice",
            prompt,
            word,
            answerId: word.id,
            options: opts.map((o) => ({
              id: o.id,
              label: prompt === "term" ? o.meaning_vi : o.term,
            })),
          };
        }
        case "listening":
          return {
            id,
            kind: "choice",
            prompt: "audio",
            word,
            answerId: word.id,
            options: choiceOptions(word, all, rng).map((o) => ({ id: o.id, label: o.term })),
          };
        case "flashcard":
          return { id, kind: "flashcard", word };
        case "typing":
          return { id, kind: "typing", word };
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
        case "tones": {
          const pattern = wordTonePattern(word)!;
          return {
            id,
            kind: "tones",
            word,
            answerId: pattern,
            options: toneOptions(pattern, rng).map((p) => ({ id: p, label: p })),
          };
        }
        case "writing":
          return { id, kind: "writing", word, chars: [...word.term].filter((c) => HAN.test(c)) };
      }
    });
}

/** The review_logs mode an answered question is stored under. */
export function reviewModeOf(q: Question): ReviewMode {
  switch (q.kind) {
    case "choice":
      return q.prompt === "audio" ? "listening" : "quiz";
    case "truefalse":
      return "quiz";
    default:
      return q.kind;
  }
}

/** Set sizes offered per mode (match counts pairs, 6 per board). */
export function countsFor(mode: PracticeMode): number[] {
  switch (mode) {
    case "flashcard":
      return [20, 50, 200]; // 200 = the whole deck in practice
    case "match":
      return [6, 12, 18];
    case "learn":
      return [10, 20, 50];
    default:
      return [10, 20, 30];
  }
}

export const MODE_INFO: Record<PracticeMode, { label: string; hint: string }> = {
  learn: { label: "Học", hint: "Học theo vòng tới khi thuộc hết bộ từ." },
  test: { label: "Kiểm tra", hint: "Làm bài trộn nhiều dạng câu, chấm điểm cuối bài." },
  match: { label: "Ghép thẻ", hint: "Ghép từ với nghĩa nhanh nhất có thể." },
  flashcard: { label: "Lật thẻ", hint: "Lật qua lật lại, tự đánh dấu thuộc hay chưa." },
  quiz: { label: "Trắc nghiệm", hint: "Chọn nghĩa đúng của từ, hoặc từ đúng với nghĩa." },
  typing: { label: "Gõ từ", hint: "Nhìn nghĩa, gõ lại từ." },
  listening: { label: "Nghe", hint: "Nghe đọc rồi chọn từ đúng." },
  cloze: { label: "Điền từ", hint: "Chọn từ còn thiếu trong câu ví dụ." },
  writing: { label: "Luyện viết", hint: "Viết từng nét chữ Hán trên khung." },
  tones: { label: "Thanh điệu", hint: "Nghe từ rồi chọn đúng tổ hợp thanh." },
};
