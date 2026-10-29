import type { Metadata } from "next";
import { z } from "zod";
import { TutorWorkspacePage } from "@/components/chat/tutor-workspace-page";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gia sư" };

/** The tutor: opens straight on the chat window. `?c=<id>` opens a conversation, `?q=` asks a first question. */
export default async function ChatHomePage({ searchParams }: PageProps<"/chat">) {
  const [me, sp] = await Promise.all([requireMe(), searchParams]);
  const c = typeof sp.c === "string" && z.uuid().safeParse(sp.c).success ? sp.c : null;
  const q = typeof sp.q === "string" ? sp.q.slice(0, CHAT_MAX_CHARS) : undefined;

  let thread = null;
  if (c) {
    const supabase = await createClient();
    const [{ data: row }, { data: rows }] = await Promise.all([
      supabase.from("chat_threads").select("id, title, language").eq("id", c).maybeSingle(),
      supabase
        .from("chat_messages")
        .select("id, role, parts")
        .eq("thread_id", c)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (row) {
      const messages = (rows ?? []).reverse().map((r) => ({ id: r.id, role: r.role, parts: r.parts }) as unknown as ChatMessage);
      thread = { ...row, messages };
    }
  }

  return (
    <>
      {sp.error && <p className="mb-4 text-sm text-danger-fg">Không mở được cuộc trò chuyện mới. Thử lại.</p>}
      {c && !thread && <p className="mb-4 text-sm text-fg-muted">Không tìm thấy cuộc trò chuyện này (có thể đã bị xóa).</p>}
      <TutorWorkspacePage me={me} thread={thread} initialPrompt={thread && !thread.messages.length ? q : undefined} />
    </>
  );
}
