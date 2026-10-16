"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deckInputSchema, type DeckInput } from "@/lib/word-schema";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

const idSchema = z.string().uuid();

export async function createDeck(input: DeckInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = deckInputSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert({
      owner_id: user.id,
      name: v.name,
      description: v.description,
      language: v.language,
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id : null,
      allow_member_edit: v.visibility === "group" ? v.allow_member_edit : false,
      enable_recall: v.enable_recall,
    })
    .select("id")
    .single();
  if (error || !data) return fail("Không tạo được bộ từ. Thử lại.");
  revalidatePath("/decks");
  return ok({ id: data.id });
}

export async function updateDeck(
  deckId: string,
  input: Omit<DeckInput, "language"> & { language?: DeckInput["language"] },
): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  const parsed = deckInputSchema.safeParse({ language: "en", ...input });
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .update({
      name: v.name,
      description: v.description,
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id : null,
      allow_member_edit: v.visibility === "group" ? v.allow_member_edit : false,
      enable_recall: v.enable_recall,
    })
    .eq("id", deckId)
    .select("id");
  if (error || !data?.length) return fail("Không lưu được. Chỉ người tạo bộ từ mới sửa được.");
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  return ok();
}

export async function deleteDeck(deckId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("decks").delete().eq("id", deckId).select("id");
  if (error || !data?.length) return fail("Không xóa được bộ từ.");
  revalidatePath("/decks");
  return ok();
}

function randomSlug() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Turn the share link on (new slug) or off. */
export async function setShareLink(
  deckId: string,
  enabled: boolean,
): Promise<ActionResult<{ slug: string | null }>> {
  await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  const supabase = await createClient();
  const slug = enabled ? randomSlug() : null;
  const { data, error } = await supabase
    .from("decks")
    .update({ share_slug: slug })
    .eq("id", deckId)
    .select("id");
  if (error || !data?.length) return fail("Không đổi được link chia sẻ.");
  revalidatePath(`/decks/${deckId}`);
  return ok({ slug });
}
