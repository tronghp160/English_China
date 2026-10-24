import type { LangCode } from "@/lib/lang/types";

export const POS_CODES = [
  "noun", "verb", "adj", "adv", "pron", "prep", "conj", "interj", "det",
  "phrasal_verb", "idiom", "phrase", "measure", "particle", "num",
] as const;
export type PosCode = (typeof POS_CODES)[number];

type PosInfo = { label: string; langs: LangCode[]; badge: string; wash: string };

// Chosen state of a part-of-speech chip in forms. Tags that only label a word are drawn neutral (PosBadge).
export const POS: Record<PosCode, PosInfo> = {
  noun: { label: "Danh từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  verb: { label: "Động từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  adj: { label: "Tính từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  adv: { label: "Trạng từ / Phó từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  pron: { label: "Đại từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  prep: { label: "Giới từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  conj: { label: "Liên từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  interj: { label: "Thán từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  det: { label: "Hạn định từ", langs: ["en"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  phrasal_verb: { label: "Cụm động từ", langs: ["en"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  idiom: { label: "Thành ngữ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  phrase: { label: "Cụm từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  measure: { label: "Lượng từ", langs: ["zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  particle: { label: "Trợ từ", langs: ["zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
  num: { label: "Số từ", langs: ["en", "zh"], badge: "text-ink-violet", wash: "bg-tint-violet" },
};

export function posFor(lang: LangCode): PosCode[] {
  return POS_CODES.filter((p) => POS[p].langs.includes(lang));
}

export function isPosCode(v: string): v is PosCode {
  return (POS_CODES as readonly string[]).includes(v);
}
