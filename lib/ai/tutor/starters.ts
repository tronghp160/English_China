import type { LangCode } from "@/lib/lang/types";
import type { Tone } from "@/lib/tone";

export type StarterIcon = "practice" | "quiz" | "compare" | "fix" | "explain" | "translate";

/** Example questions shown on an empty chat. `send` = ask right away; otherwise put the text in the box to finish. */
export type ChatStarter = {
  label: string;
  text: string;
  send: boolean;
  icon: StarterIcon;
  tone: Tone;
};

export const FOLLOW_UPS = [
  "Cho mình thêm ví dụ",
  "Giải thích đơn giản hơn",
  "Đố mình một câu",
] as const;

const BY_LANG: Record<
  LangCode,
  { compare: Omit<ChatStarter, "icon" | "tone">; fix: Omit<ChatStarter, "icon" | "tone"> }
> = {
  en: {
    compare: {
      label: "Phân biệt affect và effect",
      text: "Phân biệt giúp mình affect và effect",
      send: true,
    },
    fix: {
      label: "Sửa câu tiếng Anh",
      text: "Sửa giúp mình câu này: ",
      send: false,
    },
  },
  zh: {
    compare: {
      label: "Phân biệt 想 và 要",
      text: "Phân biệt giúp mình 想 và 要",
      send: true,
    },
    fix: {
      label: "Sửa câu tiếng Trung",
      text: "Sửa giúp mình câu tiếng Trung này: ",
      send: false,
    },
  },
};

/** Starters for the tutor home and floating panel. Pure. */
export function chatStarters(
  langs: LangCode[],
  opts?: { hardWord?: { term: string } },
): ChatStarter[] {
  const primaryLang = langs[0] ?? "en";
  const langPicks = BY_LANG[primaryLang] ?? BY_LANG.en;

  const list: ChatStarter[] = [
    {
      label: "Luyện hội thoại với từ mình hay quên",
      text: "Mình muốn luyện một đoạn hội thoại ngắn dùng các từ mình hay quên.",
      send: true,
      icon: "practice",
      tone: "coral",
    },
    {
      label: "Kiểm tra nhanh 5 từ đến hạn",
      text: "Kiểm tra nhanh mình 5 từ đến hạn ôn nhé, hỏi từng câu một.",
      send: true,
      icon: "quiz",
      tone: "sun",
    },
    {
      ...langPicks.compare,
      icon: "compare",
      tone: "grape",
    },
    {
      ...langPicks.fix,
      icon: "fix",
      tone: "mint",
    },
  ];

  if (opts?.hardWord?.term) {
    const term = opts.hardWord.term;
    list.push({
      label: `Giải thích lại «${term}»`,
      text: `Giải thích lại từ ${term} giúp mình, kèm ví dụ và mẹo nhớ.`,
      send: true,
      icon: "explain",
      tone: "teal",
    });
  }

  list.push({
    label: "Dịch giúp mình câu…",
    text: "Dịch giúp mình câu này: ",
    send: false,
    icon: "translate",
    tone: "blue",
  });

  return list;
}

const HAN = /[㐀-鿿]/;

/** Language a new thread defaults to: Chinese characters or "tiếng Trung" → zh, "tiếng Anh" → en, else the fallback. Pure. */
export function guessLanguage(text: string, fallback: LangCode): LangCode {
  if (HAN.test(text)) return "zh";
  const t = text.toLowerCase();
  if (/tiếng trung|trung quốc|tiếng hoa|\bpinyin\b|\bhsk\b/.test(t)) return "zh";
  if (/tiếng anh|\bielts\b|\btoeic\b|\bipa\b/.test(t)) return "en";
  return fallback;
}
