"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./result";

const idSchema = z.string().uuid();
const slugSchema = z.string().regex(/^[a-z0-9]{6,32}$/);

/** Resolve a deck the user may study/clone: readable under RLS, or reachable via its share slug. */
async function resolveDeck(userId: string, ref: { deckId?: string; slug?: string }) {
  if (ref.slug) {
    if (!slugSchema.safeParse(ref.slug).success) return null;
    const { data } = await createAdminClient()
      .from("decks")
      .select("id, owner_id, name")
      .eq("share_slug", ref.slug)
      .maybeSingle();
    return data;
  }
  if (!ref.deckId || !idSchema.safeParse(ref.deckId).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("decks").select("id, owner_id, name").eq("id", ref.deckId).maybeSingle();
  return data;
}

export async function subscribeDeck(ref: { deckId?: string; slug?: string }): Promise<ActionResult<{ deckId: string }>> {
  const user = await requireUser();
  const deck = await resolveDeck(user.id, ref);
  if (!deck) return fail("Không tìm thấy bộ từ hoặc link đã bị tắt.");
  if (deck.owner_id === user.id) return ok({ deckId: deck.id });
  // Service role: a link-shared private deck is not readable before subscribing.
  const { error } = await createAdminClient()
    .from("deck_subscriptions")
    .upsert({ user_id: user.id, deck_id: deck.id }, { onConflict: "user_id,deck_id", ignoreDuplicates: true });
  if (error) return fail("Không theo học được bộ này. Thử lại.");
  const supabase = await createClient();
  await supabase.rpc("ensure_user_cards", { p_deck_id: deck.id });
  revalidatePath("/decks");
  revalidatePath(`/decks/${deck.id}`);
  return ok({ deckId: deck.id });
}

export async function unsubscribeDeck(deckId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(deckId).success) return fail("Bộ từ không hợp lệ.");
  const supabase = await createClient();
  const { error } = await supabase.from("deck_subscriptions").delete().eq("deck_id", deckId).eq("user_id", user.id);
  if (error) return fail("Không bỏ theo học được.");
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  return ok();
}

export async function cloneDeck(ref: { deckId?: string; slug?: string }): Promise<ActionResult<{ deckId: string }>> {
  const user = await requireUser();
  const deck = await resolveDeck(user.id, ref);
  if (!deck) return fail("Không tìm thấy bộ từ hoặc link đã bị tắt.");
  const admin = createAdminClient();
  const { count } = await admin.from("decks").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if ((count ?? 0) >= 200) return fail("Bạn đã có quá nhiều bộ từ (tối đa 200).");
  const { data, error } = await admin.rpc("clone_deck", { p_user_id: user.id, p_deck_id: deck.id });
  if (error || !data) return fail("Không sao chép được bộ từ. Thử lại.");
  revalidatePath("/decks");
  return ok({ deckId: data });
}
