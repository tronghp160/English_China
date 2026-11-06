import "server-only";
import { lookupBest, type LookupSource } from "@/lib/ai/lookup";
import { summarizeEntry, type EntrySummary } from "@/lib/ai/tutor/summarize";
import type { LangCode } from "@/lib/lang/types";

/** How long the learner's message may wait for the dictionary lookups. Past this they are simply dropped. */
export const PREFETCH_BUDGET_MS = 800;
const MAX_TERMS = 2;

export type DetectedTerm = { term: string; language: LangCode };
export type Prefetched = DetectedTerm & { source: LookupSource; entry: EntrySummary };

// An English term: 1–2 words of ASCII letters. A Chinese one: 1–4 characters.
const EN = "[A-Za-z][A-Za-z'-]*";
const EN_TERM = `${EN}(?:\\s+${EN})?`;
const HAN_TERM = "\\p{Script=Han}{1,4}";
const TERM = `(?:${EN_TERM}|${HAN_TERM})`;
const NOT_IN_WORD = "(?<![\\p{L}\\p{N}])";

const COMPARE = [
  // "phân biệt make và do", "Phân biệt 会 và 能"
  new RegExp(`phân\\s+biệt\\s+(${TERM})\\s+(?:và|với|vs\\.?|hay)\\s+(${TERM})(?![\\p{L}\\p{N}'-])`, "iu"),
  // "borrow khác lend thế nào?"
  // (not "khác nhau": that is a fixed phrase, "nhau" is no word to look up)
  new RegExp(`${NOT_IN_WORD}(${TERM})\\s+khác\\s+(?!nhau(?![\\p{L}]))(${TERM})(?![\\p{L}\\p{N}'-])`, "iu"),
  // "borrow và lend khác nhau thế nào"
  new RegExp(`${NOT_IN_WORD}(${TERM})\\s+(?:và|với)\\s+(${TERM})\\s+khác\\s+nhau`, "iu"),
];

// A word in straight or curly quotes: 'sesquipedalian', “give up”. Not the apostrophe inside "don't".
const QUOTED = new RegExp(`${NOT_IN_WORD}['"“‘](${EN}(?:\\s+${EN}){0,2})['"”’](?![\\p{L}\\p{N}])`, "giu");

// "apple nghĩa là gì", "give up là gì", "library đọc thế nào", "run dùng thế nào", "ubiquitous phát âm"
const ASKED_ABOUT = new RegExp(
  `${NOT_IN_WORD}(${EN}(?:\\s+${EN}){0,2})\\s+(?:có\\s+)?(?:nghĩa\\s+là\\s+gì|là\\s+gì|đọc\\s+(?:là\\s+gì|thế\\s+nào|sao|như\\s+thế\\s+nào)|phát\\s+âm|dùng\\s+(?:thế\\s+nào|sao|như\\s+thế\\s+nào))`,
  "iu",
);

const HAN_RUN = /\p{Script=Han}+/gu;

const isHan = (term: string) => /\p{Script=Han}/u.test(term);

/**
 * Pure. The words a learner's message asks about, for a lookup before the model answers (at most 2).
 * The script decides the language (Chinese characters = zh, Latin letters = en): the tutor answers about either
 * language whatever the thread's language is. It is deliberately conservative; a miss only means the model
 * calls lookupWord itself, as before:
 * - "phân biệt A và B", "A khác B", "A và B khác nhau"
 * - a word or phrase of up to 3 words in quotes
 * - up to 3 English words before "nghĩa là gì / là gì / đọc thế nào / phát âm / dùng thế nào"
 * - Chinese characters in runs of 1–4; a longer run is a sentence (to correct or translate), so none are taken
 */
export function detectTerms(text: string): DetectedTerm[] {
  const found: string[] = [];
  for (const re of COMPARE) {
    const m = re.exec(text);
    if (m) found.push(m[1], m[2]);
  }
  for (const m of text.matchAll(QUOTED)) found.push(m[1]);
  const asked = ASKED_ABOUT.exec(text);
  // "tiếng Trung là gì" asks about a language name written without diacritics (Trung, Anh), not about a word.
  if (asked && !/tiếng\s+$/iu.test(text.slice(0, asked.index))) found.push(asked[1]);
  const runs = text.match(HAN_RUN) ?? [];
  if (!runs.some((r) => [...r].length > 4)) found.push(...runs);

  const seen = new Set<string>();
  const terms: DetectedTerm[] = [];
  for (const raw of found) {
    const term = raw.replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push({ term, language: isHan(term) ? "zh" : "en" });
    if (terms.length === MAX_TERMS) break;
  }
  return terms;
}

/**
 * Looks up the words the message asks about in the sources that cost no AI quota (shared cache, CVDICT, free English
 * dictionary), in parallel with the rest of the prelude. Never throws and never waits longer than `budgetMs`: an
 * answer that is not ready by then is dropped and the model can still call lookupWord.
 */
export async function prefetchTerms(text: string, opts: { budgetMs?: number } = {}): Promise<Prefetched[]> {
  const terms = detectTerms(text);
  if (!terms.length) return [];
  const budgetMs = opts.budgetMs ?? PREFETCH_BUDGET_MS;
  const slots: (Prefetched | null)[] = terms.map(() => null);
  const lookups = terms.map(async ({ term, language }, i) => {
    try {
      const { result, source } = await lookupBest(language, term, { timeoutMs: budgetMs });
      if (result && source) slots[i] = { term, language, source, entry: summarizeEntry(result) };
    } catch (e) {
      console.error("[tutor] prefetch", e instanceof Error ? e.message : e);
    }
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([Promise.all(lookups), new Promise<void>((resolve) => (timer = setTimeout(resolve, budgetMs)))]);
  clearTimeout(timer);
  return slots.filter((s): s is Prefetched => s !== null);
}

// Dictionary text goes into the instructions: no angle brackets (it cannot close the tag), one line, bounded.
const clean = (s: string, max = 140) => {
  const t = s.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Pure. The `<tra_cuu_san>` block for the instructions: reading, Hán Việt, 2 senses with one example each. Null when empty. */
export function formatLookups(entries: Prefetched[]): string | null {
  if (!entries.length) return null;
  const blocks = entries.map(({ entry: e, language }) => {
    const reading = e.reading ? (language === "en" && !e.reading.startsWith("/") ? `/${e.reading}/` : e.reading) : null;
    const head =
      `- ${clean(e.term, 60)} (${language === "zh" ? "tiếng Trung" : "tiếng Anh"}${e.level ? `, ${clean(e.level, 20)}` : ""})` +
      (reading ? `, ${language === "zh" ? "pinyin" : "IPA"}: ${clean(reading, 60)}` : "") +
      (e.han_viet ? `, Hán Việt: ${clean(e.han_viet, 60)}` : "");
    const senses = e.senses.slice(0, 2).map((s, i) => {
      const pos = s.pos.length ? `(${s.pos.join(", ")}) ` : "";
      const ex = s.examples[0];
      const example = ex ? `; ví dụ: ${clean(ex.text)}${ex.reading ? ` (${clean(ex.reading)})` : ""} = ${clean(ex.vi)}` : "";
      return `  ${i + 1}. ${pos}${clean(s.meaning_vi)}${example}`;
    });
    const measure = e.measure_words.length ? `  Lượng từ: ${e.measure_words.slice(0, 4).map((m) => clean(m, 30)).join(", ")}` : null;
    return [head, ...senses, measure].filter((line): line is string => Boolean(line)).join("\n");
  });
  return ["<tra_cuu_san>", ...blocks, "</tra_cuu_san>"].join("\n");
}
