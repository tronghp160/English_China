import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DeleteChatButton } from "@/components/chat/delete-chat-button";
import { NewChatForm } from "@/components/chat/new-chat-form";
import { LangFlag } from "@/components/lang-flag";
import { requireMe } from "@/lib/auth";
import { getMyDecks } from "@/lib/data/decks";
import { aiProvider } from "@/lib/env";
import { formatAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gia sư" };

export default async function ChatListPage({ searchParams }: PageProps<"/chat">) {
  const [me, decks, sp] = await Promise.all([requireMe(), getMyDecks(), searchParams]);
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id, title, language, updated_at, deck:decks(name)")
    .order("updated_at", { ascending: false })
    .limit(50);
  const langs = [...new Set([...me.settings.study_langs, ...decks.map((d) => d.language)])];
  const aiEnabled = aiProvider() !== null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl text-ink">Gia sư</h1>
      <p className="mt-1 mb-6 text-ink-soft">
        Trò chuyện để hiểu từ sâu hơn, sửa câu, luyện hội thoại bằng chính những từ trong sổ của bạn.
      </p>

      {sp.error && <p className="mb-4 text-sm text-danger">Không mở được cuộc trò chuyện mới. Thử lại.</p>}
      {aiEnabled ? (
        <NewChatForm
          langs={langs}
          decks={decks.map((d) => ({ id: d.id, name: d.name, language: d.language }))}
        />
      ) : (
        <p className="notebook-card p-4 text-sm text-ink-soft">
          Gia sư cần khóa AI trên máy chủ (ANTHROPIC_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY).
        </p>
      )}

      {threads && threads.length > 0 && (
        <section className="mt-8" aria-labelledby="chat-history">
          <h2 id="chat-history" className="mb-3 text-lg text-ink">
            Trò chuyện gần đây
          </h2>
          <ul className="space-y-2">
            {threads.map((t) => {
              const title = t.title ?? "Cuộc trò chuyện mới";
              return (
                <li key={t.id} className="flex items-center gap-1 rounded-card border border-rule bg-surface pr-1 shadow-card">
                  <Link href={`/chat/${t.id}`} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3">
                    <LangFlag lang={t.language} label className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{title}</span>
                      <span className="block truncate text-sm text-ink-soft">
                        {t.deck?.name ? `${t.deck.name} · ` : ""}
                        {formatAgo(t.updated_at)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
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
