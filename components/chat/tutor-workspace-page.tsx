import { after } from "next/server";
import { TutorCloneCard } from "@/components/chat/tutor-clone-card";
import { TutorTipsCard } from "@/components/chat/tutor-tips-card";
import { TutorTodayCard } from "@/components/chat/tutor-today-card";
import { TutorWorkspace } from "@/components/chat/tutor-workspace";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { learnerSnapshot } from "@/lib/ai/tutor/learner";
import { chatStarters } from "@/lib/ai/tutor/starters";
import type { Me } from "@/lib/auth";
import { cloneAvailable } from "@/lib/clone/access";
import { getStudySummary } from "@/lib/data/study";
import { aiProvider, cloneConfig } from "@/lib/env";
import type { LangCode } from "@/lib/lang/types";
import { createClient } from "@/lib/supabase/server";
import { readPrefs } from "@/lib/validation";

/** Threads started without a question and never used (older than a day) are removed in the background. */
async function cleanupEmptyThreads(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    await supabase.from("chat_threads").delete().is("title", null).lt("updated_at", oneDayAgo);
  } catch {
    // background cleanup: ignore
  }
}

/** The tutor page (/chat, optionally with a conversation open). */
export async function TutorWorkspacePage({
  me,
  thread,
  initialPrompt,
  draft,
}: {
  me: Me;
  thread: { id: string; title: string | null; language: LangCode; messages: ChatMessage[] } | null;
  initialPrompt?: string;
  /** A question to put in the message box of an empty chat (not sent). */
  draft?: string;
}) {
  const supabase = await createClient();
  const [summary, { data: threads }, snapshot, cloneOn] = await Promise.all([
    getStudySummary(),
    supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .not("title", "is", null)
      .order("updated_at", { ascending: false })
      .limit(40),
    learnerSnapshot(supabase, me.settings.study_langs),
    cloneAvailable(), // beside the other reads: the door to "Tâm sự" is shown only to accounts allowed to use it
  ]);
  after(() => void cleanupEmptyThreads(supabase));

  const prefs = readPrefs(me.settings.prefs);
  const tutorName = prefs.mascot ? prefs.mascot_name : "Gia sư";
  const clone = cloneOn ? cloneConfig() : null; // only its name leaves the server
  const hardest = snapshot.flatMap((s) => s.hard).sort((a, b) => b.lapses - a.lapses)[0];

  return (
    <div className="max-w-6xl">
      <TutorWorkspace
        thread={thread ? { id: thread.id, title: thread.title, messages: thread.messages } : null}
        initialPrompt={initialPrompt}
        draft={draft}
        threads={threads ?? []}
        timeZone={me.settings.timezone}
        language={thread?.language ?? me.settings.study_langs[0] ?? "en"}
        starters={chatStarters(me.settings.study_langs, { hardWord: hardest })}
        tutorName={tutorName}
        mascot={prefs.mascot}
        aiEnabled={aiProvider() !== null}
        displayName={me.profile.display_name}
        aside={
          <>
            {clone && <TutorCloneCard name={clone.name} />}
            <TutorTodayCard snapshot={snapshot} summary={summary} tutorName={tutorName} />
            <TutorTipsCard />
          </>
        }
      />
    </div>
  );
}
