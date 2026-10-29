import type { LangCode } from "@/lib/lang/types";

/** Example questions shown on an empty chat. `send` = ask right away; otherwise put the text in the box to finish. */
export type ChatStarter = { label: string; text: string; send: boolean };

const BY_LANG: Record<LangCode, ChatStarter[]> = {
  en: [
    { label: "Phân biệt affect và effect", text: "Phân biệt giúp mình affect và effect", send: true },
    { label: "Sửa câu tiếng Anh", text: "Sửa giúp mình câu này: ", send: false },
  ],
  zh: [
    { label: "Phân biệt 想 và 要", text: "Phân biệt giúp mình 想 và 要", send: true },
    { label: "Sửa câu tiếng Trung", text: "Sửa giúp mình câu tiếng Trung này: ", send: false },
  ],
};

/** Four examples: two practice ones built on the learner's own words, two for their languages. Pure. */
export function chatStarters(langs: LangCode[]): ChatStarter[] {
  const own = langs.length ? langs : (["en"] as LangCode[]);
  const picks = own.length > 1 ? [BY_LANG[own[0]][0], BY_LANG[own[1]][0]] : BY_LANG[own[0]];
  return [
    { label: "Luyện hội thoại với từ mình hay quên", text: "Mình muốn luyện một đoạn hội thoại ngắn dùng các từ mình hay quên.", send: true },
    { label: "Kiểm tra nhanh 5 từ đến hạn", text: "Kiểm tra nhanh mình 5 từ đến hạn ôn nhé, hỏi từng câu một.", send: true },
    ...picks,
  ];
}

export const FOLLOW_UPS = [
  "Cho mình thêm ví dụ",
  "Giải thích đơn giản hơn",
  "Đố mình một câu",
] as const;

const HAN = /[㐀-鿿]/;

/** Language a new thread defaults to: Chinese characters or "tiếng Trung" → zh, "tiếng Anh" → en, else the fallback. Pure. */
export function guessLanguage(text: string, fallback: LangCode): LangCode {
  if (HAN.test(text)) return "zh";
  const t = text.toLowerCase();
  if (/tiếng trung|trung quốc|tiếng hoa|\bpinyin\b|\bhsk\b/.test(t)) return "zh";
  if (/tiếng anh|\bielts\b|\btoeic\b|\bipa\b/.test(t)) return "en";
  return fallback;
}
