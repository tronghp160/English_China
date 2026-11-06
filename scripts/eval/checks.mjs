// Pure rule checks for scripts/eval-tutor.mjs. No I/O, so tests/unit/eval-checks.test.ts can cover them.
// A check is a name ("has_ipa") or a one-key object with its argument ({ "max_words": 180 }).
// Every check returns { pass, skipped?, detail? }; a skipped check does not count for or against the score.

const norm = (s) => s.normalize("NFC");

const HAN = /\p{Script=Han}/u;
const PINYIN_TONES = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ";
/** A parenthesised chunk that holds at least one tone-marked syllable: "(nǐ hǎo)" or "（jiānqiáng）". */
const PINYIN_IN_PARENS = new RegExp(`[(（][^()（）\\n]*[${PINYIN_TONES}][^()（）\\n]*[)）]`, "u");
/** IPA Extensions, Spacing Modifier Letters (ˈ ː), Phonetic Extensions, and the few IPA letters outside those blocks. */
const IPA_CHARS = /[ɐ-˿ᴀ-ᶿæðŋθ]/u;
const VN_DIACRITIC = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/giu;
const GREETING = /^[\s*_>"'“‘]*(?:xin\s+chào|chào|hi|hello|hey|hế\s*lô|alo)(?![\p{L}\p{N}])/iu;

export const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
/**
 * Lower-case text for the "contains" checks, without markdown emphasis marks: an answer that writes
 * `She **doesn't** like coffee` does contain "doesn't like".
 */
const lower = (s) => norm(s).replace(/\*+/g, "").toLowerCase();
const lastParagraph = (text) => text.trim().split(/\n\s*\n/).pop() ?? "";
const count = (text, re) => (text.match(re) ?? []).length;

/** Share of Latin letters that carry a Vietnamese diacritic (0 for an English-only text). */
export function vietnameseRatio(text) {
  const letters = count(norm(text), /\p{Script=Latin}/gu);
  return letters ? count(norm(text), VN_DIACRITIC) / letters : 0;
}

export const CHECKS = {
  /** A /…/ transcription: needs an IPA letter, or a short plain-ASCII one standing alone like " /bed/ ". */
  has_ipa(text) {
    for (const m of norm(text).matchAll(/\/([^/\n]{2,40})\//g)) if (IPA_CHARS.test(m[1])) return { pass: true };
    const ascii = /(?:^|[\s(\[])\/[a-z.]{2,12}\/(?=$|[\s),.;:\]])/.test(text);
    return { pass: ascii, detail: ascii ? undefined : "no /IPA/ transcription" };
  },

  /** Chinese text must come with pinyin with tone marks in parentheses, like the tutor hint asks. */
  has_pinyin_tones(text) {
    if (!HAN.test(text)) return { pass: false, detail: "no Chinese characters in the answer" };
    const pass = PINYIN_IN_PARENS.test(norm(text));
    return { pass, detail: pass ? undefined : "no tone-marked pinyin in parentheses" };
  },

  no_emoji(text) {
    const m = text.match(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|️/u);
    return { pass: !m, detail: m ? `emoji ${m[0]}` : undefined };
  },

  no_table(text) {
    const pass = !/^\s*\|.*\|\s*$/m.test(text) && !/\|\s*:?-{3,}/.test(text);
    return { pass, detail: pass ? undefined : "markdown table" };
  },

  no_heading(text) {
    const pass = !/^\s{0,3}#{1,6}\s+\S/m.test(text);
    return { pass, detail: pass ? undefined : "markdown heading" };
  },

  max_words(text, n) {
    const w = wordCount(text);
    return { pass: w <= n, detail: `${w} words (max ${n})` };
  },

  min_words(text, n) {
    const w = wordCount(text);
    return { pass: w >= n, detail: `${w} words (min ${n})` };
  },

  /** Opening with "Chào…/Hi…" when the learner did not greet first. Skipped when they did. */
  no_greeting_unprompted(text, _arg, ctx) {
    if (GREETING.test(norm(ctx?.userText ?? ""))) return { pass: true, skipped: true };
    const m = norm(text).match(GREETING);
    return { pass: !m, detail: m ? `starts with a greeting: "${m[0].trim()}"` : undefined };
  },

  /** Case-insensitive: at least one of the strings appears. */
  contains_any(text, list) {
    const t = lower(text);
    const hit = list.find((s) => t.includes(lower(s)));
    return { pass: hit !== undefined, detail: hit ? undefined : `none of ${JSON.stringify(list)}` };
  },

  contains_all(text, list) {
    const t = lower(text);
    const missing = list.filter((s) => !t.includes(lower(s)));
    return { pass: missing.length === 0, detail: missing.length ? `missing ${JSON.stringify(missing)}` : undefined };
  },

  not_contains_any(text, list) {
    const t = lower(text);
    const hit = list.find((s) => t.includes(lower(s)));
    return { pass: hit === undefined, detail: hit ? `contains "${hit}"` : undefined };
  },

  /** The explanation is in Vietnamese: enough Latin letters carry a Vietnamese diacritic (default 0.12). */
  vi_explanation(text, min = 0.12) {
    const ratio = vietnameseRatio(text);
    return { pass: ratio >= min, detail: `Vietnamese ratio ${ratio.toFixed(2)} (min ${min})` };
  },

  /** At most one question mark in the last paragraph (the tutor ends with one question or none). */
  asks_one_question(text) {
    const n = count(lastParagraph(text), /[?？]/g);
    return { pass: n <= 1, detail: n > 1 ? `${n} question marks in the last paragraph` : undefined };
  },

  /** At most n question marks in the whole answer (a quiz turn asks one question). */
  max_question_marks(text, n) {
    const q = count(text, /[?？]/g);
    return { pass: q <= n, detail: `${q} question marks (max ${n})` };
  },

  /**
   * At most n questions, not counting the *italic* translation line and the pinyin in parentheses: a role-play
   * turn that asks one question and writes it in Chinese, pinyin and Vietnamese still asks one.
   */
  max_questions(text, n) {
    const asked = text
      .replace(/\*[^*\n]+\*/g, "")
      .replace(/[(（][^()（）\n]*[)）]/g, "");
    const q = count(asked, /[?？]/g);
    return { pass: q <= n, detail: `${q} questions (max ${n}), not counting translation and pinyin` };
  },

  /** A line in *italics* (the Vietnamese translation line of a role-play turn). */
  has_italic_line(text) {
    const pass = /(?:^|\s)[*_][^*_\n]{3,}[*_](?=$|[\s.,!?])/m.test(text);
    return { pass, detail: pass ? undefined : "no *italic* line" };
  },
};

/** @typedef {string | Record<string, unknown>} CheckSpec */

/**
 * "has_ipa" -> { name, arg: undefined }; { max_words: 180 } -> { name: "max_words", arg: 180 }.
 * @param {CheckSpec} check
 * @returns {{ name: string, arg: any }}
 */
export function normalizeCheck(check) {
  if (typeof check === "string") return { name: check, arg: undefined };
  const keys = Object.keys(check ?? {});
  if (keys.length !== 1) throw new Error(`A check object needs exactly one key: ${JSON.stringify(check)}`);
  return { name: keys[0], arg: check[keys[0]] };
}

/**
 * Runs the checks of one case over an answer. `ctx.userText` is the learner's message.
 * `defaults` come first; the case's own `omit` names drop default checks that do not fit (e.g. a role-play greeting).
 * @param {{ checks?: CheckSpec[], defaults?: CheckSpec[], omit?: string[] }} spec
 * @param {string} answer
 * @param {{ userText?: string }} [ctx] (more keys are passed on to the checks of a custom registry)
 * @param {Record<string, (text: string, arg: any, ctx: any) => any>} [registry] the checks that exist (default: CHECKS)
 * @returns {{ name: string, arg: any, pass: boolean, skipped?: boolean, detail?: string }[]}
 */
export function runChecks({ checks = [], defaults = [], omit = [] }, answer, ctx = {}, registry = CHECKS) {
  const wanted = [...defaults.map(normalizeCheck).filter((c) => !omit.includes(c.name)), ...checks.map(normalizeCheck)];
  return wanted.map(({ name, arg }) => {
    const fn = registry[name];
    if (!fn) throw new Error(`Unknown check "${name}"`);
    return { name, arg, ...fn(answer, arg, ctx) };
  });
}

/**
 * Pass rates per check name and overall over a list of { id, results }. Skipped checks are left out.
 * @param {{ id: string, results: { name: string, pass: boolean, skipped?: boolean }[] }[]} cases
 */
export function tally(cases) {
  const byCheck = {};
  let passed = 0;
  let total = 0;
  let casesPassed = 0;
  for (const c of cases) {
    const counted = c.results.filter((r) => !r.skipped);
    for (const r of counted) {
      const slot = (byCheck[r.name] ??= { pass: 0, total: 0 });
      slot.total++;
      total++;
      if (r.pass) {
        slot.pass++;
        passed++;
      }
    }
    if (counted.every((r) => r.pass)) casesPassed++;
  }
  return { byCheck, passed, total, rate: total ? passed / total : 0, casesPassed, cases: cases.length };
}
