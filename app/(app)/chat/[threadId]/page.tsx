import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TutorWorkspacePage } from "@/components/chat/tutor-workspace-page";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gia sư" };

/** The same chat window as /chat, opened on one conversation. */
export default async function ChatThreadPage({ params, searchParams }: PageProps<"/chat/[threadId]">) {
  const [{ threadId }, sp, me] = await Promise.all([params, searchParams, requireMe()]);
  if (!z.uuid().safeParse(threadId).success) notFound();
  const supabase = await createClient();
  const [{ data: thread }, { data: rows }] = await Promise.all([
    supabase.from("chat_threads").select("id, title, language").eq("id", threadId).maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (!thread) notFound();
  const messages = (rows ?? []).reverse().map((r) => ({ id: r.id, role: r.role, parts: r.parts }) as unknown as ChatMessage);
  const q = typeof sp.q === "string" ? sp.q.slice(0, CHAT_MAX_CHARS) : undefined;

  return <TutorWorkspacePage me={me} thread={{ ...thread, messages }} initialPrompt={messages.length ? undefined : q} />;
}
