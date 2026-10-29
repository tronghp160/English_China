import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { ChatStart } from "@/components/chat/chat-start";
import { DeleteChatButton } from "@/components/chat/delete-chat-button";
import { MascotSay } from "@/components/mascot/mascot-say";
import { chatStarters } from "@/lib/ai/tutor/starters";
import { requireMe } from "@/lib/auth";
import { getMyDecks } from "@/lib/data/decks";
import { aiProvider } from "@/lib/env";
import { formatAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Gia sư" };

export default async function ChatHomePage({ searchParams }: PageProps<"/chat">) {
  const [me, decks, sp] = await Promise.all([requireMe(), getMyDecks(), searchParams]);
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  const langs = [...new Set([...me.settings.study_langs, ...decks.map((d) => d.language)])];
  const aiEnabled = aiProvider() !== null;
  const prefs = readPrefs(me.settings.prefs);
  const tutorName = prefs.mascot ? prefs.mascot_name : "Gia sư";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl">Gia sư AI</h1>
      <p className="mt-1 mb-5 max-w-[62ch] text-fg-muted">
        Hỏi gì cũng được: nghĩa một từ, phân biệt từ hay nhầm, sửa câu, luyện hội thoại hay kiểm tra nhanh bằng chính những từ trong sổ
        của bạn.
      </p>

      {prefs.mascot && (
        <MascotSay
          mood="wave"
          name={tutorName}
          size={64}
          className="mb-4"
          text={`Chào ${me.profile.display_name}! Hôm nay bạn muốn hỏi ${tutorName} điều gì?`}
        />
      )}

      {sp.error && <p className="mb-4 text-sm text-danger-fg">Không mở được cuộc trò chuyện mới. Thử lại.</p>}
      {aiEnabled ? (
        <ChatStart starters={chatStarters(langs)} />
      ) : (
        <p className="rounded-lg border border-border p-4 text-sm text-fg-muted">
          Gia sư cần khóa AI trên máy chủ (ANTHROPIC_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY).
        </p>
      )}

      {threads && threads.length > 0 && (
        <section className="mt-10" aria-labelledby="chat-history">
          <h2 id="chat-history" className="mb-3 text-lg">
            Trò chuyện gần đây
          </h2>
          <ul className="space-y-2">
            {threads.map((t) => {
              const title = t.title ?? "Cuộc trò chuyện mới";
              return (
                <li key={t.id} className="flex items-center gap-1 rounded-lg bg-surface pr-1 shadow-xs transition-colors hover:bg-surface-2 dark:border dark:border-border">
                  <Link href={`/chat/${t.id}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-fg" aria-hidden>
                      <MessageCircle className="size-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">
                      {title}
                    </span>
                    <span className="shrink-0 text-sm text-fg-muted">{formatAgo(t.updated_at)}</span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                  </Link>
                  <DeleteChatButton threadId={t.id} title={title} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
