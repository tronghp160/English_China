import type { WordInput } from "@/lib/word-schema";

/** Drop empty rows/objects so optional sections don't fail validation. */
export function cleanWordInput(v: WordInput): WordInput {
  const extra = { ...(v.lang_extra ?? {}) } as Record<string, unknown>;
  const vf = extra.verb_forms as Record<string, string> | null | undefined;
  if (vf && !Object.values(vf).some((x) => x?.trim())) extra.verb_forms = null;
  else if (vf) {
    extra.verb_forms = Object.fromEntries(Object.entries(vf).map(([k, x]) => [k, x?.trim() || "—"]));
  }
  const hsk = extra.hsk as { level?: number | string; version?: string } | null | undefined;
  if (!hsk || !hsk.level) extra.hsk = null;
  else extra.hsk = { level: Number(hsk.level), version: hsk.version === "2.0" ? "2.0" : "3.0" };
  if (!extra.cefr) extra.cefr = null;
  return {
    ...v,
    examples: (v.examples ?? []).filter((e) => e.text?.trim()),
    collocations: (v.collocations ?? []).filter((c) => c.text?.trim()),
    word_family: (v.word_family ?? []).filter((w) => w.text?.trim()).map((w) => ({ ...w, pos: w.pos || null })),
    lang_extra: extra as WordInput["lang_extra"],
  };
}
