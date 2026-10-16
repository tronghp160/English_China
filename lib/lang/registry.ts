import { normalizeTerm } from "./normalize";
import { pinyinSearchKey } from "./zh";
import type { LangCode } from "./types";

export type PracticeMode = "quiz" | "typing" | "listening" | "cloze" | "writing" | "tones";

export type LanguageDef = {
  code: LangCode;
  label: string;          // "Tiếng Anh"
  flag: string;
  ttsLang: string;        // BCP-47 for speechSynthesis
  readingLabel: string;   // "Phiên âm" | "Pinyin"
  readingPlaceholder: string;
  termPlaceholder: string;
  levelLabel: string;     // "CEFR" | "HSK"
  levels: string[];
  practiceModes: PracticeMode[];
  /** CSS class for the big term (Hanzi uses the serif CJK face). */
  termFontClass: string;
  normalize: (term: string) => string;
  /** Extra search key stored in words.reading_key (toneless pinyin for zh). */
  readingKey: (reading: string | null | undefined) => string | null;
};

/**
 * Single source of truth for language-specific behavior (§16). Adding a
 * language = one entry here + one value in the lang_code enum.
 * AI schema/prompt per language live in lib/ai (server-only) keyed by the same code.
 */
export const LANGUAGES: Record<LangCode, LanguageDef> = {
  en: {
    code: "en",
    label: "Tiếng Anh",
    flag: "🇬🇧",
    ttsLang: "en-US",
    readingLabel: "Phiên âm",
    readingPlaceholder: "/rɪˈzɪliənt/",
    termPlaceholder: "resilient",
    levelLabel: "CEFR",
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
    practiceModes: ["quiz", "typing", "listening", "cloze"],
    termFontClass: "font-sans",
    normalize: (t) => normalizeTerm(t, "en"),
    readingKey: () => null,
  },
  zh: {
    code: "zh",
    label: "Tiếng Trung",
    flag: "🇨🇳",
    ttsLang: "zh-CN",
    readingLabel: "Pinyin",
    readingPlaceholder: "jiānqiáng",
    termPlaceholder: "坚强",
    levelLabel: "HSK",
    levels: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    practiceModes: ["quiz", "typing", "listening", "cloze", "writing", "tones"],
    termFontClass: "font-hanzi",
    normalize: (t) => normalizeTerm(t, "zh"),
    readingKey: (r) => (r ? pinyinSearchKey(r) || null : null),
  },
};

export function lang(code: LangCode): LanguageDef {
  return LANGUAGES[code];
}

export function levelOf(code: LangCode, extra: unknown): string | null {
  const e = (extra ?? {}) as { cefr?: string | null; hsk?: { level?: number } | null };
  if (code === "en") return e.cefr ?? null;
  return e.hsk?.level ? `HSK ${e.hsk.level}` : null;
}
