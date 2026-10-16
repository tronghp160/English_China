import type { LangCode } from "@/lib/lang/types";

export const POS_CODES = [
  "noun", "verb", "adj", "adv", "pron", "prep", "conj", "interj", "det",
  "phrasal_verb", "idiom", "phrase", "measure", "particle", "num",
] as const;
export type PosCode = (typeof POS_CODES)[number];

type PosInfo = { label: string; langs: LangCode[]; badge: string; wash: string };

// Badge colors come from the palette (§12): text color + light wash background.
export const POS: Record<PosCode, PosInfo> = {
  noun: { label: "Danh từ", langs: ["en", "zh"], badge: "text-ink-blue", wash: "bg-wash-blue" },
  verb: { label: "Động từ", langs: ["en", "zh"], badge: "text-jade-text", wash: "bg-wash-jade" },
  adj: { label: "Tính từ", langs: ["en", "zh"], badge: "text-tone-2", wash: "bg-wash-yellow" },
  adv: { label: "Trạng từ / Phó từ", langs: ["en", "zh"], badge: "text-danger", wash: "bg-wash-red" },
  pron: { label: "Đại từ", langs: ["en", "zh"], badge: "text-ink-soft", wash: "bg-muted" },
  prep: { label: "Giới từ", langs: ["en", "zh"], badge: "text-ink-soft", wash: "bg-muted" },
  conj: { label: "Liên từ", langs: ["en", "zh"], badge: "text-ink-soft", wash: "bg-muted" },
  interj: { label: "Thán từ", langs: ["en", "zh"], badge: "text-tone-2", wash: "bg-wash-yellow" },
  det: { label: "Hạn định từ", langs: ["en"], badge: "text-ink-soft", wash: "bg-muted" },
  phrasal_verb: { label: "Cụm động từ", langs: ["en"], badge: "text-jade-text", wash: "bg-wash-jade" },
  idiom: { label: "Thành ngữ", langs: ["en", "zh"], badge: "text-danger", wash: "bg-wash-red" },
  phrase: { label: "Cụm từ", langs: ["en", "zh"], badge: "text-ink-blue", wash: "bg-wash-blue" },
  measure: { label: "Lượng từ", langs: ["zh"], badge: "text-jade-text", wash: "bg-wash-jade" },
  particle: { label: "Trợ từ", langs: ["zh"], badge: "text-ink-soft", wash: "bg-muted" },
  num: { label: "Số từ", langs: ["en", "zh"], badge: "text-ink-soft", wash: "bg-muted" },
};

export function posFor(lang: LangCode): PosCode[] {
  return POS_CODES.filter((p) => POS[p].langs.includes(lang));
}

export function isPosCode(v: string): v is PosCode {
  return (POS_CODES as readonly string[]).includes(v);
}
