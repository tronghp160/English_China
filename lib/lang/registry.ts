import { normalizeTerm } from "./normalize";
import { pinyinSearchKey } from "./zh";
import type { LangCode } from "./types";

/** Modes stored in review_logs (Postgres enum review_mode); keep in sync with database.types.ts. */
export const REVIEW_MODES = ["flashcard", "quiz", "typing", "listening", "cloze", "writing", "tones"] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

/** Modes in the practice picker. The study games (learn, test, match) log their answers as review modes. */
export type PracticeMode = ReviewMode | "learn" | "test" | "match";

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
  /** Language-specific rules for the study tutor chat (lib/ai/chat-prompt.ts). */
  tutorHint: string;
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
    practiceModes: ["learn", "test", "match", "flashcard", "quiz", "typing", "listening", "cloze"],
    termFontClass: "font-sans",
    normalize: (t) => normalizeTerm(t, "en"),
    readingKey: () => null,
    tutorHint:
      "Khi giới thiệu một từ tiếng Anh, ghi kèm phiên âm IPA kiểu Mỹ lần đầu nhắc tới, ví dụ resilient /rɪˈzɪliənt/. Ưu tiên tiếng Anh tự nhiên, phổ biến.",
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
    practiceModes: ["learn", "test", "match", "flashcard", "quiz", "typing", "listening", "cloze", "writing", "tones"],
    termFontClass: "font-hanzi",
    normalize: (t) => normalizeTerm(t, "zh"),
    readingKey: (r) => (r ? pinyinSearchKey(r) || null : null),
    tutorHint:
      "Luôn viết chữ Hán giản thể. Mỗi khi viết từ hoặc câu tiếng Trung, ghi pinyin có dấu thanh ngay sau trong ngoặc, ví dụ 坚强 (jiānqiáng). Câu đóng vai ngắn, hợp trình độ người học.",
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
