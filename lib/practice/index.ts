import type { LangCode } from "@/lib/lang/types";
import { containsHan, pinyinMatches, tonePattern } from "@/lib/lang/zh";
import type { Tables } from "@/lib/supabase/database.types";
import type { Example, LangExtra } from "@/lib/word-schema";

/**
 * Pure helpers for the practice modes (docs/PLAN.md §10.4). Everything that
 * needs randomness takes an rng so tests are deterministic.
 */

/** Word as returned by get_due_cards / practice_words (search columns dropped). */
export type StudyWord = Omit<Tables<"words">, "normalized" | "reading_key">;

export type Rng = () => number;

export function shuffle<T>(list: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// ---------------------------------------------------------------------------
// Typing
// ---------------------------------------------------------------------------

export type TypingResult = "correct" | "close" | "wrong";

function cleanEn(s: string) {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .trim()
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * EN: case-insensitive; one typo allowed for words of ≥ 6 letters ("gần đúng").
 * ZH: the Hanzi (traditional accepted), or pinyin with marks, numbers or no tones.
 */
export function checkTyping(
  input: string,
  word: Pick<StudyWord, "term" | "reading" | "lang_extra">,
  lang: LangCode,
): TypingResult {
  if (!input.trim()) return "wrong";
  if (lang === "zh") {
    if (containsHan(input)) {
      const typed = input.replace(/\s/g, "");
      const traditional = ((word.lang_extra ?? {}) as LangExtra).traditional;
      return typed === word.term || (traditional && typed === traditional) ? "correct" : "wrong";
    }
    return word.reading && pinyinMatches(input, word.reading) ? "correct" : "wrong";
  }
  const a = cleanEn(input);
  const b = cleanEn(word.term);
  if (a === b) return "correct";
  if (b.replace(/\s/g, "").length >= 6 && levenshtein(a, b) <= 1) return "close";
  return "wrong";
}

// ---------------------------------------------------------------------------
// Multiple choice (quiz, listening)
// ---------------------------------------------------------------------------

// Cheap client-side key (keeps opencc out of the browser bundle).
export const textKey = (s: string) => s.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The target plus up to 3 distractors from the same deck, preferring words
 * that share a part of speech or topic (harder to guess).
 */
export function pickDistractors(
  target: StudyWord,
  pool: StudyWord[],
  rng: Rng = Math.random,
  count = 3,
): StudyWord[] {
  const seenTerms = new Set([textKey(target.term)]);
  const seenMeanings = new Set([target.meaning_vi.trim().toLowerCase()]);
  const candidates = shuffle(pool, rng).filter((w) => w.id !== target.id);
  const score = (w: StudyWord) =>
    (w.parts_of_speech.some((p) => target.parts_of_speech.includes(p)) ? 2 : 0) +
    (w.topic && w.topic === target.topic ? 1 : 0);
  // stable sort keeps the shuffled order inside each score group
  candidates.sort((a, b) => score(b) - score(a));

  const out: StudyWord[] = [];
  for (const w of candidates) {
    if (out.length >= count) break;
    const t = textKey(w.term);
    const m = w.meaning_vi.trim().toLowerCase();
    if (seenTerms.has(t) || seenMeanings.has(m)) continue;
    seenTerms.add(t);
    seenMeanings.add(m);
    out.push(w);
  }
  return out;
}

export function choiceOptions(
  target: StudyWord,
  pool: StudyWord[],
  rng: Rng = Math.random,
): StudyWord[] {
  return shuffle([target, ...pickDistractors(target, pool, rng)], rng);
}

// ---------------------------------------------------------------------------
// Cloze
// ---------------------------------------------------------------------------

export type Cloze = {
  before: string;
  answer: string;
  after: string;
  vi: string | null;
  reading: string | null;
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function englishForms(word: Pick<StudyWord, "term" | "lang_extra">): string[] {
  const term = word.term.trim();
  const extra = (word.lang_extra ?? {}) as LangExtra;
  const forms = new Set<string>([term]);
  const vf = extra.verb_forms;
  if (vf)
    [vf.past, vf.past_participle, vf.ing, vf.third_person].forEach(
      (f) => f?.trim() && forms.add(f.trim()),
    );
  if (extra.plural?.trim()) forms.add(extra.plural.trim());
  if (!term.includes(" ")) {
    const base = term.replace(/e$/, "");
    [
      `${term}s`,
      `${term}es`,
      `${term}d`,
      `${term}ed`,
      `${base}ing`,
      `${term}ing`,
      `${term.replace(/y$/, "ies")}`,
    ].forEach((f) => forms.add(f));
  }
  // longest first so "running" wins over "run"
  return [...forms].sort((a, b) => b.length - a.length);
}

/** Hide the word inside one of its example sentences, or null when it does not appear. */
export function makeCloze(
  word: Pick<StudyWord, "term" | "lang_extra" | "examples" | "language">,
): Cloze | null {
  const examples = (Array.isArray(word.examples) ? word.examples : []) as unknown as Example[];
  for (const ex of examples) {
    const text = ex.text ?? "";
    if (word.language === "zh") {
      const i = text.indexOf(word.term);
      if (i >= 0) {
        return {
          before: text.slice(0, i),
          answer: word.term,
          after: text.slice(i + word.term.length),
          vi: ex.vi ?? null,
          reading: null,
        };
      }
      continue;
    }
    for (const form of englishForms(word)) {
      const m = new RegExp(`(^|[^\\p{L}'])(${escapeRe(form)})(?![\\p{L}])`, "iu").exec(text);
      if (m) {
        const start = m.index + m[1].length;
        return {
          before: text.slice(0, start),
          answer: m[2],
          after: text.slice(start + m[2].length),
          vi: ex.vi ?? null,
          reading: null,
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tones (zh)
// ---------------------------------------------------------------------------

export const TONE_GLYPH: Record<string, string> = {
  "1": "ˉ",
  "2": "ˊ",
  "3": "ˇ",
  "4": "ˋ",
  "5": "·",
};

/** "1-2" for 坚强 (jiānqiáng), or null without a usable reading. */
export function wordTonePattern(word: Pick<StudyWord, "term" | "reading">): string | null {
  if (!word.reading) return null;
  const pattern = tonePattern(word.reading);
  const syllables = pattern.split("-").length;
  // The reading must line up with the characters, or the question is meaningless.
  return syllables === [...word.term].length ? pattern : null;
}

/** The correct tone pattern plus 3 different ones of the same length. */
export function toneOptions(pattern: string, rng: Rng = Math.random): string[] {
  const tones = pattern.split("-");
  const pool = tones.includes("5") ? ["1", "2", "3", "4", "5"] : ["1", "2", "3", "4"];
  const out = new Set([pattern]);
  const maxDistinct = pool.length ** tones.length;
  let guard = 0;
  while (out.size < Math.min(4, maxDistinct) && guard++ < 200) {
    // change one or two syllables so options stay plausible
    const next = [...tones];
    const changes = tones.length > 1 && rng() < 0.4 ? 2 : 1;
    for (let c = 0; c < changes; c++) {
      const i = Math.floor(rng() * next.length);
      next[i] = pool[Math.floor(rng() * pool.length)];
    }
    out.add(next.join("-"));
  }
  return shuffle([...out], rng);
}
