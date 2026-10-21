"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { SAMPLE_DECKS, sampleWordRows } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { fail, ok, type ActionResult } from "./result";

/** Copies the sample decks of the user's study languages into their account (skips ones they already have). */
export async function addSampleDecks(): Promise<ActionResult<{ decks: number; words: number }>> {
  const me = await requireMe();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("decks").select("name").eq("owner_id", me.user.id);
  const taken = new Set((existing ?? []).map((d) => d.name));
  const todo = SAMPLE_DECKS.filter(
    (d) => me.settings.study_langs.includes(d.language) && !taken.has(d.name),
  );
  if (todo.length === 0) return fail("Bạn đã có đủ bộ từ mẫu rồi.");

  let words = 0;
  for (const sample of todo) {
    const { data: deck, error } = await supabase
      .from("decks")
      .insert({
        owner_id: me.user.id,
        name: sample.name,
        description: sample.description,
        language: sample.language,
      })
      .select("id")
      .single();
    if (error || !deck) return fail("Không tạo được bộ từ mẫu. Thử lại.");
    const rows = sampleWordRows(sample).map((r) => ({
      ...r,
      examples: r.examples as Json,
      lang_extra: r.lang_extra as Json,
      deck_id: deck.id,
      created_by: me.user.id,
    }));
    const { error: wordsError } = await supabase.from("words").insert(rows);
    if (wordsError) return fail("Không thêm được từ mẫu. Thử lại.");
    words += rows.length;
  }
  revalidatePath("/decks");
  revalidatePath("/today");
  return ok({ decks: todo.length, words });
}
