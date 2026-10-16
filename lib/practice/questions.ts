import type { PracticeMode } from "@/lib/lang/registry";
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
  | { id: string; kind: "typing"; word: StudyWord }
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
  mode: PracticeMode,
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

export const MODE_INFO: Record<PracticeMode, { label: string; hint: string }> = {
  quiz: { label: "Trắc nghiệm", hint: "Chọn nghĩa đúng của từ, hoặc từ đúng với nghĩa." },
  typing: { label: "Gõ từ", hint: "Nhìn nghĩa, gõ lại từ." },
  listening: { label: "Nghe", hint: "Nghe đọc rồi chọn từ đúng." },
  cloze: { label: "Điền từ", hint: "Chọn từ còn thiếu trong câu ví dụ." },
  writing: { label: "Luyện viết", hint: "Viết từng nét chữ Hán trên khung." },
  tones: { label: "Thanh điệu", hint: "Nghe từ rồi chọn đúng tổ hợp thanh." },
};
