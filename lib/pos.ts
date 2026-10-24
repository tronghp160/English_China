import type { LangCode } from "@/lib/lang/types";

export const POS_CODES = [
  "noun", "verb", "adj", "adv", "pron", "prep", "conj", "interj", "det",
  "phrasal_verb", "idiom", "phrase", "measure", "particle", "num",
] as const;
export type PosCode = (typeof POS_CODES)[number];

type PosInfo = { label: string; langs: LangCode[]; badge: string; wash: string };

// Chosen state of a part-of-speech chip in forms. Tags that only label a word are drawn neutral (PosBadge).
export const POS: Record<PosCode, PosInfo> = {
  noun: { label: "Danh từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  verb: { label: "Động từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  adj: { label: "Tính từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  adv: { label: "Trạng từ / Phó từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  pron: { label: "Đại từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  prep: { label: "Giới từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  conj: { label: "Liên từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  interj: { label: "Thán từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  det: { label: "Hạn định từ", langs: ["en"], badge: "text-primary", wash: "bg-primary-soft" },
  phrasal_verb: { label: "Cụm động từ", langs: ["en"], badge: "text-primary", wash: "bg-primary-soft" },
  idiom: { label: "Thành ngữ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  phrase: { label: "Cụm từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
  measure: { label: "Lượng từ", langs: ["zh"], badge: "text-primary", wash: "bg-primary-soft" },
  particle: { label: "Trợ từ", langs: ["zh"], badge: "text-primary", wash: "bg-primary-soft" },
  num: { label: "Số từ", langs: ["en", "zh"], badge: "text-primary", wash: "bg-primary-soft" },
};

export function posFor(lang: LangCode): PosCode[] {
  return POS_CODES.filter((p) => POS[p].langs.includes(lang));
}

export function isPosCode(v: string): v is PosCode {
  return (POS_CODES as readonly string[]).includes(v);
}
