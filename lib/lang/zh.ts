/**
 * Pinyin helpers. Pure functions only (safe on client and server).
 * Tone 5 = neutral tone.
 */

export type Tone = 1 | 2 | 3 | 4 | 5;

const TONE_MARKS: Record<string, [string, Tone]> = {
  ā: ["a", 1], á: ["a", 2], ǎ: ["a", 3], à: ["a", 4],
  ē: ["e", 1], é: ["e", 2], ě: ["e", 3], è: ["e", 4],
  ī: ["i", 1], í: ["i", 2], ǐ: ["i", 3], ì: ["i", 4],
  ō: ["o", 1], ó: ["o", 2], ǒ: ["o", 3], ò: ["o", 4],
  ū: ["u", 1], ú: ["u", 2], ǔ: ["u", 3], ù: ["u", 4],
  ǖ: ["ü", 1], ǘ: ["ü", 2], ǚ: ["ü", 3], ǜ: ["ü", 4],
  ń: ["n", 2], ň: ["n", 3], ǹ: ["n", 4], ḿ: ["m", 2],
};

const MARKED: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

/** Tone of a single syllable written with marks ("qiáng") or numbers ("qiang2"). */
export function toneOf(syllable: string): Tone {
  const s = syllable.normalize("NFC");
  for (const ch of s) {
    const hit = TONE_MARKS[ch.toLowerCase()];
    if (hit) return hit[1];
  }
  const m = s.match(/([0-5])$/);
  if (m) {
    const n = Number(m[1]);
    return (n === 0 ? 5 : n) as Tone;
  }
  return 5;
}

/** Remove tone marks and tone numbers; keeps ü. "Jiānqiáng" -> "jianqiang". */
export function stripTones(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const hit = TONE_MARKS[ch.toLowerCase()];
    out += hit ? hit[0] : ch;
  }
  return out.replace(/(?<=[a-zü])[0-5]/gi, "").toLowerCase();
}

/** Plain-ASCII form for search: tones removed, ü -> u (also v -> u). */
export function pinyinSearchKey(text: string): string {
  return stripTones(text).replace(/[üv]/g, "u").replace(/[^a-z]/g, "");
}

/** Place a tone mark on a toneless syllable following standard rules. */
export function markSyllable(base: string, tone: Tone): string {
  const s = base.toLowerCase().replace(/v/g, "ü").replace(/u:/g, "ü");
  if (tone === 5) return s;
  let idx = -1;
  if (s.includes("a")) idx = s.indexOf("a");
  else if (s.includes("e")) idx = s.indexOf("e");
  else if (s.includes("ou")) idx = s.indexOf("o");
  else {
    // last vowel
    for (let i = s.length - 1; i >= 0; i--) {
      if ("iouü".includes(s[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) return s;
  const v = s[idx];
  const marked = MARKED[v]?.[tone - 1];
  return marked ? s.slice(0, idx) + marked + s.slice(idx + 1) : s;
}

/** "jian1 qiang2" -> "jiānqiáng" (syllables joined; pass joiner " " to keep spaces). */
export function numberedToMarked(numbered: string, joiner = ""): string {
  return numbered
    .trim()
    .split(/[\s']+/)
    .filter(Boolean)
    .map((syl) => {
      const m = syl.match(/^([a-züv:]+)([0-5])?$/i);
      if (!m) return syl;
      const tone = (m[2] ? (Number(m[2]) === 0 ? 5 : Number(m[2])) : 5) as Tone;
      return markSyllable(m[1], tone);
    })
    .join(joiner);
}

/** Marked syllables -> numbered: ["jiān","qiáng"] -> "jian1 qiang2". Neutral tone -> 5. */
export function markedToNumbered(syllables: string[]): string {
  return syllables.map((s) => `${stripTones(s)}${toneOf(s)}`).join(" ");
}

const INITIALS = [
  "zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
  "j", "q", "x", "r", "z", "c", "s", "y", "w", "",
];
const FINALS = new Set([
  "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong", "er",
  "i", "ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong",
  "u", "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng",
  "ü", "üe", "üan", "ün", "ue", "van", "ve", "vn", "m", "n", "ng", "r",
]);

function isSyllable(plain: string, first: boolean, strict: boolean): boolean {
  // In standard pinyin a/o/e-initial syllables need an apostrophe; strict mode enforces it.
  if (strict && !first && /^[aoe]/.test(plain)) return false;
  for (const ini of INITIALS) {
    if (!plain.startsWith(ini)) continue;
    const fin = plain.slice(ini.length);
    if (!FINALS.has(fin)) continue;
    if (ini === "") {
      // Without an initial only a/o/e finals (or interjections m, n, ng) stand alone.
      if (/^[aoe]/.test(fin) || ["m", "n", "ng"].includes(fin)) return true;
      continue;
    }
    if (["m", "n", "ng", "r"].includes(fin)) continue;
    return true;
  }
  return false;
}

/** Longest-first segmentation with backtracking. Returns lengths or null. */
function segmentPlain(plain: string, strict: boolean): number[] | null {
  const memo = new Map<number, number[] | null>();
  const go = (i: number): number[] | null => {
    if (i === plain.length) return [];
    if (memo.has(i)) return memo.get(i)!;
    for (let len = Math.min(6, plain.length - i); len > 0; len--) {
      if (!isSyllable(plain.slice(i, i + len), i === 0, strict)) continue;
      const rest = go(i + len);
      if (rest) {
        const res = [len, ...rest];
        memo.set(i, res);
        return res;
      }
    }
    memo.set(i, null);
    return null;
  };
  return go(0);
}

/**
 * Split a pinyin string into syllables, keeping original characters (marks, digits).
 * "jiānqiáng" -> ["jiān", "qiáng"]; spaces/apostrophes act as hard breaks.
 */
export function segmentPinyin(text: string): string[] {
  const result: string[] = [];
  for (const chunk of text.normalize("NFC").split(/[\s'’-]+/).filter(Boolean)) {
    const chars = [...chunk];
    // plain letters (tone marks folded, digits dropped) and their index in chars
    const map: number[] = [];
    let plain = "";
    chars.forEach((ch, idx) => {
      if (/[0-5]/.test(ch)) return;
      plain += stripTones(ch).replace("v", "ü");
      map.push(idx);
    });
    const lens = /^[a-zü]+$/.test(plain) ? (segmentPlain(plain, true) ?? segmentPlain(plain, false)) : null;
    if (!lens) {
      result.push(chunk);
      continue;
    }
    let p = 0;
    for (const len of lens) {
      const startIdx = map[p];
      // slicing up to the next letter keeps a trailing tone digit with its syllable
      const end = p + len < map.length ? map[p + len] : chars.length;
      result.push(chars.slice(startIdx, end).join(""));
      p += len;
    }
  }
  return result;
}

/** Tone pattern like "1-2" for a pinyin word. */
export function tonePattern(pinyinText: string): string {
  return segmentPinyin(pinyinText)
    .map((s) => toneOf(s))
    .join("-");
}

function hasToneInfo(syllable: string): boolean {
  if (/[0-5]$/.test(syllable)) return true;
  return [...syllable.normalize("NFC")].some((ch) => TONE_MARKS[ch.toLowerCase()]);
}

/** Normalize a typed pinyin answer to comparable numbered and toneless forms. */
function canonical(text: string): { numbered: string; toneless: string; hasTones: boolean } {
  const cleaned = text.trim().toLowerCase().replace(/u:/g, "ü").replace(/v/g, "ü");
  const syllables = segmentPinyin(cleaned);
  return {
    numbered: syllables.map((s) => `${stripTones(s)}${toneOf(s)}`).join(""),
    toneless: syllables.map((s) => stripTones(s)).join(""),
    hasTones: syllables.some(hasToneInfo),
  };
}

/**
 * Typing-mode check for Chinese: accepts marked, numbered or toneless pinyin.
 * Toneless input matches when letters match; toned input must match tones too.
 * Neutral tone: "ma", "ma0", "ma5" are equivalent.
 */
export function pinyinMatches(input: string, expectedMarked: string): boolean {
  const a = canonical(input);
  const b = canonical(expectedMarked);
  if (!a.toneless) return false;
  if (!a.hasTones) return a.toneless === b.toneless;
  return a.numbered === b.numbered;
}

export function containsHan(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}
