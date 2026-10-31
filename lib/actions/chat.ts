"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CHAT_MAX_CHARS, threadTitle } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { guessLanguage } from "@/lib/ai/tutor/starters";
import { insertThread } from "@/lib/ai/tutor/threads";
import { requireMe, requireUser } from "@/lib/auth";
import type { LangCode } from "@/lib/lang/types";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./result";
import { chatUrl } from "@/lib/ai/tutor/chat-url";

const startSchema = z.object({
  /** Optional: guessed from the first message, else the learner's first study language. */
  language: z.enum(["en", "zh"]).optional(),
  deck_id: z.string().uuid().optional(),
  /** First message, sent by the chat page once it opens. */
  prompt: z.string().trim().min(1).max(CHAT_MAX_CHARS).optional(),
});

async function createThread(userId: string, opts: { language: LangCode; deckId?: string; title?: string | null }) {
  return insertThread(await createClient(), { userId, ...opts });
}

/** Creates a tutor thread and opens it. Called from plain forms, so it reads FormData. */
export async function startChat(formData: FormData) {
  const me = await requireMe();
  const parsed = startSchema.safeParse({
    language: formData.get("language") || undefined,
    deck_id: formData.get("deck_id") || undefined,
    prompt: formData.get("prompt") || undefined,
  });
  if (!parsed.success) redirect("/chat");
  const { deck_id, prompt } = parsed.data;

  // If there's no prompt, focus the question box on the chat page instead of creating an empty thread
  if (!prompt) {
    redirect("/chat#hoi");
  }

  const fallback = me.settings.study_langs[0] ?? "en";
  const language = (parsed.data.language ?? guessLanguage(prompt, fallback)) as LangCode;
  const title = threadTitle(prompt);

  const { data } = await createThread(me.user.id, { language, deckId: deck_id, title });
  if (!data) redirect("/chat?error=1");
  revalidatePath("/chat");
  redirect(chatUrl(data.id, prompt));
}

/** The panel's conversation: thread + last 60 messages, or null when it was deleted. */
export async function loadTutorThread(
  threadId: string,
): Promise<{ id: string; title: string | null; language: LangCode; messages: ChatMessage[] } | null> {
  const user = await requireUser();
  if (!user || !z.string().uuid().safeParse(threadId).success) return null;

  const supabase = await createClient();
  const [{ data: thread }, { data: rows }] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, title, language")
      .eq("id", threadId)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  if (!thread) return null;

  const messages = (rows ?? [])
    .reverse()
    .map((r) => ({ id: r.id, role: r.role, parts: r.parts }) as unknown as ChatMessage);

  return {
    id: thread.id,
    title: thread.title,
    language: thread.language as LangCode,
    messages,
  };
}

/**
 * Creates a thread for a first question (no redirect). Language: guessLanguage(prompt, study_langs[0]).
 * Not used by the panel or /chat any more: they pick the thread id themselves and /api/chat creates
 * the thread with the first message (one round trip less). Kept for other callers.
 */
export async function createTutorThread(prompt: string): Promise<ActionResult<{ id: string }>> {
  const me = await requireMe();
  const parsed = z.string().trim().min(1).max(CHAT_MAX_CHARS).safeParse(prompt);
  if (!parsed.success) return fail("Câu hỏi không hợp lệ.");

  const fallback = me.settings.study_langs[0] ?? "en";
  const language = guessLanguage(parsed.data, fallback) as LangCode;
  const title = threadTitle(parsed.data);

  const { data, error } = await createThread(me.user.id, { language, title });
  if (error || !data) return fail("Không tạo được cuộc trò chuyện.");

  // No revalidatePath: the tutor page adds the thread to its own list, and a refresh here could
  // re-render the page while the first question is being sent.
  return ok({ id: data.id });
}

export async function deleteChat(threadId: string): Promise<ActionResult> {
  await requireUser();
  if (!z.string().uuid().safeParse(threadId).success) return fail("Cuộc trò chuyện không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_threads").delete().eq("id", threadId).select("id");
  if (error || !data?.length) return fail("Không xóa được. Thử lại.");
  revalidatePath("/chat");
  return ok();
}
