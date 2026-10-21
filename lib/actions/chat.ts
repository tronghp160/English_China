"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./result";

const startSchema = z.object({
  language: z.enum(["en", "zh"]),
  deck_id: z.uuid().optional(),
  /** First message, sent by the chat page once it opens ("Hỏi gia sư" buttons). */
  prompt: z.string().trim().min(1).max(CHAT_MAX_CHARS).optional(),
});

/** Creates a tutor thread and opens it. Called from plain forms, so it reads FormData. */
export async function startChat(formData: FormData) {
  const user = await requireUser();
  const parsed = startSchema.safeParse({
    language: formData.get("language"),
    deck_id: formData.get("deck_id") || undefined,
    prompt: formData.get("prompt") || undefined,
  });
  if (!parsed.success) redirect("/chat");
  const { language, deck_id, prompt } = parsed.data;

  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_threads")
    .insert({ user_id: user.id, language, deck_id: deck_id ?? null })
    .select("id")
    .single();
  if (!data) redirect("/chat?error=1");
  revalidatePath("/chat");
  redirect(prompt ? `/chat/${data.id}?q=${encodeURIComponent(prompt)}` : `/chat/${data.id}`);
}

export async function deleteChat(threadId: string): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(threadId).success) return fail("Cuộc trò chuyện không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_threads").delete().eq("id", threadId).select("id");
  if (error || !data?.length) return fail("Không xóa được. Thử lại.");
  revalidatePath("/chat");
  return ok();
}
