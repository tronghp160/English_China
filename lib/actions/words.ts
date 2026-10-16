"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { lang } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { wordInputSchema, type WordData, type WordInput } from "@/lib/word-schema";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

const idSchema = z.string().uuid();

function toRow(v: WordData, language: LangCode) {
  const def = lang(language);
  return {
    term: v.term,
    normalized: def.normalize(v.term),
    reading: v.reading,
    reading_key: def.readingKey(v.reading),
    parts_of_speech: v.parts_of_speech,
    meaning_vi: v.meaning_vi,
    meaning_en: v.meaning_en,
    examples: v.examples as Json,
    synonyms: v.synonyms,
    antonyms: v.antonyms,
    collocations: v.collocations as Json,
    word_family: v.word_family as Json,
    topic: v.topic,
    emoji: v.emoji,
    image_url: v.image_url,
    image_source: (v.image_source ?? null) as Json,
    lang_extra: v.lang_extra as Json,
    personal_note: v.personal_note,
    ai_generated: v.ai_generated,
  };
}

async function studyDeckIds(supabase: ServerSupabase) {
  const { data } = await supabase.rpc("my_decks");
  return new Map((data ?? []).map((d) => [d.id, d.name]));
}

export type DuplicateHit = { wordId: string; deckId: string; deckName: string; term: string };

/** Same normalized term in any deck the user studies (§11.4 live duplicate warning). */
export async function findDuplicates(term: string, language: LangCode): Promise<DuplicateHit[]> {
  await requireUser();
  const t = term.trim();
  if (!t || t.length > 80 || (language !== "en" && language !== "zh")) return [];
  const supabase = await createClient();
  const decks = await studyDeckIds(supabase);
  if (!decks.size) return [];
  const { data } = await supabase
    .from("words")
    .select("id, deck_id, term")
    .eq("language", language)
    .eq("normalized", lang(language).normalize(t))
    .in("deck_id", [...decks.keys()])
    .limit(5);
  return (data ?? []).map((w) => ({
    wordId: w.id,
    deckId: w.deck_id,
    deckName: decks.get(w.deck_id) ?? "",
    term: w.term,
  }));
}

export async function createWord(
  deckId: string,
  input: WordInput,
): Promise<ActionResult<{ id: string; term: string }>> {
  const user = await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  const parsed = wordInputSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại các trường.", zodFieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, language, name").eq("id", deckId).single();
  if (!deck) return fail("Không tìm thấy bộ từ.");

  const { data, error } = await supabase
    .from("words")
    .insert({ ...toRow(parsed.data, deck.language), deck_id: deckId, language: deck.language, created_by: user.id })
    .select("id, term")
    .single();
  if (error?.code === "23505") {
    return fail(`Từ này đã có trong bộ ${deck.name}.`, { term: "Từ này đã có trong bộ này" });
  }
  if (error?.code === "42501") return fail("Bạn không có quyền thêm từ vào bộ này.");
  if (error || !data) return fail("Không lưu được từ. Thử lại.");

  revalidatePath(`/decks/${deckId}`);
  return ok({ id: data.id, term: data.term });
}

export async function updateWord(wordId: string, input: WordInput): Promise<ActionResult<{ id: string; term: string }>> {
  await requireUser();
  if (!idSchema.safeParse(wordId).success) return fail("Từ không hợp lệ.");
  const parsed = wordInputSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại các trường.", zodFieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data: word } = await supabase.from("words").select("id, deck_id, language").eq("id", wordId).single();
  if (!word) return fail("Không tìm thấy từ.");
  const { data, error } = await supabase
    .from("words")
    .update(toRow(parsed.data, word.language))
    .eq("id", wordId)
    .select("id");
  if (error?.code === "23505") return fail("Bộ này đã có từ giống vậy.", { term: "Đã có trong bộ này" });
  if (error || !data?.length) return fail("Không lưu được. Bạn có thể không có quyền sửa từ này.");
  revalidatePath(`/words/${wordId}`);
  revalidatePath(`/decks/${word.deck_id}`);
  return ok({ id: wordId, term: parsed.data.term });
}

export async function deleteWord(wordId: string): Promise<ActionResult<{ deckId: string }>> {
  await requireUser();
  if (!idSchema.safeParse(wordId).success) return fail("Từ không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("words").delete().eq("id", wordId).select("deck_id");
  if (error || !data?.length) return fail("Không xóa được từ.");
  revalidatePath(`/decks/${data[0].deck_id}`);
  return ok({ deckId: data[0].deck_id });
}

/** Insert many words at once (bulk import). Existing terms in the deck are skipped. */
export async function createWordsBulk(
  deckId: string,
  inputs: WordInput[],
): Promise<ActionResult<{ inserted: { id: string; term: string }[]; skipped: string[]; invalid: string[] }>> {
  const user = await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  if (!inputs.length || inputs.length > 30) return fail("Mỗi lần lưu tối đa 30 từ.");
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, language").eq("id", deckId).single();
  if (!deck) return fail("Không tìm thấy bộ từ.");

  const invalid: string[] = [];
  const rows = inputs.flatMap((input) => {
    const parsed = wordInputSchema.safeParse(input);
    if (!parsed.success) {
      invalid.push(input.term);
      return [];
    }
    return [{ ...toRow(parsed.data, deck.language), deck_id: deckId, language: deck.language, created_by: user.id }];
  });
  if (!rows.length) return ok({ inserted: [], skipped: [], invalid });

  const { data, error } = await supabase
    .from("words")
    .upsert(rows, { onConflict: "deck_id,normalized", ignoreDuplicates: true })
    .select("id, term");
  if (error?.code === "42501") return fail("Bạn không có quyền thêm từ vào bộ này.");
  if (error) return fail("Không lưu được các từ. Thử lại.");
  const insertedTerms = new Set((data ?? []).map((d) => d.term));
  revalidatePath(`/decks/${deckId}`);
  return ok({
    inserted: data ?? [],
    skipped: rows.filter((r) => !insertedTerms.has(r.term)).map((r) => r.term),
    invalid,
  });
}

const bulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("move"), wordIds: z.array(z.string().uuid()).min(1).max(500), targetDeckId: z.string().uuid() }),
  z.object({ action: z.literal("topic"), wordIds: z.array(z.string().uuid()).min(1).max(500), topic: z.string().trim().max(60).nullable() }),
  z.object({ action: z.literal("suspend"), wordIds: z.array(z.string().uuid()).min(1).max(500), suspended: z.boolean() }),
  z.object({ action: z.literal("delete"), wordIds: z.array(z.string().uuid()).min(1).max(500) }),
]);
export type BulkInput = z.input<typeof bulkSchema>;

export async function bulkWords(deckId: string, input: BulkInput): Promise<ActionResult<{ count: number }>> {
  await requireUser();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(deckId).success) return fail("Thao tác không hợp lệ.");
  const v = parsed.data;
  const supabase = await createClient();
  let count = 0;

  if (v.action === "suspend") {
    const { data, error } = await supabase.rpc("set_suspended", { p_word_ids: v.wordIds, p_suspended: v.suspended });
    if (error) return fail("Không cập nhật được.");
    count = data ?? 0;
  } else if (v.action === "delete") {
    const { data, error } = await supabase.from("words").delete().in("id", v.wordIds).eq("deck_id", deckId).select("id");
    if (error) return fail("Không xóa được.");
    count = data?.length ?? 0;
  } else if (v.action === "topic") {
    const { data, error } = await supabase
      .from("words")
      .update({ topic: v.topic || null })
      .in("id", v.wordIds)
      .eq("deck_id", deckId)
      .select("id");
    if (error) return fail("Không đổi được chủ đề.");
    count = data?.length ?? 0;
  } else if (v.action === "move") {
    const [{ data: from }, { data: to }] = await Promise.all([
      supabase.from("decks").select("language").eq("id", deckId).single(),
      supabase.from("decks").select("language, name").eq("id", v.targetDeckId).single(),
    ]);
    if (!from || !to) return fail("Không tìm thấy bộ từ.");
    if (from.language !== to.language) return fail("Chỉ chuyển được sang bộ cùng ngôn ngữ.");
    const { data, error } = await supabase
      .from("words")
      .update({ deck_id: v.targetDeckId })
      .in("id", v.wordIds)
      .eq("deck_id", deckId)
      .select("id");
    if (error?.code === "23505") return fail(`Bộ ${to.name} đã có một số từ này.`);
    if (error) return fail("Không chuyển được. Bạn cần quyền sửa ở cả hai bộ.");
    count = data?.length ?? 0;
    revalidatePath(`/decks/${v.targetDeckId}`);
  }
  if (!count && v.action !== "suspend") return fail("Không có từ nào được cập nhật. Bạn có quyền sửa bộ này không?");
  revalidatePath(`/decks/${deckId}`);
  return ok({ count });
}

const searchSchema = z.object({
  deckId: z.string().uuid(),
  q: z.string().max(80).optional(),
  topic: z.string().max(60).optional(),
  pos: z.string().max(20).optional(),
  status: z.enum(["new", "learning", "learned", "hard", "suspended"]).optional(),
  level: z.string().max(4).optional(),
  sort: z.enum(["newest", "az", "hard"]).default("newest"),
  offset: z.number().int().min(0).default(0),
});
export type DeckWordQuery = z.input<typeof searchSchema>;

const PAGE_SIZE = 50;

export async function loadDeckWords(query: DeckWordQuery) {
  await requireUser();
  const p = searchSchema.parse(query);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_deck_words", {
    p_deck_id: p.deckId,
    p_q: p.q || undefined,
    p_topic: p.topic || undefined,
    p_pos: p.pos || undefined,
    p_status: p.status,
    p_level: p.level || undefined,
    p_sort: p.sort,
    p_offset: p.offset,
    p_limit: PAGE_SIZE,
  });
  if (error) throw new Error("Không tải được danh sách từ.");
  const rows = data ?? [];
  return { rows, nextOffset: rows.length === PAGE_SIZE ? p.offset + PAGE_SIZE : null };
}
export type DeckWordRow = Awaited<ReturnType<typeof loadDeckWords>>["rows"][number];
