import type { Metadata } from "next";
import { BotMessageSquare, MessageCirclePlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/app-shell/back-link";
import { ChatView } from "@/components/chat/chat-view";
import { DeleteChatButton } from "@/components/chat/delete-chat-button";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { chatStarters } from "@/lib/ai/tutor/starters";
import { requireMe } from "@/lib/auth";
import { aiProvider } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Gia sư" };

export default async function ChatThreadPage({ params, searchParams }: PageProps<"/chat/[threadId]">) {
  const [{ threadId }, sp, me] = await Promise.all([params, searchParams, requireMe()]);
  if (!z.uuid().safeParse(threadId).success) notFound();
  const supabase = await createClient();
  const [{ data: thread }, { data: rows }] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, title, language, deck:decks(name)")
      .eq("id", threadId)
      .maybeSingle(),
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
  const prefs = readPrefs(me.settings.prefs);

  return (
    <div className="max-w-2xl pb-12">
      {/* Row 1: BackLink + New Chat Link */}
      <div className="flex items-center justify-between gap-2">
        <BackLink href="/chat" label="Gia sư" />
        <Button asChild variant="ghost" size="sm">
          <Link href="/chat#hoi">
            <MessageCirclePlus aria-hidden />
            Cuộc trò chuyện mới
          </Link>
        </Button>
      </div>

      {/* Row 2: Thread Header Card */}
      <div className="my-4 flex items-center gap-3 rounded-lg border border-border/60 bg-surface p-3 shadow-xs dark:border-border">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary-fg">
          {prefs.mascot ? (
            <Pup mood="happy" size={36} className="translate-y-[3px]" />
          ) : (
            <BotMessageSquare className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-fg">{title}</h1>
          <p className="truncate text-xs text-fg-muted">
            Gia sư AI · {messages.length} tin nhắn{thread.deck?.name ? ` · Bộ từ: ${thread.deck.name}` : ""}
          </p>
        </div>
        <DeleteChatButton threadId={thread.id} title={title} redirectTo="/chat" />
      </div>

      <ChatView
        threadId={thread.id}
        language={thread.language}
        initialMessages={messages}
        initialPrompt={q}
        aiEnabled={aiProvider() !== null}
        starters={chatStarters(me.settings.study_langs)}
      />
    </div>
  );
}
