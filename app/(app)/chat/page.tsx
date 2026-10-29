import type { Metadata } from "next";
import { after } from "next/server";
import { ChatStart } from "@/components/chat/chat-start";
import { TutorHistoryList } from "@/components/chat/tutor-history-list";
import { TutorTipsCard } from "@/components/chat/tutor-tips-card";
import { TutorTodayCard } from "@/components/chat/tutor-today-card";
import { groupThreadsByDay } from "@/lib/ai/tutor/history";
import { learnerSnapshot } from "@/lib/ai/tutor/learner";
import { chatStarters } from "@/lib/ai/tutor/starters";
import { requireMe } from "@/lib/auth";
import { getStudySummary } from "@/lib/data/study";
import { aiProvider } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Gia sư" };

async function cleanupEmptyThreads(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    await supabase
      .from("chat_threads")
      .delete()
      .is("title", null)
      .lt("updated_at", oneDayAgo);
  } catch {
    // background cleanup ignore
  }
}

export default async function ChatHomePage({ searchParams }: PageProps<"/chat">) {
  const [me, summary, sp] = await Promise.all([
    requireMe(),
    getStudySummary(),
    searchParams,
  ]);
  const supabase = await createClient();

  const [{ data: threads }, snapshot] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .not("title", "is", null)
      .order("updated_at", { ascending: false })
      .limit(40),
    learnerSnapshot(supabase, me.settings.study_langs),
  ]);

  const aiEnabled = aiProvider() !== null;
  const prefs = readPrefs(me.settings.prefs);
  const tutorName = prefs.mascot ? prefs.mascot_name : "Gia sư";

  // Pick the hardest word if any
  const hardest = snapshot.flatMap((s) => s.hard).sort((a, b) => b.lapses - a.lapses)[0];
  const starters = chatStarters(me.settings.study_langs, { hardWord: hardest });

  const groups = groupThreadsByDay(threads ?? [], new Date(), me.settings.timezone);

  after(() => {
    void cleanupEmptyThreads(supabase);
  });

  return (
    <div className="max-w-5xl pb-12">
      {sp.error && (
        <p className="mb-4 text-sm text-danger-fg">
          Không mở được cuộc trò chuyện mới. Thử lại.
        </p>
      )}

      {/* Grid: 2 columns on desktop, 1 on mobile */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main Column */}
        <div className="space-y-8 min-w-0">
          {aiEnabled ? (
            <ChatStart starters={starters} tutorName={tutorName} mascot={prefs.mascot} />
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-fg-muted shadow-sm">
              <h2 className="text-base font-bold text-fg mb-1">Gia sư chưa được bật</h2>
              <p>
                Gia sư cần khóa AI trên máy chủ (ANTHROPIC_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY).
              </p>
            </div>
          )}

          {/* On mobile: Today Card & Tips Card appear between Starters and History */}
          <div className="space-y-6 lg:hidden">
            <TutorTodayCard snapshot={snapshot} summary={summary} tutorName={tutorName} />
            <TutorTipsCard />
          </div>

          {/* History */}
          <section aria-labelledby="chat-history" className="space-y-3">
            <h2 id="chat-history" className="text-lg font-bold text-fg">
              Trò chuyện gần đây
            </h2>
            <TutorHistoryList groups={groups} tutorName={tutorName} />
          </section>
        </div>

        {/* Sidebar Column (Desktop) */}
        <aside className="hidden space-y-6 lg:block">
          <TutorTodayCard snapshot={snapshot} summary={summary} tutorName={tutorName} />
          <TutorTipsCard />
        </aside>
      </div>
    </div>
  );
}
