import { POS, type PosCode } from "@/lib/pos";
import type { WordInput } from "@/lib/word-schema";

export type DetailSource = "ai" | "dict" | null;
export type DetailTab = "examples" | "image" | "info" | "note";

/**
 * Returns a concise one-line summary of word details (e.g. "Đã điền bằng AI · 3 ví dụ · Tính từ · Cảm xúc · có ảnh").
 * Returns an empty string if there are no details.
 */
export function detailSummary(v: WordInput, source: DetailSource = null): string {
  const parts: string[] = [];

  if (source === "ai") {
    parts.push("Đã điền bằng AI");
  } else if (source === "dict") {
    parts.push("Đã điền từ từ điển");
  }

  const examplesCount = countExamples(v);
  if (examplesCount > 0) {
    parts.push(`${examplesCount} ví dụ`);
  }

  const firstPos = (v.parts_of_speech ?? [])[0] as PosCode | undefined;
  if (firstPos && POS[firstPos]?.label) {
    parts.push(POS[firstPos].label);
  }

  if (v.topic?.trim()) {
    parts.push(v.topic.trim());
  }

  if (hasImage(v)) {
    parts.push("có ảnh");
  }

  if (hasNote(v)) {
    parts.push("có ghi chú");
  }

  return parts.join(" · ");
}

export function countExamples(v: WordInput): number {
  return (v.examples ?? []).filter((e) => e.text?.trim()).length;
}

export function hasImage(v: WordInput): boolean {
  return Boolean(v.image_url?.trim());
}

export function hasNote(v: WordInput): boolean {
  return Boolean(v.personal_note?.trim());
}

export function hasInfo(v: WordInput): boolean {
  if ((v.parts_of_speech ?? []).length > 0) return true;
  if (v.topic?.trim() || v.emoji?.trim()) return true;
  if ((v.collocations ?? []).some((c) => c.text?.trim())) return true;
  if ((v.synonyms ?? []).some((s) => s?.trim())) return true;
  if ((v.antonyms ?? []).some((a) => a?.trim())) return true;
  if ((v.word_family ?? []).some((w) => w.text?.trim())) return true;
  if (v.meaning_en?.trim()) return true;
  const extra = v.lang_extra as Record<string, unknown> | undefined;
  if (extra) {
    if (extra.traditional || extra.pinyin_toneless || extra.hsk || extra.measure_words) return true;
    if (extra.cefr || extra.phonetic_us || extra.phonetic_uk || extra.plural || extra.verb_forms) return true;
  }
  return false;
}

export function tabLabel(tab: DetailTab, v: WordInput): string {
  switch (tab) {
    case "examples": {
      const n = countExamples(v);
      return n > 0 ? `Ví dụ ${n}` : "Ví dụ";
    }
    case "image":
      return hasImage(v) ? "Ảnh ✓" : "Ảnh";
    case "info":
      return hasInfo(v) ? "Thông tin ✓" : "Thông tin";
    case "note":
      return hasNote(v) ? "Ghi chú ✓" : "Ghi chú";
  }
}
