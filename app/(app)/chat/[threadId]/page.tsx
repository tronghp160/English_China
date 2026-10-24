import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/app-shell/back-link";
import { ChatView } from "@/components/chat/chat-view";
import { DeleteChatButton } from "@/components/chat/delete-chat-button";
import { LangMark } from "@/components/lang-mark";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { requireUser } from "@/lib/auth";
import { aiProvider } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gia sư" };

export default async function ChatThreadPage({ params, searchParams }: PageProps<"/chat/[threadId]">) {
  const [{ threadId }, sp] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.uuid().safeParse(threadId).success) notFound();
  const supabase = await createClient();
  const [{ data: thread }, { data: rows }] = await Promise.all([
    supabase.from("chat_threads").select("id, title, language, deck:decks(name)").eq("id", threadId).maybeSingle(),
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
  const title = thread.title ?? "Cuộc trò chuyện mới";

  return (
    <div className="max-w-2xl">
      <BackLink href="/chat" label="Gia sư" />
      <div className="mb-5 flex items-center gap-3">
        <LangMark lang={thread.language} label className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg">{title}</h1>
          {thread.deck?.name && <p className="truncate text-sm text-ink-soft">Bộ từ: {thread.deck.name}</p>}
        </div>
        <DeleteChatButton threadId={thread.id} title={title} redirectTo="/chat" />
      </div>
      <ChatView
        threadId={thread.id}
        language={thread.language}
        initialMessages={messages}
        initialPrompt={q}
        aiEnabled={aiProvider() !== null}
      />
    </div>
  );
}
